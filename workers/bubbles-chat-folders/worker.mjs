// Dedicated owner-authenticated chat folders. This leaves Robot Brain's
// existing ticket, wallet, memory and model Worker untouched.
const ORIGINS=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const TOKEN=/^Bearer r[bd]_[a-f0-9]{64}$/;
const SID=/^(?:chat_[a-f0-9]{32}|legacy-history)$/;
function reply(origin,obj,status=200){
 return Response.json(obj,{status,headers:{'Cache-Control':'no-store','Vary':'Origin',
 'Access-Control-Allow-Origin':origin,
 'Access-Control-Allow-Headers':'Authorization, Content-Type',
 'Access-Control-Allow-Methods':'POST, OPTIONS'}});
}
async function verify(request,env){
 const authorization=request.headers.get('Authorization')||'';
 if(!TOKEN.test(authorization)||!env.BRAIN?.fetch)return false;
 try{
  const response=await env.BRAIN.fetch('https://brain.internal/health',{headers:{Authorization:authorization},signal:AbortSignal.timeout(8000)});
  return response.ok;
 }catch{return false}
}
const tables=[
 'CREATE TABLE IF NOT EXISTS bubbles_sessions(owner TEXT NOT NULL,session_id TEXT NOT NULL,title TEXT NOT NULL,created INTEGER NOT NULL,updated INTEGER NOT NULL,PRIMARY KEY(owner,session_id))',
 'CREATE INDEX IF NOT EXISTS bubbles_sessions_recent ON bubbles_sessions(owner,updated DESC)',
 'CREATE TABLE IF NOT EXISTS bubbles_session_messages(owner TEXT NOT NULL,session_id TEXT NOT NULL,message_id TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(owner,session_id,message_id))',
 'CREATE INDEX IF NOT EXISTS bubbles_session_messages_recent ON bubbles_session_messages(owner,session_id,at DESC)',
 'CREATE TABLE IF NOT EXISTS bubbles_session_sources(owner TEXT NOT NULL,session_id TEXT NOT NULL,source TEXT NOT NULL,PRIMARY KEY(owner,session_id))'
];
async function sessionHandler(env,body){
 for(const sql of tables)await env.WORK_DB.prepare(sql).run();
 // The Brain verifier authorizes this Worker for the single owner. Refuse
 // ambiguous/multi-owner archives, rather than choosing an arbitrary account.
 const ownership=await env.WORK_DB.prepare('SELECT COUNT(DISTINCT owner) AS count,MIN(owner) AS owner FROM bubbles_messages').first();
 if(Number(ownership?.count)!==1||typeof ownership.owner!=='string')throw Error('owner_archive_not_unique');
 const owner=ownership.owner,now=Date.now();
 const sessionId=typeof body.sessionId==='string'?body.sessionId:'';
 const offset=Number.isSafeInteger(body.offset)&&body.offset>=0&&body.offset<=1000000?body.offset:0;
 const batchLimit=100;
 if(body.mode==='sessions-list'){
  const old=await env.WORK_DB.prepare('SELECT COUNT(*) AS count,MIN(at) AS first,MAX(at) AS last FROM bubbles_messages m WHERE m.owner=? AND NOT EXISTS(SELECT 1 FROM bubbles_session_messages sm WHERE sm.owner=m.owner AND sm.message_id=m.id)').bind(owner).first();
  if(old?.count){
   await env.WORK_DB.prepare('INSERT OR IGNORE INTO bubbles_sessions(owner,session_id,title,created,updated) VALUES (?,?,?,?,?)')
    .bind(owner,'legacy-history','Earlier Bubbles chats',old.first||now,old.last||now).run();
   await env.WORK_DB.prepare("INSERT OR IGNORE INTO bubbles_session_messages(owner,session_id,message_id,at) SELECT owner,'legacy-history',id,at FROM bubbles_messages m WHERE m.owner=? AND NOT EXISTS(SELECT 1 FROM bubbles_session_messages sm WHERE sm.owner=m.owner AND sm.message_id=m.id)").bind(owner).run();
  }
  const list=await env.WORK_DB.prepare("SELECT s.session_id AS id,s.title,s.created,s.updated,COALESCE(src.source,'bubbles') AS source FROM bubbles_sessions s LEFT JOIN bubbles_session_sources src ON src.owner=s.owner AND src.session_id=s.session_id WHERE s.owner=? ORDER BY s.updated DESC,s.session_id DESC LIMIT ? OFFSET ?").bind(owner,batchLimit,offset).all();
  const sessions=list.results||[];
  return {ok:true,sessions,nextOffset:sessions.length===batchLimit?offset+sessions.length:null};
 }
 if(!SID.test(sessionId))return {ok:false,error:'invalid_chat_selection'};
 if(body.mode==='sessions-create'){
  const title=typeof body.title==='string'?body.title.slice(0,80).trim():'New conversation';
  await env.WORK_DB.prepare('INSERT OR IGNORE INTO bubbles_sessions(owner,session_id,title,created,updated) VALUES (?,?,?,?,?)')
    .bind(owner,sessionId,title||'New conversation',now,now).run();
  if(body.source==='chatgpt')await env.WORK_DB.prepare("INSERT INTO bubbles_session_sources(owner,session_id,source) VALUES (?,?,'chatgpt') ON CONFLICT(owner,session_id) DO UPDATE SET source='chatgpt'").bind(owner,sessionId).run();
  return {ok:true,sessionId};
 }
 if(body.mode==='sessions-get'){
  const session=await env.WORK_DB.prepare("SELECT s.session_id AS id,s.title,s.created,s.updated,COALESCE(src.source,'bubbles') AS source FROM bubbles_sessions s LEFT JOIN bubbles_session_sources src ON src.owner=s.owner AND src.session_id=s.session_id WHERE s.owner=? AND s.session_id=?").bind(owner,sessionId).first();
  if(!session)return {ok:false,error:'conversation_not_found'};
  const rows=await env.WORK_DB.prepare('SELECT m.id,m.role,m.text,m.at FROM bubbles_session_messages sm JOIN bubbles_messages m ON m.owner=sm.owner AND m.id=sm.message_id WHERE sm.owner=? AND sm.session_id=? ORDER BY sm.at ASC,m.id ASC LIMIT ? OFFSET ?').bind(owner,sessionId,batchLimit,offset).all();
  const count=await env.WORK_DB.prepare('SELECT COUNT(*) AS total FROM bubbles_session_messages WHERE owner=? AND session_id=?').bind(owner,sessionId).first();
  const messages=(rows.results||[]).map(row=>({...row,sessionId}));
  return {ok:true,session,messages,total:Number(count?.total)||0,nextOffset:offset+messages.length<(Number(count?.total)||0)?offset+messages.length:null};
 }
 if(body.mode==='sessions-save'){
  if(sessionId==='legacy-history')return {ok:false,error:'legacy_read_only'};
  const messages=body.messages;
  if(!Array.isArray(messages)||messages.length>10)return {ok:false,error:'invalid_batch'};
  await env.WORK_DB.prepare('INSERT OR IGNORE INTO bubbles_sessions(owner,session_id,title,created,updated) VALUES (?,?,?,?,?)')
    .bind(owner,sessionId,'New conversation',now,now).run();
  let saved=0;
  for(const m of messages){
   if(!/^[a-zA-Z0-9_-]{8,100}$/.test(m?.id||'')||!['user','assistant'].includes(m.role)||
    typeof m.text!=='string'||m.text.length>6000||!m.text.trim())return {ok:false,error:'invalid_message'};
   const at=Number.isSafeInteger(m.at)&&m.at>0&&m.at<=now+60000?m.at:now;
   await env.WORK_DB.prepare('INSERT OR IGNORE INTO bubbles_messages(owner,id,role,text,at) VALUES (?,?,?,?,?)').bind(owner,m.id,m.role,m.text,at).run();
   await env.WORK_DB.prepare('INSERT OR IGNORE INTO bubbles_session_messages(owner,session_id,message_id,at) VALUES (?,?,?,?)').bind(owner,sessionId,m.id,at).run();
   if(m.role==='user')await env.WORK_DB.prepare("UPDATE bubbles_sessions SET title=? WHERE owner=? AND session_id=? AND title='New conversation'").bind(m.text.replace(/\s+/g,' ').slice(0,65),owner,sessionId).run();
   await env.WORK_DB.prepare('UPDATE bubbles_sessions SET updated=MAX(updated,?) WHERE owner=? AND session_id=?').bind(at,owner,sessionId).run();
   saved++;
  }
  return {ok:true,saved};
 }
 return {ok:false,error:'unsupported_operation'};
}
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path==='/health')return Response.json({ok:true,service:'bubbles-chat-folders',brainBound:!!env.BRAIN,dbBound:!!env.WORK_DB},{headers:{'Cache-Control':'no-store'}});
  const origin=request.headers.get('Origin')||'';
  if(!ORIGINS.has(origin))return new Response('Forbidden',{status:403});
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Cache-Control':'no-store','Vary':'Origin'}});
  if(path!=='/v1/folders'||request.method!=='POST')return reply(origin,{ok:false,error:'not_found'},404);
  if(!(await verify(request,env)))return reply(origin,{ok:false,error:'owner_verification_required'},403);
  try{
   const raw=await request.text();
   if(raw.length>75000)return reply(origin,{ok:false,error:'request_too_large'},413);
   const body=JSON.parse(raw||'{}');
   const output=await sessionHandler(env,body);
   return reply(origin,output,output.ok?200:400);
  }catch{return reply(origin,{ok:false,error:'folder_operation_unavailable'},503);}
 }
};
