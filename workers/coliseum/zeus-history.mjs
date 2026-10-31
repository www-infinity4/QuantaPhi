/* Zeus private conversation history. D1 is authoritative; private R2 copies every
 * accepted thread and turn. Never shares data with public Coliseum rooms. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cleanText=(value,max)=>typeof value==='string'?value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').trim().slice(0,max):'';
const pageValue=value=>{const n=Number(value||0);return Number.isSafeInteger(n)&&n>=0&&n<=1000000?n:null;};
async function body(request){
 const raw=await request.text();
 if(raw.length>9000)throw Error('payload_too_large');
 try{
  const object=JSON.parse(raw);
  if(!object||Array.isArray(object)||typeof object!=='object')throw Error('invalid_json');
  return object;
 }catch(e){throw Error(e.message==='payload_too_large'?'payload_too_large':'invalid_json')}
}
async function backup(env,key,data){
 try{
  await env.ZEUS_HISTORY_R2.put(key,JSON.stringify(data),{httpMetadata:{contentType:'application/json'}});
  return true;
 }catch{return false}
}
const prefix=(member,id)=>'private-zeus/v1/'+member+'/'+id+'/';
export const hasZeusHistoryBindings=env=>Boolean(env?.COLISEUM_DB&&env?.ZEUS_HISTORY_R2&&typeof env.MEMBER_PEPPER==='string'&&env.MEMBER_PEPPER.length>=32);
export async function handleZeusHistory(req,env,member,respond){
 const url=new URL(req.url),path=url.pathname;
 const threadPath=/^\/v1\/private\/zeus\/threads\/([0-9a-f-]{36})(?:\/messages)?$/i.exec(path);
 const list=path==='/v1/private/zeus/threads';
 const messages=Boolean(threadPath&&path.endsWith('/messages'));
 const id=threadPath?.[1]||'';
 if(!list&&!threadPath)return respond({ok:false,error:'not_found'},404);
 if(threadPath&&!UUID.test(id))return respond({ok:false,error:'invalid_thread'},400);
 const db=env.COLISEUM_DB;
 try{
  if(list&&req.method==='GET'){
   const offset=pageValue(url.searchParams.get('offset'));
   if(offset===null)return respond({ok:false,error:'invalid_page'},400);
   const rows=await db.prepare('SELECT id,title,created_at,updated_at FROM zeus_threads WHERE member_id=? ORDER BY created_at DESC,id DESC LIMIT 101 OFFSET ?').bind(member,offset).all();
   const items=(rows.results||[]).slice(0,100);
   return respond({ok:true,items,next:(rows.results||[]).length>100?offset+100:null});
  }
  if(list&&req.method==='POST'){
   const b=await body(req);
   if(!UUID.test(b.id||''))return respond({ok:false,error:'invalid_thread'},400);
   const id=b.id.toLowerCase(),title=cleanText(b.title,100)||'New Zeus conversation';
   const now=new Date().toISOString();
   await db.prepare('INSERT OR IGNORE INTO zeus_threads (member_id,id,title,created_at,updated_at) VALUES (?,?,?,?,?)').bind(member,id,title,now,now).run();
   const row=await db.prepare('SELECT id,title,created_at,updated_at FROM zeus_threads WHERE member_id=? AND id=?').bind(member,id).first();
   const backedUp=await backup(env,prefix(member,id)+'thread.json',row);
   return respond({ok:true,thread:row,backedUp},201);
  }
  const exists=await db.prepare('SELECT id,title,created_at,updated_at FROM zeus_threads WHERE member_id=? AND id=?').bind(member,id).first();
  if(!exists)return respond({ok:false,error:'thread_not_found'},404);
  if(!messages&&req.method==='GET')return respond({ok:true,thread:exists});
  if(messages&&req.method==='GET'){
   const offset=pageValue(url.searchParams.get('offset'));
   if(offset===null)return respond({ok:false,error:'invalid_page'},400);
   const rows=await db.prepare('SELECT id,role,text,created_at FROM zeus_turns WHERE member_id=? AND thread_id=? ORDER BY created_at ASC,id ASC LIMIT 101 OFFSET ?').bind(member,id,offset).all();
   return respond({ok:true,thread:exists,items:(rows.results||[]).slice(0,100),next:(rows.results||[]).length>100?offset+100:null});
  }
  if(messages&&req.method==='POST'){
   const b=await body(req);
   const msgId=String(b.id||'').toLowerCase(),role=b.role;
   const text=cleanText(b.text,6000);
   if(!UUID.test(msgId)||!['user','assistant'].includes(role)||!text||text.length>6000)return respond({ok:false,error:'invalid_turn'},400);
   const now=new Date().toISOString();
   // The same UUID can be retried but never replaced by different content.
   const previous=await db.prepare('SELECT id,role,text,created_at FROM zeus_turns WHERE member_id=? AND thread_id=? AND id=?').bind(member,id,msgId).first();
   if(previous&&(previous.role!==role||previous.text!==text))return respond({ok:false,error:'turn_conflict'},409);
   if(!previous){
    await db.prepare('INSERT OR IGNORE INTO zeus_turns (member_id,thread_id,id,role,text,created_at) VALUES (?,?,?,?,?,?)').bind(member,id,msgId,role,text,now).run();
    await db.prepare('UPDATE zeus_threads SET updated_at=? WHERE member_id=? AND id=?').bind(now,member,id).run();
   }
   const saved=previous||await db.prepare('SELECT id,role,text,created_at FROM zeus_turns WHERE member_id=? AND thread_id=? AND id=?').bind(member,id,msgId).first();
   const backedUp=await backup(env,prefix(member,id)+'turns/'+msgId+'.json',saved);
   return respond({ok:true,saved:true,backedUp,id:msgId},201);
  }
  return respond({ok:false,error:'method_not_allowed'},405);
 }catch(e){
  if(['invalid_json','payload_too_large'].includes(e.message))return respond({ok:false,error:e.message},400);
  return respond({ok:false,error:'history_storage_unavailable'},503);
 }
}
