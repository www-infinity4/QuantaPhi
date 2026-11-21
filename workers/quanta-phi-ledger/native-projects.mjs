// Private, bounded source repositories. No source execution, payments or GitHub.
const encoder=new TextEncoder();
const validId=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{8,80}$/.test(x);
const fail=(code,status=400)=>Object.assign(Error(code),{status});
async function hash(text){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export function normalizeFiles(files){
 if(!files||typeof files!=='object'||Array.isArray(files))throw fail('invalid_files');
 const entries=Object.entries(files).sort(([a],[b])=>a<b?-1:a>b?1:0);
 if(!entries.length||entries.length>32)throw fail('file_count_limit');
 let size=0;
 for(const [path,content] of entries){
  if(path.length>180||! /^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*$/.test(path)||path.split('/').some(p=>['.','..','.git'].includes(p)))throw fail('invalid_path');
  if(typeof content!=='string'||content.includes('\0'))throw fail('invalid_content');
  size+=encoder.encode(content).byteLength;
 }
 if(size>65536)throw fail('source_size_limit',413);
 return Object.fromEntries(entries);
}
async function schema(db){
 await db.batch([
  db.prepare('CREATE TABLE IF NOT EXISTS phi_native_projects(id TEXT PRIMARY KEY,owner TEXT NOT NULL,title TEXT NOT NULL,create_request TEXT NOT NULL,head TEXT,created_ms INTEGER NOT NULL,UNIQUE(owner,create_request))'),
  db.prepare('CREATE TABLE IF NOT EXISTS phi_native_revisions(id TEXT PRIMARY KEY,project TEXT NOT NULL,request_id TEXT NOT NULL,parent TEXT,input_hash TEXT NOT NULL,files_json TEXT NOT NULL,created_ms INTEGER NOT NULL,UNIQUE(project,request_id))'),
  db.prepare('CREATE INDEX IF NOT EXISTS phi_native_owner ON phi_native_projects(owner,created_ms DESC)')
 ]);
}
export async function handleNativeProjects(request,db,owner,headers={}){
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
 if(typeof owner!=='string'||!owner||owner.length>160)return json({ok:false,error:'verified_owner_required'},401);
 if(!db)return json({ok:false,error:'project_storage_unavailable'},503);
 const url=new URL(request.url),match=/^\/v1\/projects(?:\/([A-Za-z0-9_-]{8,80})(?:\/(revisions|export))?)?$/.exec(url.pathname);
 if(!match)return json({ok:false,error:'project_route_not_found'},404);
 try{
  let body;
  if(request.method==='POST'){
   // Bound bytes even when Content-Length is missing or inaccurate.
   const reader=request.body?.getReader();if(!reader)throw fail('invalid_json');
   const chunks=[];let size=0;
   for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>100000){await reader.cancel();throw fail('request_too_large',413);}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
   try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{throw fail('invalid_json');}
   if(!body||typeof body!=='object'||Array.isArray(body))throw fail('invalid_request');
  }
  await schema(db);
  if(!match[1]){
   if(request.method==='GET'){
    const result=await db.prepare('SELECT id,title,head,created_ms FROM phi_native_projects WHERE owner=? ORDER BY created_ms DESC,id LIMIT 100').bind(owner).all();
    return json({ok:true,projects:result.results||[],limit:100});
   }
   if(request.method!=='POST')throw fail('method_not_allowed',405);
   if(Object.keys(body).some(k=>!['title','requestId'].includes(k))||!validId(body.requestId)||typeof body.title!=='string'||!body.title.trim()||body.title.length>120)throw fail('invalid_project');
   const title=body.title.trim(),id='prj_'+crypto.randomUUID();
   await db.prepare('INSERT OR IGNORE INTO phi_native_projects(id,owner,title,create_request,head,created_ms) SELECT ?,?,?,?,NULL,? WHERE (SELECT COUNT(*) FROM phi_native_projects WHERE owner=?)<20').bind(id,owner,title,body.requestId,Date.now(),owner).run();
   const project=await db.prepare('SELECT id,title,head,created_ms FROM phi_native_projects WHERE owner=? AND create_request=?').bind(owner,body.requestId).first();
   if(!project)throw fail('project_limit',409);
   if(project.title!==title)throw fail('request_conflict',409);
   return json({ok:true,project});
  }
  const project=await db.prepare('SELECT id,title,head,created_ms FROM phi_native_projects WHERE owner=? AND id=?').bind(owner,match[1]).first();
  if(!project)throw fail('project_not_found',404);
  if(request.method==='POST'&&match[2]==='revisions'){
   if(Object.keys(body).some(k=>!['requestId','expectedHead','files'].includes(k))||!validId(body.requestId)||!(body.expectedHead===null||typeof body.expectedHead==='string'&&/^rev_[a-f0-9]{64}$/.test(body.expectedHead)))throw fail('invalid_revision');
   const files=normalizeFiles(body.files),raw=JSON.stringify(files),inputHash=await hash(JSON.stringify([body.expectedHead,files]));
   const id='rev_'+await hash(JSON.stringify([project.id,body.requestId,inputHash]));
   const existing=await db.prepare('SELECT id,input_hash FROM phi_native_revisions WHERE project=? AND request_id=?').bind(project.id,body.requestId).first();
   if(existing){if(existing.input_hash!==inputHash)throw fail('request_conflict',409);return json({ok:true,revisionId:existing.id,replayed:true});}
   // D1 batch is atomic. Both statements compare the expected head. A failed
   // compare never leaves an orphan revision or overwrites another writer.
   await db.batch([
    db.prepare('INSERT OR IGNORE INTO phi_native_revisions(id,project,request_id,parent,input_hash,files_json,created_ms) SELECT ?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM phi_native_projects WHERE owner=? AND id=? AND head IS ?) AND (SELECT COUNT(*) FROM phi_native_revisions WHERE project=?)<100').bind(id,project.id,body.requestId,body.expectedHead,inputHash,raw,Date.now(),owner,project.id,body.expectedHead,project.id),
    db.prepare('UPDATE phi_native_projects SET head=? WHERE owner=? AND id=? AND head IS ? AND EXISTS(SELECT 1 FROM phi_native_revisions WHERE id=? AND project=? AND input_hash=?)').bind(id,owner,project.id,body.expectedHead,id,project.id,inputHash)
   ]);
   const stored=await db.prepare('SELECT id,input_hash FROM phi_native_revisions WHERE project=? AND request_id=?').bind(project.id,body.requestId).first();
   if(!stored)throw fail('head_conflict_or_revision_limit',409);
   if(stored.input_hash!==inputHash)throw fail('request_conflict',409);
   return json({ok:true,revisionId:stored.id,replayed:false});
  }
  if(request.method!=='GET'||match[2]==='revisions')throw fail('method_not_allowed',405);
  const revisionId=url.searchParams.get('revision')||project.head;
  let revision=null;
  if(revisionId){
   const row=await db.prepare('SELECT id,parent,input_hash,files_json,created_ms FROM phi_native_revisions WHERE project=? AND id=?').bind(project.id,revisionId).first();
   if(!row)throw fail('revision_not_found',404);
   const files=JSON.parse(row.files_json);
   if(await hash(JSON.stringify([row.parent,files]))!==row.input_hash)throw fail('source_integrity_failed',503);
   revision={id:row.id,parent:row.parent,hash:row.input_hash,files,created_ms:row.created_ms};
  }
  return json({ok:true,format:'quantaphi-project-v1',project,revision,published:false});
 }catch(error){return json({ok:false,error:error.status?error.message:'project_storage_failed'},error.status||503);}
}
