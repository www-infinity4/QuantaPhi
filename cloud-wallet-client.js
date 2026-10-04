(function(global){
'use strict';
const ENDPOINT='https://unified-wallet.marvaseater.workers.dev';
const DEVICE_PREFIX='starquest_ledger_device_v1:';
const read=(key,fallback=null)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
function storedToken(key){const raw=localStorage.getItem(key)||'';if(/^sq_[A-Za-z0-9_-]{32,}$/.test(raw))return raw;const value=read(key,null);return /^sq_[A-Za-z0-9_-]{32,}$/.test(value?.deviceToken||'')?value.deviceToken:''}
function findDeviceToken(){
 try{
  const session=read('starquest_session',null),username=String(session?.username||session?.key||'').toLowerCase();
  if(username)return storedToken(DEVICE_PREFIX+username);
  const tokens=new Set();for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)||'';if(key.startsWith(DEVICE_PREFIX)){const token=storedToken(key);if(token)tokens.add(token)}}
  return tokens.size===1?[...tokens][0]:'';
 }catch{return ''}
}
const connectionStatus={bridge:['https://quantaphi.org','https://www.quantaphi.org','https://quantaphi.net','https://www.quantaphi.net'].includes(location.origin)?'pending':'not-required'};
const ready=['https://quantaphi.org','https://www.quantaphi.org','https://quantaphi.net','https://www.quantaphi.net'].includes(location.origin)?new Promise(resolve=>{
 const start=()=>{
  const frame=document.createElement('iframe'),nonce=crypto.randomUUID();frame.hidden=true;frame.src='https://www-infinity4.github.io/QuantaPhi/wallet-link.html?v=20261004-learn1';
  let done=false;const finish=(status='timeout')=>{if(done)return;done=true;connectionStatus.bridge=status;clearTimeout(timer);global.removeEventListener('message',receive);frame.remove();resolve()};
  const timer=setTimeout(()=>finish('timeout'),8000);
  const receive=event=>{
   if(event.origin!=='https://www-infinity4.github.io'||event.source!==frame.contentWindow||event.data?.type!=='quanta:link-response'||event.data.nonce!==nonce)return;
   try{const current=read('starquest_session',null),remote=JSON.parse(event.data.values?.starquest_session||'null');if(current&&(current.key||current.username)!==(remote?.key||remote?.username)){finish('account-mismatch');return}}catch(_){finish('account-mismatch');return}
   const allowed=new Set(['starquest_session','c13b0_infinity_token_ledger_v3','infinity_unified_token_count_v3','phi:assetBalances:v1','quantaPhiBuildHistoryV1','quantaPhiCollected','quantaPhiTokens','quantaPhi:pendingSearchCommits:v2','quantaPhi:pendingInfinityCredits:v1']);
   try{for(const [key,value]of Object.entries(event.data.values||{})){if((allowed.has(key)||/^starquest_ledger_device_v1:[A-Za-z0-9_-]+$/.test(key))&&typeof value==='string'&&localStorage.getItem(key)===null)localStorage.setItem(key,value)}}catch(_){}
   global.dispatchEvent(new StorageEvent('storage',{key:'phi:assetBalances:v1'}));finish('linked');
   document.dispatchEvent(new CustomEvent('starquest:ledger-connected'));
  };
  global.addEventListener('message',receive);frame.onerror=()=>finish('unavailable');frame.onload=()=>frame.contentWindow.postMessage({type:'quanta:link-request',nonce},'https://www-infinity4.github.io');document.body.appendChild(frame);
 };
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
}):Promise.resolve();
global.QuantaCloudConnection={ready,status:connectionStatus,hasCredential:()=>Boolean(findDeviceToken()),async authenticatedFetch(target,options={}){
 await ready;
 const url=new URL(target);
 const allowed=(url.origin===ENDPOINT&&['/v1/wallet/state','/v1/tokens/mint'].includes(url.pathname))||(url.origin==='https://quanta-phi-ledger.marvaseater.workers.dev'&&url.pathname.startsWith('/v1/quants/'));
 if(!allowed)throw new Error('unsupported_wallet_target');
 const bridge=global.StarQuestCloudLedger;
 if(bridge?.authenticatedFetch){try{return await bridge.authenticatedFetch(target,options)}catch(error){if(error.message!=='ledger_not_connected')throw error}}
 const token=findDeviceToken();if(!token)throw new Error('ledger_not_connected');
 const body=options.body&&typeof options.body==='object'?JSON.stringify(options.body):options.body;
 return fetch(target,{...options,body,headers:{...(options.headers||{}),'content-type':'application/json',authorization:'Bearer '+token}});
}};
class InfinityUnifiedWallet{
 constructor(options={}){this.endpoint=options.endpoint||ENDPOINT;this.appName=options.appName||document.title||location.hostname;this.state=null;this.listeners=new Set()}
 token(){const token=findDeviceToken();if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(token))throw new Error('Connect the same StarQuest account before using the unified wallet.');return token}
 async request(path,options={}){const response=await fetch(this.endpoint+path,{signal:AbortSignal.timeout(8000),...options,headers:{'content-type':'application/json','authorization':'Bearer '+this.token(),...(options.headers||{})}});const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'unified_wallet_request_failed');return result}
 async connect(){return this.refresh()}
 async refresh(){this.state=await this.request('/v1/wallet/state',{cache:'no-store'});this.listeners.forEach(fn=>fn(this.state));global.dispatchEvent(new CustomEvent('infinity:wallet-state',{detail:this.state}));return this.state}
 async importLegacy({importKey='browser-v1',balances={},tokens=[]}={}){const result=await this.request('/v1/wallet/import',{method:'POST',body:JSON.stringify({importKey,source:this.appName,balances,tokens})});await this.refresh();return result}
 async mintToken(type,data,idempotencyKey){const result=await this.request('/v1/tokens/mint',{method:'POST',body:JSON.stringify({type,data,idempotencyKey,source:this.appName})});await this.refresh();return result}
 async spendInfinity(amount,referenceId,idempotencyKey,metadata={}){const result=await this.request('/v1/wallet/spend',{method:'POST',body:JSON.stringify({asset:'INFINITY',amount,referenceId,idempotencyKey,metadata})});await this.refresh();return result}
 subscribe(listener){this.listeners.add(listener);if(this.state)listener(this.state);return()=>this.listeners.delete(listener)}
}
global.InfinityCloudWallet=InfinityUnifiedWallet;
})(window);

