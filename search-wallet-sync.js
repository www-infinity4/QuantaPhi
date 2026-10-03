(function(global){
'use strict';
const KEY='quantaPhi:pendingSearchCommits:v2',LEGACY='quantaPhi:pendingInfinityCredits:v1',API='https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/search';
const parse=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return[]}};
const read=()=>{const merged=[...parse(KEY),...parse(LEGACY)].filter(x=>x&&x.search_id);return [...new Map(merged.map(x=>[x.search_id,{query:x.query,search_id:x.search_id,source:'QUANTAPHI',created_at:x.created_at||new Date().toISOString()}])).values()]};
const save=items=>{localStorage.setItem(KEY,JSON.stringify(items));try{localStorage.removeItem(LEGACY)}catch{}};
let running=false;
async function request(options){return Promise.race([global.StarQuestCloudLedger.authenticatedFetch(API,options),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Search commit timed out; retained for retry')),12000))])}
async function apply(item,result){
 global.PhiAssetBalances?.confirm('QUANT',item.search_id,result.balance);
 const records=await global.QuantaUnifiedTokenLedger?.load?.()||[];
 const linked=records.find(x=>x.sourceEventId===item.search_id||x.quantSearchId===item.search_id);
 if(linked&&result.infinity?.token_id){
  global.PhiAssetBalances?.confirm('INFINITY',linked.id,result.infinity.balance);
  await global.QuantaUnifiedTokenLedger.update(linked.id,{cloudTokenId:result.infinity.token_id,cloudStatus:'saved',cloudSavedAt:new Date().toISOString(),sourceEventId:item.search_id,quantSearchId:item.search_id});
 }
 save(read().filter(x=>x.search_id!==item.search_id));
 global.dispatchEvent(new CustomEvent('infinity:token-created',{detail:{...item,tokenId:result.infinity?.token_id||'',source:'QUANTAPHI'}}));
 global.dispatchEvent(new Event('infinity-wallet-updated'));
}
async function flush(){
 if(running||!global.StarQuestCloudLedger?.authenticatedFetch)return;
 running=true;
 try{for(const item of read()){
  try{
   const r=await request({method:'POST',body:{query:item.query,search_id:item.search_id,created_at:item.created_at}});
   const result=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(result.error||'Search commit still pending');
   await apply(item,result);
  }catch(error){console.warn('Quanta search commit remains queued',error);break}
 }}finally{running=false}
}
function queue(query,search_id,created_at){
 const items=read();if(!items.some(x=>x.search_id===search_id)){items.push({query,search_id,source:'QUANTAPHI',created_at:created_at||new Date().toISOString()});save(items)}
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
global.QuantaInfinityCredit={enqueue:(q,id,at)=>{queue(q,id,at);void flush()},enqueueSearch:queue,confirm,flush,pending:read};
setInterval(flush,60000);
for(const event of ['load','online','focus'])global.addEventListener(event,flush);
for(const event of ['starquest:ledger-connected','starquest:auth-changed'])document.addEventListener(event,flush);
})(window);
