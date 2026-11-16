import {CARD_SITES,planCardBrowserAction,cardActionGoal,cardCheckoutHandoff} from './quick-card-browser-policy.mjs';

// This handler lives in the private owner Durable Object. Public cards never
// inherit a shared TinyFish browser profile; future user profiles require a
// separate verified consent + per-user token and cannot use these endpoints.
const TINYFISH='https://agent.tinyfish.ai';
const uuid=v=>/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v||'');
const fail=(error,status=400)=>({httpStatus:status,result:{ok:false,error,executed:false}});
const success=(obj,status=200)=>({httpStatus:status,result:{ok:true,...obj}});
const directConfigured=env=>typeof env.TINYFISH_API_KEY==='string'&&env.TINYFISH_API_KEY.length>12;
const brokerConfigured=env=>typeof env.TINYFISH_BROKER?.fetch==='function'&&
 typeof env.TINYFISH_BRIDGE_TOKEN==='string'&&/^[a-f0-9]{64}$/.test(env.TINYFISH_BRIDGE_TOKEN);
const configured=env=>directConfigured(env)||brokerConfigured(env);
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
 const r=await fetcher(TINYFISH+path,{method:body?'POST':'GET',
  headers:{'X-API-Key':env.TINYFISH_API_KEY,...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal:AbortSignal.timeout(20000)});
 if(!r.ok){await r.body?.cancel();throw Error('tinyfish_http_'+r.status)}
 return readBoundedJson(r);
}
// The existing Continuity coordinator has the TinyFish read-only search/fetch
// broker and holds the API key. Brain has a private service binding and a bridge
// token; neither credential ever crosses to card JavaScript or GitHub.
async function brokerRead(env,plan){
 const operation=plan.kind==='durable'||plan.action==='inspect'?'fetch':'search';
 const query=plan.query+' site:'+plan.expectedHost;
 const body=operation==='fetch'?{operation,url:plan.url}:{operation,query:query.trim()};
 const response=await env.TINYFISH_BROKER.fetch('https://continuity.internal/internal/tinyfish',{
  method:'POST',headers:{'Content-Type':'application/json','X-Tinyfish-Bridge-Token':env.TINYFISH_BRIDGE_TOKEN},
  body:JSON.stringify(body),signal:AbortSignal.timeout(23000)
 });
 if(!response.ok){await response.body?.cancel();throw Error('tinyfish_broker_http_'+response.status)}
 const result=await readBoundedJson(response,180000);
 if(result?.ok!==true||result.provider!=='TinyFish'||result.operation!==operation||
    result.receipt?.sourceReadVerified!==true)throw Error('tinyfish_broker_receipt_invalid');
 return {result,operation};
}
export function reportForBroker(receipt,plan){
 // The broker's public web data is untrusted text. Accept only absolute links
 // on the exact registered card host or one of its approved action hosts.
 const source=receipt?.data&&typeof receipt.data==='object'?receipt.data:{};
 const records=Array.isArray(source.results)?source.results:
  Array.isArray(source.items)?source.items:[];
 const expected=new Set([CARD_SITES[plan.cardId].host,
  ...(CARD_SITES[plan.cardId].mappings||[]).map(x=>new URL(x.url).hostname)]);
 const items=[],seen=new Set();
 const add=(value,title='',note='',price='')=>{
  const raw=typeof value==='string'?value:value?.url||value?.href||'';
  let url;
  try{url=new URL(String(raw));
   if(url.protocol!=='https:'||url.username||url.password||url.port||
      url.href.length>1400||!expected.has(url.hostname)||seen.has(url.href))return;
  }catch{return}
  seen.add(url.href);items.push({name:String(title||url.hostname).slice(0,140),
   note:String(note||'Public source link returned by TinyFish.').slice(0,300),
   price:price?String(price).slice(0,65):null,url:url.href});
 };
 for(const entry of records.slice(0,8)){
  if(items.length>=5)break;
  if(!entry||typeof entry!=='object')continue;
  add(entry.url||entry.link||entry.source_url,entry.title||entry.name,entry.snippet||entry.description,entry.price);
  for(const link of (Array.isArray(entry.links)?entry.links:[]).slice(0,5)){
   if(items.length>=5)break;
   add(link,entry.title||entry.name,'Link observed in the public source');
  }
 }
 for(const link of (Array.isArray(source.links)?source.links:[]).slice(0,12)){
  if(items.length>=5)break;add(link,'Official source link','Link observed in the public source');
 }
 // Fetch results often contain the inspected URL and a text-only extract.
 // Only count the URL when the provider actually returned that page.
 const excerpt=records.map(x=>typeof x?.text==='string'?x.text:
  typeof x?.snippet==='string'?x.snippet:'').join(' ').replace(/\s+/g,' ').slice(0,600);
 return {summary:(items.length?'TinyFish public source read returned '+items.length+' same-site link'+(items.length===1?'':'s')+'. ':
   'TinyFish returned no same-site result links. ')+excerpt,
  observedAt:Number.isFinite(Date.parse(receipt?.observedAt))?new Date(receipt.observedAt).toISOString():'',
  blocker:'',items,verifiedSameSiteLinks:items.length,providerResultUnverified:true,
  mode:'source_read',notBrowserNavigation:true};
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
  return success({ownerOnly:true,provider:'TinyFish',configured:configured(env),
   profileConfigured:profileConfigured(env),brokerSourceReads:brokerConfigured(env),
   browserNavigationConfigured:directConfigured(env)&&profileConfigured(env),
   publicBrandReads:true,
   supported:Object.entries(CARD_SITES).map(([id,info])=>({id,name:info.name,kind:info.kind,
    actions:info.kind==='durable'?info.mappings.map(x=>x.id):[]})),
   note:'Source reads use the private coordinator TinyFish broker when available. This is not proof of authenticated navigation, provider login, or checkout.'});
 if(body.action==='checkout'){
  return success({handoff:cardCheckoutHandoff(body.cardId,body.productUrl),
   executed:false,output:'Merchant-hosted product/checkout link prepared. Nothing was purchased.'});
 }
 if(body.action==='start'){
  const plan=planCardBrowserAction({cardId:body.cardId,action:body.kind,query:body.query});
  if(!configured(env))return fail('tinyfish_backend_not_configured',503);
  const useBroker=brokerConfigured(env)&&(!directConfigured(env)||!profileConfigured(env)||plan.kind==='durable');
  if(!useBroker&&plan.useProfile&&!profileConfigured(env))return fail('tinyfish_profile_not_configured',503);
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
   if(useBroker){
    const observed=await brokerRead(env,plan);
    job.report=reportForBroker(observed.result,plan);
    job.state=job.report.verifiedSameSiteLinks?'completed_source_read':'unverified_source_read';
    await storage.put(k(job.jobId),job);
    return success({job:summary(job),sourceRead:true,
     output:'Read-only TinyFish source result stored. This did not click, sign in, buy, or automate the site.'});
   }
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
