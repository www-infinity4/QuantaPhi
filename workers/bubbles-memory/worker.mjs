// Private Bubbles history. Every read/write validates the caller's Unified Wallet
// bearer against the wallet service. No browser-supplied owner/user IDs are trusted.
const ORIGINS=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const MAX_BODY=350_000;
function reply(origin,data,status=200){
 return new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8',
  'cache-control':'no-store','vary':'Origin',...(ORIGINS.has(origin)?{'access-control-allow-origin':origin}:{}),
  'access-control-allow-headers':'authorization, content-type','access-control-allow-methods':'GET, POST, DELETE, OPTIONS'}});
}
export function validEvent(e){
 return e&&typeof e==='object'&&/^[A-Za-z0-9_-]{8,80}$/.test(e.id||'')
  &&(e.role==='user'||e.role==='assistant'||e.role==='note')
  &&typeof e.text==='string'&&e.text.trim().length>0&&e.text.length<=6000
  &&Number.isSafeInteger(e.at)&&e.at>=946684800000&&e.at<=Date.now()+300000;
}
function corsError(origin){return reply(origin,{ok:false,error:'origin_not_allowed'},403)}
async function identify(req,env){
 const header=req.headers.get('Authorization')||'';
 if(!/^Bearer [A-Za-z0-9._~-]{16,2048}$/.test(header))return null;
 if(!env.BOT_WALLET?.fetch)return null;
 const result=await env.BOT_WALLET.fetch('https://wallet.internal/v1/wallet/state',{
  headers:{Authorization:header},signal:AbortSignal.timeout(9000)});
 if(!result.ok)return null;
 const state=await result.json();
 const id=state?.user?.id;
 return state?.ok&&((typeof id==='string'&&id.length>0&&id.length<160)||
  (typeof id==='number'&&Number.isSafeInteger(id)))?String(id):null;
}
export async function handle(req,env){
 const u=new URL(req.url),origin=req.headers.get('Origin')||'';
 if(u.pathname==='/health'&&req.method==='GET')return reply(origin,{ok:true,service:'bubbles-memory',authenticatedHistory:true});
 if(!ORIGINS.has(origin))return corsError(origin);
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{
  'access-control-allow-origin':origin,'access-control-allow-headers':'authorization, content-type',
  'access-control-allow-methods':'GET, POST, DELETE, OPTIONS','vary':'Origin'}});
 if(!env.MEMORY_DB)return reply(origin,{ok:false,error:'memory_database_unavailable'},503);
 let owner;
 try{owner=await identify(req,env)}catch{return reply(origin,{ok:false,error:'wallet_validation_unavailable'},503)}
 if(!owner)return reply(origin,{ok:false,error:'verified_wallet_required'},401);
 try{
  if(req.method==='GET'&&u.pathname==='/v1/profile'){
   // Non-secret stable scope for partitioning local IndexedDB by wallet.
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('bubbles:'+owner));
   const profile=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
   return reply(origin,{ok:true,profile});
  }
  if(req.method==='GET'&&u.pathname==='/v1/history'){
   const after=Math.max(0,Number.parseInt(u.searchParams.get('after')||'0',10)||0);
   const limit=Math.min(100,Math.max(1,Number.parseInt(u.searchParams.get('limit')||'100',10)||100));
   const result=await env.MEMORY_DB.prepare(
    'SELECT seq,id,role,text,at FROM bubbles_messages WHERE owner=? AND seq>? ORDER BY seq ASC LIMIT ?'
   ).bind(owner,after,limit).all();
   return reply(origin,{ok:true,events:result.results||[],next:(result.results||[]).at(-1)?.seq||after});
  }
  if(req.method==='GET'&&u.pathname==='/v1/search'){
   const q=(u.searchParams.get('q')||'').trim().slice(0,100);
   if(!q)return reply(origin,{ok:true,events:[]});
   // Parameterized literal substring search; no wildcard injection or other users' records.
   const pattern='%'+q.replace(/[\\%_]/g,m=>'\\'+m)+'%';
   const result=await env.MEMORY_DB.prepare(
    "SELECT seq,id,role,text,at FROM bubbles_messages WHERE owner=? AND text LIKE ? ESCAPE '\\' ORDER BY seq DESC LIMIT 24"
   ).bind(owner,pattern).all();
   return reply(origin,{ok:true,events:result.results||[]});
  }
  if(req.method==='POST'&&u.pathname==='/v1/events'){
   if(Number(req.headers.get('content-length')||0)>MAX_BODY)return reply(origin,{ok:false,error:'too_large'},413);
   let body;try{body=await req.json()}catch{return reply(origin,{ok:false,error:'invalid_json'},400)}
   if(!body||!Array.isArray(body.events)||!body.events.length||body.events.length>40||
      !body.events.every(validEvent))return reply(origin,{ok:false,error:'invalid_events'},400);
   const commands=body.events.map(e=>env.MEMORY_DB.prepare(
    'INSERT OR IGNORE INTO bubbles_messages(owner,id,role,text,at) VALUES(?,?,?,?,?)'
   ).bind(owner,e.id,e.role,e.text,e.at));
   const results=await env.MEMORY_DB.batch(commands);
   return reply(origin,{ok:true,accepted:results.reduce((sum,r)=>sum+(r.meta?.changes||0),0)});
  }
  if(req.method==='DELETE'&&u.pathname==='/v1/history'){
   const r=await env.MEMORY_DB.prepare('DELETE FROM bubbles_messages WHERE owner=?').bind(owner).run();
   return reply(origin,{ok:true,deleted:r.meta?.changes||0});
  }
  return reply(origin,{ok:false,error:'not_found'},404);
 }catch{return reply(origin,{ok:false,error:'memory_operation_failed'},503)}
}
export default {fetch:handle};
