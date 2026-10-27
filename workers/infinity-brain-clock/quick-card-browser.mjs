import {CARD_SITES,planCardBrowserAction,cardActionGoal,cardCheckoutHandoff} from './quick-card-browser-policy.mjs';

// This handler lives in the private owner Durable Object. Public cards never
// inherit a shared TinyFish browser profile; future user profiles require a
// separate verified consent + per-user token and cannot use these endpoints.
const TINYFISH='https://agent.tinyfish.ai';
const uuid=v=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v||'');
const fail=(error,status=400)=>({httpStatus:status,result:{ok:false,error,executed:false}});
const success=(obj,status=200)=>({httpStatus:status,result:{ok:true,...obj}});
const brokerReady=env=>Boolean(env.TINYFISH_BROKER&&typeof env.TINYFISH_BROKER.fetch==='function'&&typeof env.TINYFISH_BRIDGE_TOKEN==='string'&&env.TINYFISH_BRIDGE_TOKEN.length>12);
const configured=env=>brokerReady(env)||(typeof env.TINYFISH_API_KEY==='string'&&env.TINYFISH_API_KEY.length>12);
const profileConfigured=env=>typeof env.TINYFISH_PROFILE_ID==='string'&&/^prof_[a-zA-Z0-9]{8,80}$/.test(env.TINYFISH_PROFILE_ID);
const summary=job=>({jobId:job.jobId,cardId:job.cardId,action:job.action,state:job.state,
 createdAt:job.createdAt,requestId:job.requestId,
 ...(job.runId?{runId:job.runId}:{}),...(job.report?{report:job.report}:{}),
 ...(job.error?{error:job.error}:{})});
export function validateQuickCardBrowser(body){
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('invalid_quick_card_request');
 const keys={capabilities:['action'],start:['action','cardId','kind','query','requestId'],
  status:['action','jobId'],checkout:['action','cardId','productUrl']};
 if(!Object.hasOwn(keys,body.action) || Object.keys(body).some(k=>!keys[body.action].includes(k)))throw Error('unsupported_action');
 if(body.action==='start'){
  if(!uuid(body.requestId))throw Error('request_id_required');
  planCardBrowserAction({cardId:body.cardId,action:body.kind,query:body.query});
 }
 if(body.action==='status'&&!uuid(body.jobId))throw Error('invalid_job_id');
 if(body.action==='checkout')cardCheckoutHandoff(body.cardId,body.productUrl);
 return body;
}
export async function readBoundedJson(response,maxBytes=50000){
 if(!response.body)throw Error('browser_result_empty');
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;
  if(size>maxBytes){await reader.cancel();throw Error('browser_result_oversize')}chunks.push(value);
 }}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
 return JSON.parse(new TextDecoder().decode(bytes));
}
async function tinyfish(env,fetcher,path,body){
 // The production TinyFish API key lives on continuity-session-coordinator.
 // The Brain uses its service binding with a shared private bridge secret.
 // A direct API key is supported only for legacy isolated tests/deployments.
 const broker=brokerReady(env);
 const endpoint=broker?'https://continuity-session-coordinator.internal/internal/tinyfish'+path:TINYFISH+path;
 const headers=broker?{'Authorization':'Bearer '+env.TINYFISH_BRIDGE_TOKEN}: {'X-API-Key':env.TINYFISH_API_KEY};
 if(body)headers['Content-Type']='application/json';
 const options={method:body?'POST':'GET',headers,
  ...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:AbortSignal.timeout(20000)};
 const r=await (broker?env.TINYFISH_BROKER.fetch(endpoint,options):fetcher(endpoint,options));
 if(!r.ok){await r.body?.cancel();throw Error('tinyfish_http_'+r.status)}
 return readBoundedJson(r);
}
const k=id=>'quick-card-browser:job:'+id;
function reportFor(raw,cardId){
 // Extract a strictly bounded data summary, not arbitrary provider instructions.
 const source=typeof raw==='string'?raw:JSON.stringify(raw??'');
 let parsed;
 try{parsed=JSON.parse(source)}catch{parsed={summary:source,items:[]}}
 if(parsed&&typeof parsed.result==='string'){try{parsed=JSON.parse(parsed.result)}catch{parsed={summary:parsed.result}}}
 const card=CARD_SITES[cardId];
 const expected=new Set([card.host,...(card.mappings||[]).map(x=>new URL(x.url).hostname)]);
 const links=Array.isArray(parsed?.items)?parsed.items:[];
 const items=links.slice(0,5).map(item=>{
  if(!item||typeof item!=='object'||Array.isArray(item))return null;
  const name=String(item.name??'').slice(0,140),price=String(item.price??'').slice(0,65),note=String(item.note??'').slice(0,300);
  let url='';
  try{
   const u=new URL(String(item.url||''));
   if(u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.href.length<=1400&&expected.has(u.hostname))url=u.href;
  }catch{}
  return {name,price:price||null,note,url};
 }).filter(item=>item&&(item.name||item.url));
 return {summary:String(parsed?.summary||'Browser run ended; see observed source results.').slice(0,2200),
  observedAt:Number.isFinite(Date.parse(parsed?.observedAt))?new Date(parsed.observedAt).toISOString():'',blocker:String(parsed?.blocker||'').slice(0,180),
  items,verifiedSameSiteLinks:items.filter(item=>item.url).length,providerResultUnverified:true};
}
export async function handleQuickCardBrowser(storage,env,body,fetcher=fetch,now=Date.now()){
 try{validateQuickCardBrowser(body)}catch(e){return fail(e.message)}
 if(body.action==='capabilities')
  return success({ownerOnly:true,provider:'TinyFish Web Agent',configured:configured(env),
   profileConfigured:profileConfigured(env),publicBrandReads:true,
   supported:Object.entries(CARD_SITES).map(([id,info])=>({id,name:info.name,kind:info.kind,
    actions:info.kind==='durable'?info.mappings.map(x=>x.id):[]})),
   note:'Configured means backend secret and profile settings exist, not proof of browser login or successful navigation.'});
 if(body.action==='checkout'){
  return success({handoff:cardCheckoutHandoff(body.cardId,body.productUrl),
   executed:false,output:'Merchant-hosted product/checkout link prepared. Nothing was purchased.'});
 }
 if(body.action==='start'){
  const plan=planCardBrowserAction({cardId:body.cardId,action:body.kind,query:body.query});
  if(!configured(env))return fail('tinyfish_backend_not_configured',503);
  if(plan.useProfile&&!profileConfigured(env))return fail('tinyfish_profile_not_configured',503);
  const previousId=await storage.get('quick-card-browser:request:'+body.requestId);
  if(previousId){
   const previous=await storage.get(k(previousId));
   if(previous){
    if(previous.cardId!==plan.cardId||previous.action!==plan.action||previous.query!==plan.query)return fail('request_id_conflict',409);
    return success({job:summary(previous),output:'Duplicate click reused the existing job, not a second paid run.'});
   }
   return fail('request_receipt_missing_no_retry',409);
  }
  const day=new Date(now).toISOString().slice(0,10),budgetKey='quick-card-browser:count:'+day;
  const count=Number(await storage.get(budgetKey)||0);
  if(count>=16)return fail('owner_daily_browser_read_limit_reached',429);
  await storage.put(budgetKey,count+1);
  const job={jobId:crypto.randomUUID(),requestId:body.requestId,cardId:plan.cardId,action:plan.action,
   query:plan.query,state:'dispatch_uncertain',createdAt:new Date(now).toISOString()};
  await storage.put(k(job.jobId),job);
  await storage.put('quick-card-browser:request:'+body.requestId,job.jobId);
  try{
   const run=await tinyfish(env,fetcher,'/v1/automation/run-async',{url:plan.url,goal:cardActionGoal(plan),
    ...(plan.useProfile?{use_profile:true,profile_id:env.TINYFISH_PROFILE_ID}:{}),
    browser_profile:'lite',agent_config:{max_duration_seconds:120}});
   const runId=run.run_id||run.runId;
   if(!uuid(runId))throw Error('missing_provider_run_id');
   job.runId=runId;job.state='working';await storage.put(k(job.jobId),job);
   return success({job:summary(job),output:'Read-only Quick Card browser action submitted; verify result using status.'},202);
  }catch(e){
   job.error=String(e.message||e).slice(0,130);
   await storage.put(k(job.jobId),job);
   return {httpStatus:502,result:{ok:false,error:'dispatch_uncertain_check_provider_before_retry',executed:false,job:summary(job)}};
  }
 }
 const job=await storage.get(k(body.jobId));
 if(!job)return fail('job_not_found',404);
 if(job.state!=='working'||!job.runId)return success({job:summary(job)});
 if(!configured(env))return fail('tinyfish_backend_not_configured',503);
 try{
  const run=await tinyfish(env,fetcher,'/v1/runs/'+encodeURIComponent(job.runId));
  const state=String(run.status||'').toUpperCase();
 if(['FAILED','CANCELLED','TIMED_OUT'].includes(state)){job.state='failed';job.error=String(run.error?.message||run.error||state).slice(0,140)}
  else if(state==='COMPLETED'){
   job.report=reportFor(run.result,job.cardId);
   job.state=job.report.blocker?'blocked_browser_read':job.report.verifiedSameSiteLinks?'completed_browser_read':'unverified_browser_result';
  }
  await storage.put(k(job.jobId),job);
  return success({job:summary(job),providerStatus:state});
 }catch{return fail('provider_status_unavailable',503)}
}
