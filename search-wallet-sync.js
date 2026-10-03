(function(global){
'use strict';
const KEY='quantaPhi:pendingInfinityCredits:v1',API='https://unified-wallet.marvaseater.workers.dev';
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}};
const save=items=>localStorage.setItem(KEY,JSON.stringify(items));
let running=false;
async function request(url,options){return Promise.race([global.StarQuestCloudLedger.authenticatedFetch(url,options),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Cloud credit timed out; retained for retry')),12000))])}
async function flush(){
 if(running||!global.StarQuestCloudLedger?.authenticatedFetch)return;
 running=true;
 try{for(const item of read()){
  try{
   if(item.quantPending){const qr=await request('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/search',{method:'POST',body:{query:item.query,search_id:item.search_id}});if(!qr.ok)throw new Error('Quant credit still pending');const quantResult=await qr.json().catch(()=>({}));global.PhiAssetBalances?.confirm('QUANT',item.search_id,quantResult.balance);item.quantPending=false;save(read().map(x=>x.search_id===item.search_id?item:x))}
   const data={query:item.query,search_id:item.search_id,source:item.source,created_at:item.created_at};
   const r=await request(API+'/v1/tokens/mint',{method:'POST',body:{type:'INFINITY_SEARCH',source:'QUANTAPHI',idempotencyKey:'quant-search:'+item.search_id,data}});
   const result=await r.json();if(!r.ok)throw new Error(result.error||'Infinity credit failed');
   const records=await global.QuantaUnifiedTokenLedger?.load?.()||[];const linked=records.find(x=>x.sourceEventId===item.search_id||x.quantSearchId===item.search_id);
   if(linked)global.PhiAssetBalances?.confirm('INFINITY',linked.id,result.balance);
   save(read().filter(x=>x.search_id!==item.search_id));
   global.dispatchEvent(new CustomEvent('infinity:token-created',{detail:{...item,tokenId:result.tokenId,source:'QUANTAPHI'}}));
   global.dispatchEvent(new Event('infinity-wallet-updated'));
  }catch(error){console.warn('Quanta Infinity credit remains queued',error);break}
 }}finally{running=false}
}
function enqueue(query,search_id,created_at,quantPending=false){
 const items=read();if(!items.some(x=>x.search_id===search_id)){items.push({query,search_id,source:'QUANTAPHI',created_at,quantPending});save(items)}
 void flush();
}
global.QuantaInfinityCredit={enqueue,enqueueSearch:(q,id,at)=>enqueue(q,id,at,true),flush,pending:read};
setInterval(flush,60000);
for(const event of ['load','online','focus'])global.addEventListener(event,flush);
for(const event of ['starquest:ledger-connected','starquest:auth-changed'])document.addEventListener(event,flush);
})(window);
