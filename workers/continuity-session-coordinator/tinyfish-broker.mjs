// Server-only TinyFish proxy. TINYFISH_API_KEY lives ONLY on continuity-session-coordinator.
// No browser credentials, paid agent tasks, owner actions, or API keys leave this boundary.
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const MAX_IN=4096, MAX_OUT=180000;
export function authorized(request,env){
 const expected=env.TINYFISH_BRIDGE_TOKEN||'',given=request.headers.get('X-Tinyfish-Bridge-Token')||'';
 if(!/^[a-f0-9]{64}$/.test(expected)||given.length!==expected.length)return false;
 let diff=0;
 for(let i=0;i<expected.length;i++)diff|=expected.charCodeAt(i)^given.charCodeAt(i);
 return diff===0;
}
export function publicUrl(value){
 try {
  const url=new URL(value);
  const host=url.hostname.toLowerCase();
  if(url.protocol!=='https:'||url.username||url.password||url.port&&url.port!=='443'||
     host==='localhost'||host==='0.0.0.0'||host.endsWith('.local')||
     host.endsWith('.internal')||host.endsWith('.localhost')||host.endsWith('.test')||
     host.endsWith('.invalid')||host.endsWith('.onion')||host.indexOf('.')<0||
     /^[\d.]+$/.test(host)||host.includes(':')||host.includes('['))return null;
  url.hash='';return url.href;
 } catch {return null;}
}
export function validate(body){
 if(!body||typeof body!=='object'||Array.isArray(body)||
    Object.keys(body).some(k=>!['operation','query','url'].includes(k)))return null;
 if(body.operation==='search'&&typeof body.query==='string'){
  const query=body.query.trim();
  return query.length>=2&&query.length<=250?{operation:'search',query}:null;
 }
 if(body.operation==='fetch'&&typeof body.url==='string'){
  const url=publicUrl(body.url);
  return url?{operation:'fetch',url}:null;
 }
 return null;
}
async function bounded(upstream){
 if(Number(upstream.headers.get('content-length')||0)>MAX_OUT)throw Error('upstream_too_large');
 const reader=upstream.body?.getReader();
 if(!reader)throw Error('upstream_no_body');
 const chunks=[];let n=0;
 while(true){
  const {done,value}=await reader.read();if(done)break;
  n+=value.byteLength;
  if(n>MAX_OUT){await reader.cancel();throw Error('upstream_too_large');}
  chunks.push(value);
 }
 const bytes=new Uint8Array(n);let i=0;for(const chunk of chunks){bytes.set(chunk,i);i+=chunk.length;}
 return new TextDecoder('utf-8',{fatal:true}).decode(bytes);
}
export async function tinyfishBroker(request,env,fetcher=fetch){
 if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
 if(!authorized(request,env))return json({ok:false,error:'unauthorized'},401);
 if(!String(request.headers.get('content-type')||'').startsWith('application/json'))return json({ok:false,error:'content_type_required'},415);
 if(Number(request.headers.get('content-length')||0)>MAX_IN)return json({ok:false,error:'body_too_large'},413);
 if(!env.TINYFISH_API_KEY)return json({ok:false,error:'tinyfish_not_configured'},503);
 let body;
 try {const raw=await request.text();if(raw.length>MAX_IN)throw Error();body=validate(JSON.parse(raw));}
 catch {return json({ok:false,error:'invalid_request'},400);}
 if(!body)return json({ok:false,error:'invalid_operation_or_input'},400);
 const endpoint=body.operation==='search'
  ?'https://api.search.tinyfish.ai/?'+new URLSearchParams({query:body.query})
  :'https://api.fetch.tinyfish.ai/';
 try{
  const upstream=await fetcher(endpoint,{
   method:body.operation==='search'?'GET':'POST',
   headers:{'X-API-Key':env.TINYFISH_API_KEY,Accept:'application/json',...(body.operation==='fetch'?{'Content-Type':'application/json'}:{})},
   ...(body.operation==='fetch'?{body:JSON.stringify({urls:[body.url]})}:{}),
   redirect:'manual',signal:AbortSignal.timeout(18000)
  });
  if(!upstream.ok||upstream.status>=300)return json({ok:false,error:'tinyfish_upstream_failed',upstreamStatus:upstream.status},502);
  const text=await bounded(upstream);
  let data;try{data=JSON.parse(text);}catch{return json({ok:false,error:'tinyfish_invalid_result'},502);}
  return json({ok:true,provider:'TinyFish',operation:body.operation,sourceUrl:body.url||null,
   observedAt:new Date().toISOString(),data,receipt:{status:'complete',sourceReadVerified:true,
   cardAction:body.operation,paidAutomation:false,repositoryActionsVerified:false}});
 }catch{return json({ok:false,error:'tinyfish_request_failed'},502);}
}
