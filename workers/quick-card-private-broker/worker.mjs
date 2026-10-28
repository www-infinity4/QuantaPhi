import {CARD_SITES,planCardBrowserAction,cardActionGoal} from '../infinity-brain-clock/quick-card-browser-policy.mjs';

// Private service-binding transport only. Never attach a public route or workers.dev URL.
// Brain must authenticate the owner and reserve the request ID before calling this worker.
const PROVIDER='https://agent.tinyfish.ai';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const encoder=new TextEncoder();
const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function equalSecret(left,right){
 if(typeof left!=='string'||typeof right!=='string'||!left||!right)return false;
 const a=encoder.encode(left),b=encoder.encode(right);
 let mismatch=a.length^b.length;
 for(let i=0;i<Math.max(a.length,b.length);i++)mismatch|=(a[i]||0)^(b[i]||0);
 return mismatch===0;
}
async function boundedJson(response,max=30000){
 if(!response.body)throw Error('empty_body');
 const reader=response.body.getReader(),chunks=[];let length=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   length+=value.byteLength;
   if(length>max){await reader.cancel();throw Error('oversize_body');}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(length);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
// A stateless, signed correlation receipt binds a provider run to the exact
// approved card and owner-Durable-Object request ID. This is not a user login.
async function runProof(env,cardId,requestId,runId){
 const key=await crypto.subtle.importKey('raw',encoder.encode(env.TINYFISH_BRIDGE_TOKEN),
  {name:'HMAC',hash:'SHA-256'},false,['sign']);
 const message=encoder.encode(JSON.stringify([cardId,requestId,runId]));
 const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,message));
 return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
}
export function validatePrivateBrokerRequest(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid_body');
 if(body.action==='start'){
  if(Object.keys(body).some(k=>!['action','cardId','kind','query','requestId'].includes(k)))throw Error('extra_fields');
  if(!UUID.test(body.requestId||''))throw Error('invalid_request_id');
  const plan=planCardBrowserAction({cardId:body.cardId,action:body.kind,query:body.query});
  if(plan.useProfile||plan.kind!=='durable')throw Error('account_profile_not_authorized');
  return {action:'start',plan,requestId:body.requestId};
 }
 if(body.action==='status'){
  if(Object.keys(body).some(k=>!['action','cardId','runId','requestId','receiptProof'].includes(k)))throw Error('extra_fields');
  if(!UUID.test(body.runId||''))throw Error('invalid_run_id');
  if(!UUID.test(body.requestId||''))throw Error('invalid_request_id');
  if(typeof body.receiptProof!=='string'||!/^[a-f0-9]{64}$/i.test(body.receiptProof))throw Error('invalid_receipt_proof');
  const card=typeof body.cardId==='string'&&Object.hasOwn(CARD_SITES,body.cardId)?CARD_SITES[body.cardId]:null;
  if(!card||card.kind!=='durable'||!card.mappings.length)throw Error('account_profile_not_authorized');
  return {action:'status',cardId:body.cardId,requestId:body.requestId,runId:body.runId,receiptProof:body.receiptProof};
 }
 throw Error('unsupported_action');
}
export async function handlePrivateBroker(request,env,fetcher=fetch){
 const url=new URL(request.url);
 if(url.pathname!=='/internal/quick-card-browser')return reply({ok:false,error:'not_found'},404);
 if(request.method!=='POST')return reply({ok:false,error:'method_not_allowed'},405);
 if(typeof env?.TINYFISH_API_KEY!=='string'||env.TINYFISH_API_KEY.length<13||
    typeof env?.TINYFISH_BRIDGE_TOKEN!=='string'||env.TINYFISH_BRIDGE_TOKEN.length<20)
  return reply({ok:false,error:'broker_not_provisioned'},503);
 if(!equalSecret(request.headers.get('X-QuantaPhi-Broker-Token'),env.TINYFISH_BRIDGE_TOKEN))
  return reply({ok:false,error:'forbidden'},403);
 if(!/^application\/json(?:;|$)/i.test(request.headers.get('Content-Type')||''))
  return reply({ok:false,error:'json_required'},415);
 if(Number(request.headers.get('Content-Length')||0)>2300)
  return reply({ok:false,error:'request_too_large'},413);
 let command;
 try{command=validatePrivateBrokerRequest(await boundedJson(request,2300));}
 catch{return reply({ok:false,error:'invalid_or_unapproved_request'},400);}
 const start=command.action==='start';
 if(!start){
  const expected=await runProof(env,command.cardId,command.requestId,command.runId);
  if(!equalSecret(command.receiptProof,expected))return reply({ok:false,error:'run_receipt_not_authorized'},403);
 }
 const endpoint=start?'/v1/automation/run-async':'/v1/runs/'+encodeURIComponent(command.runId);
 const payload=start?{url:command.plan.url,goal:cardActionGoal(command.plan),
  browser_profile:'lite',agent_config:{max_duration_seconds:120}}:null;
 try{
  const upstream=await fetcher(PROVIDER+endpoint,{method:start?'POST':'GET',
   headers:{'X-API-Key':env.TINYFISH_API_KEY,...(start?{'Content-Type':'application/json'}:{})},
   ...(start?{body:JSON.stringify(payload)}:{}),redirect:'manual',signal:AbortSignal.timeout(20000)});
  if(!upstream.ok){await upstream.body?.cancel();return reply({ok:false,error:'provider_unavailable'},502);}
  const data=await boundedJson(upstream,30000);
  if(start){
   const runId=data?.run_id||data?.runId;
   if(!UUID.test(runId||''))return reply({ok:false,error:'provider_receipt_invalid'},502);
   return reply({ok:true,runId,receiptProof:await runProof(env,command.plan.cardId,command.requestId,runId)},202);
  }
  return reply({ok:true,status:String(data?.status||'UNKNOWN').slice(0,30),result:data?.result??null,
   error:data?.error?{message:String(data.error?.message||data.error).slice(0,140)}:null});
 }catch{return reply({ok:false,error:'provider_transport_uncertain'},502);}
}
export default {fetch:handlePrivateBroker};
