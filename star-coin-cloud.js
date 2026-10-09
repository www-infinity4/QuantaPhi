(function(global){
'use strict';
// Durable Cloudflare credits: +0.1 Collect/Share; +1.0 for each sourced research spin.
// Credits are kept in a browser outbox until the QuantaPhi ledger confirms them, and
// the ledger ignores repeated reference IDs, so retries never credit twice.
const KEY='quantaPhi:pendingStarCoinCredits:v1',BACKUP='quantaPhi:pendingStarCoinCredits:backup:v1',BACKFILL='quantaPhi:starCoinCloudBackfill:v1:',STATE='quantaPhi:starCoinCloudState:v1';
const API='https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/star-coins';
const memory=new Map();
const parse=key=>{try{const v=JSON.parse(global.localStorage.getItem(key)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
const readJson=(key,fallback)=>{try{return JSON.parse(global.localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
function read(){
 const merged=[...parse(KEY),...parse(BACKUP),...memory.values()].filter(x=>x&&typeof x.reference_id==='string'&&x.reference_id);
 return [...new Map(merged.map(x=>[x.reference_id,x])).values()];
}
function save(items){
 memory.clear();for(const item of items)memory.set(item.reference_id,item);
 const raw=JSON.stringify(items);let saved=false;
 try{global.localStorage.setItem(KEY,raw);saved=global.localStorage.getItem(KEY)===raw}catch{}
 if(!saved)try{global.localStorage.setItem(BACKUP,raw);saved=global.localStorage.getItem(BACKUP)===raw}catch{}
 else try{global.localStorage.removeItem(BACKUP)}catch{}
 return saved;
}
function compactCard(card){
 if(!card||typeof card!=='object')return undefined;
 const out={key:String(card.key||'').slice(0,700),type:String(card.type||'').slice(0,40),title:String(card.title||'').slice(0,500),story:String(card.story||'').slice(0,4000),media:String(card.media||'').slice(0,2000),sourceUrl:String(card.sourceUrl||'').slice(0,2000)};
 return out.key&&out.title?out:undefined;
}
function compactResearch(item){
 if(!item||typeof item!=='object')return undefined;
 const sources=(Array.isArray(item.sources)?item.sources:[]).filter(x=>x&&/^https:\/\//.test(x.url||'')).slice(0,5).map(x=>({title:String(x.title||'').slice(0,180),url:String(x.url).slice(0,1500)}));
 const sourceUrl=String(item.sourceUrl||'').slice(0,1500);
 if(!sources.some(x=>x.url===sourceUrl)&&/^https:\/\//.test(sourceUrl))sources.unshift({title:String(item.sourceTitle||'Original source').slice(0,180),url:sourceUrl});
 const research={title:String(item.title||'').slice(0,180),summary:String(item.summary||'').slice(0,950),full:String(item.full||'').slice(0,4000),sourceUrl,sources:sources.slice(0,5),parentQuery:String(item.parentQuery||'').slice(0,450),researchBranch:String(item.researchBranch||'').slice(0,250)};
 return research.title.length>=12&&research.full.length>=150&&sources.length>0?research:undefined;
}
function record(kind,reference,card){
 if(!['collect','share','spin'].includes(kind))return false;
 const research=kind==='spin'?compactResearch(card):undefined;
 if(kind==='spin'&&!research)return false;
 const ref=String(reference||'').trim().slice(0,700);if(!ref)return false;
 const reference_id='quantaphi:'+kind+':'+ref,items=read();
 if(!items.some(x=>x.reference_id===reference_id)){
  items.push({reference_id,kind,reference:ref,created_at:new Date().toISOString(),...(kind==='collect'&&compactCard(card)?{card:compactCard(card)}:{}),...(kind==='spin'?{research}:{})});
  save(items);
 }
 void flush();
 return true;
}
let running=false;
const REQUEST_TIMEOUT_MS=12000;
async function request(options){let timer;try{return await Promise.race([global.QuantaCloudConnection.authenticatedFetch(API,options),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Star Coin sync timed out; retained for retry')),REQUEST_TIMEOUT_MS)})])}finally{clearTimeout(timer)}}
function publish(state){
 try{global.localStorage.setItem(STATE,JSON.stringify({...state,history:undefined,syncedAt:new Date().toISOString()}))}catch{}
 // Reconcile the durable QuantaPhi Star Coin receipts into the visible shared
 // wallet without ever lowering a larger recovered/local Star Coin balance.
 const tenths=Number(state?.credits_tenths);
 if(Number.isFinite(tenths)&&tenths>=0)try{global.ControlPhi?.importLegacyStarCoinBalance?.(tenths/10,'quanta-phi-cloud')}catch(error){console.warn('Star Coin wallet reconcile deferred',error)}
 try{global.dispatchEvent(new CustomEvent('quantaphi:star-coins-cloud',{detail:state}))}catch{}
}
async function flush(){
 const connection=global.QuantaCloudConnection;
 if(running||!connection?.authenticatedFetch)return {ok:false,pending:read().length};
 if(typeof connection.hasCredential==='function'&&!connection.hasCredential())return {ok:false,pending:read().length,reason:'ledger_not_connected'};
 running=true;
 try{
  for(let pending=read();pending.length;pending=read()){
   const batch=pending.slice(0,100);
   const r=await request({method:'POST',body:{credits:batch}});
   const result=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(result.error||('Star Coin sync HTTP '+r.status));
   const done=new Set(Array.isArray(result.accepted)?result.accepted:[]);
   // Credits the ledger rejects as malformed are dropped so they cannot block later valid credits.
   for(const item of batch)if(!String(item.reference_id).startsWith('quantaphi:'+item.kind+':'))done.add(item.reference_id);
   if(!done.size)break;
   save(read().filter(x=>!done.has(x.reference_id)));
   publish(result);
  }
  return {ok:true,pending:read().length};
 }catch(error){console.warn('Star Coin credits retained for Cloudflare retry',error);return {ok:false,pending:read().length}}
 finally{running=false}
}
async function state(){
 const r=await global.QuantaCloudConnection.authenticatedFetch(API,{method:'GET'});
 const result=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(result.error||('Star Coin state HTTP '+r.status));
 publish(result);return result;
}
// Earlier QuantaPhi credits only lived in this browser; send them once per account.
function backfill(){
 try{
  const session=readJson('starquest_session',null),account=String(session?.key||'guest').toLowerCase(),marker=BACKFILL+account;
  if(global.localStorage.getItem(marker))return 0;
  const users=readJson('starquest_users',{});
  // Wait until the signed-in account record is restored before marking it backfilled.
  if(session?.key&&!users?.[session.key])return 0;
  const wallet=session?.key?users[session.key]:readJson('starquest_guest_profile_v1',{});
  const items=read(),known=new Set(items.map(x=>x.reference_id));let added=0;
  const add=item=>{if(!known.has(item.reference_id)){known.add(item.reference_id);items.push(item);added++}};
  for(const entry of Array.isArray(wallet?.ledger)?wallet.ledger:[]){
   const id=String(entry?.referenceId||''),m=/^quantaphi:(collect|share):(.+)$/.exec(id);
   if(m)add({reference_id:id.slice(0,800),kind:m[1],reference:m[2].slice(0,700),created_at:new Date(Number(entry.createdAt)||Date.now()).toISOString()});
  }
  for(const card of parse('quantaPhiCollected')){
   const c=compactCard(card);if(!c)continue;
   add({reference_id:'quantaphi:collect:'+c.key,kind:'collect',reference:c.key,created_at:String(card.collectedAt||new Date().toISOString()),card:c});
  }
  if(added&&!save(items))return 0;
  global.localStorage.setItem(marker,new Date().toISOString());
  return added;
 }catch(error){console.warn('Star Coin backfill deferred',error);return 0}
}
const kick=()=>{backfill();void flush().finally(()=>{const connection=global.QuantaCloudConnection;if(connection?.authenticatedFetch&&(!connection.hasCredential||connection.hasCredential()))void state().catch(error=>console.warn('Star Coin state refresh deferred',error))})};
for(const event of ['load','online','focus'])global.addEventListener?.(event,kick);
global.document?.addEventListener?.('starquest:ledger-connected',kick);
global.document?.addEventListener?.('visibilitychange',()=>{if(global.document.visibilityState==='visible')kick()});
global.QuantaStarCoinCloud={API,KEY,record,flush,state,backfill,pending:()=>read()};
setTimeout(kick,0);
})(window);
