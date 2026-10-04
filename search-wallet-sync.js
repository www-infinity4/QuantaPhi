(function(global){
'use strict';
const KEY='quantaPhi:pendingSearchCommits:v2',LEGACY='quantaPhi:pendingInfinityCredits:v1',API='https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/search';
const memory=new Map(),BACKUP='quantaPhi:pendingSearchCommits:backup:v1';
const parse=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}};
const read=()=>{const merged=[...parse(KEY),...parse(LEGACY),...parse(BACKUP),...memory.values()].filter(x=>x&&x.search_id);return [...new Map(merged.map(x=>[x.search_id,{query:x.query,search_id:x.search_id,source:'QUANTAPHI',created_at:x.created_at||new Date().toISOString()}])).values()]};
const save=items=>{
 memory.clear();for(const item of items)memory.set(item.search_id,item);
 const raw=JSON.stringify(items);let saved=false;
 try{localStorage.setItem(KEY,raw);localStorage.removeItem(LEGACY);saved=localStorage.getItem(KEY)===raw}catch{}
 if(!saved)try{localStorage.setItem(BACKUP,raw);saved=localStorage.getItem(BACKUP)===raw}catch{}
 if(saved)try{
  if(localStorage.getItem(KEY)===raw)localStorage.removeItem(BACKUP);
 }catch{}
 return saved;
};
let running=false,retryTimer=0;
function scheduleRetry(){
 if(retryTimer||!read().length)return;
 retryTimer=setTimeout(()=>{retryTimer=0;void flush()},4000);
}
async function request(options){
 const bridge=global.QuantaCloudConnection;
 if(!bridge?.authenticatedFetch)throw new Error('wallet_bridge_unavailable');
 if(!bridge.hasAccountProfile?.()&&bridge.recoverAccountProfileFromDevice)await bridge.recoverAccountProfileFromDevice();
 return Promise.race([bridge.authenticatedFetch(API,options),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Search commit timed out; retained for retry')),12000))])
}
async function apply(item,result){
 global.PhiAssetBalances?.confirm('QUANT',item.search_id,result.balance);
 const records=await global.QuantaUnifiedTokenLedger?.load?.()||[];
 const linked=records.find(x=>x.sourceEventId===item.search_id||x.quantSearchId===item.search_id);
 if(linked&&result.infinity?.token_id){
  global.PhiAssetBalances?.confirm('INFINITY',linked.id,result.infinity.balance);
  const saved=await global.QuantaUnifiedTokenLedger.update(linked.id,{cloudTokenId:result.infinity.token_id,cloudStatus:'saved',cloudSavedAt:new Date().toISOString(),sourceEventId:item.search_id,quantSearchId:item.search_id});
  if(saved.stage==='research')void persistResearch(saved).catch(error=>console.warn('Research revision sync deferred',error));
 }
 save(read().filter(x=>x.search_id!==item.search_id));
 global.dispatchEvent(new CustomEvent('infinity:token-created',{detail:{...item,tokenId:result.infinity?.token_id||'',source:'QUANTAPHI'}}));
 global.dispatchEvent(new Event('infinity-wallet-updated'));
}
async function flush(){
 if(running||!global.QuantaCloudConnection?.authenticatedFetch)return;
 running=true;
 try{for(const item of read()){
  try{
   const r=await request({method:'POST',body:{query:item.query,search_id:item.search_id,created_at:item.created_at}});
   const result=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(result.error||'Search commit still pending');
   await apply(item,result);
  }catch(error){console.warn('Quanta search commit remains queued',error);scheduleRetry();break}
 }
 const records=await global.QuantaUnifiedTokenLedger?.load?.()||[];
 for(const token of records.filter(x=>x.stage==='research'&&x.cloudTokenId&&(!x.cloudResearchSavedAt||Date.parse(x.cloudResearchSavedAt)<Date.parse(x.updatedAt||x.createdAt))).slice(0,20)){try{await persistResearch(token)}catch(error){console.warn('Research revision remains queued',error);break}}
 }finally{running=false}
}
function queue(query,search_id,created_at){
 const items=read();if(!items.some(x=>x.search_id===search_id)){items.push({query,search_id,source:'QUANTAPHI',created_at:created_at||new Date().toISOString()});return save(items)}
 return true;
}
async function commitNow(query,search_id,created_at,credit_query=query){
 queue(query,search_id,created_at);
 try{
  const r=await request({method:'POST',body:{query,credit_query,search_id,created_at:created_at||new Date().toISOString()}});
  const result=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(result.error||result.message||'Search commit still pending');
  await apply({query,search_id,created_at},result);
  return result;
 }catch(error){
  scheduleRetry();
  throw error;
 }
}
async function confirm(search_id,result){
 const item=read().find(x=>x.search_id===search_id);
 if(item)await apply(item,result);
 else{
  const records=await global.QuantaUnifiedTokenLedger?.load?.()||[];
  const linked=records.find(x=>x.sourceEventId===search_id||x.quantSearchId===search_id);
  if(linked&&result?.infinity?.token_id){global.PhiAssetBalances?.confirm('INFINITY',linked.id,result.infinity.balance);await global.QuantaUnifiedTokenLedger.update(linked.id,{cloudTokenId:result.infinity.token_id,cloudStatus:'saved',cloudSavedAt:new Date().toISOString()})}
 }
}
async function persistResearch(token){
 const search_id=token?.sourceEventId||token?.quantSearchId;
 if(!search_id||!global.QuantaCloudConnection?.authenticatedFetch)return;
 const research={trail:token.trail,dataExtraction:token.dataExtraction,updatedAt:token.updatedAt,id:token.id,query:token.query,websiteUrl:token.websiteUrl,payload:token.payload,stage:token.stage,status:token.status,createdAt:token.createdAt,sourceCount:token.sourceCount};
 const r=await global.QuantaCloudConnection.authenticatedFetch('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/research',{method:'POST',signal:AbortSignal.timeout(10000),body:{search_id,research}});
 if(!r.ok)throw new Error('Research revision remains pending');
 await global.QuantaUnifiedTokenLedger.update(token.id,{cloudResearchSavedAt:token.updatedAt||token.createdAt});
}
async function restoreHistory(){
 if(!global.QuantaCloudConnection?.authenticatedFetch||!global.QuantaUnifiedTokenLedger)return;
 const r=await global.QuantaCloudConnection.authenticatedFetch('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/history');
 if(!r.ok)throw new Error('Cloud history read failed');
 const cloud=await r.json();
 await global.QuantaUnifiedTokenLedger.mutate(merged=>{
 for(const row of cloud.tokens||[]){
  let data={};try{data=JSON.parse(row.data_json||'{}')}catch{}
  let research={};try{research=JSON.parse(row.research_json||'{}')}catch{}
  const searchId=data.search_id||data.source_event_id||'',localId=research.id||data.local_token_id;
  const prior=merged.find(x=>x.cloudTokenId===row.token_id||x.id===row.token_id||(localId&&x.id===localId)||(searchId&&(x.sourceEventId===searchId||x.quantSearchId===searchId)));
  if(prior){if(Date.parse(research.updatedAt||research.createdAt||0)>Date.parse(prior.updatedAt||prior.createdAt||0))Object.assign(prior,research,{id:prior.id});else{if(!prior.trail&&research.trail)prior.trail=research.trail;if(!prior.dataExtraction&&research.dataExtraction)prior.dataExtraction=research.dataExtraction;if(!prior.payload&&research.payload)prior.payload=research.payload}prior.cloudTokenId=row.token_id;prior.cloudStatus='saved';continue}
  merged.push({...research,id:localId||row.token_id,cloudTokenId:row.token_id,cloudStatus:'saved',query:data.query||'',title:data.query||'',source:row.source,sourceSystem:row.source,sourceEventId:searchId,quantSearchId:searchId,createdAt:new Date(row.created_at).toISOString(),websiteUrl:research.websiteUrl||data.website_url||global.QuantaUnifiedTokenLedger.website(row.token_id,data.query),stage:research.stage||'search',status:'finished',value:1});
 }
 });
 let history=[];try{history=JSON.parse(localStorage.getItem('quantaPhiBuildHistoryV1')||'[]')}catch{}
 const byId=new Map(history.map(x=>[x.search_id||x.token_id||x.id,x]));
 for(const row of cloud.searches||[]){if(!byId.has(row.search_id))byId.set(row.search_id,{id:row.search_id,search_id:row.search_id,token_id:row.infinity_token_id,query:row.query_text,created_at:new Date(row.created_at).toISOString()})}
 const next=[...byId.values()].sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at));
 global.QuantaCloudBuildHistory=next;
 try{localStorage.setItem('quantaPhiBuildHistoryV1',JSON.stringify(next))}catch{}
 global.dispatchEvent(new CustomEvent('quantaPhiHistoryAdded'));
}
global.QuantaInfinityCredit={enqueue:(q,id,at)=>{queue(q,id,at);void flush()},enqueueSearch:queue,commitNow,confirm,flush,pending:read,restoreHistory,persistResearch};
setInterval(flush,60000);
for(const event of ['load','online','focus'])global.addEventListener(event,flush);
for(const event of ['starquest:ledger-connected','starquest:auth-changed'])document.addEventListener(event,flush);
})(window);

