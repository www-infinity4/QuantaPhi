/* Robot Brain owner gate.
 * Prefer the verified Unified Wallet identity. A wallet balance, displayed
 * username or browser flag is never owner proof: the Brain clock verifies the
 * device token using its private wallet binding, then matches the already
 * bound owner wallet before issuing a short-lived session.
 * Existing owner keys remain a recovery option, not a login requirement.
 */
(function(){
'use strict';
const KEY='infinity-work-ticket-owner-v1';
const HEALTH='https://infinity-brain-clock.marvaseater.workers.dev/health';
const SESSION='https://infinity-brain-clock.marvaseater.workers.dev/owner/session';
const RETRY_MS=[5000,15000,30000,60000,120000];

// Android 12 can run a WebView without AbortSignal.timeout. Build the
// timeout from AbortController so verification still reaches the server.
async function ownerFetch(url,options={},timeoutMs=12000){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{return await fetch(url,{...options,signal:controller.signal})}
 finally{clearTimeout(timer)}
}

function openInbox(){
 return new Promise((resolve,reject)=>{
  try{const r=indexedDB.open('quantaphi-robot-inbox',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('settings'))r.result.createObjectStore('settings')};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Inbox storage blocked'))}
  catch(e){reject(e)}
 });
}
async function inbox(value){
 const db=await openInbox();
 try{
  return await new Promise((resolve,reject)=>{
   const t=db.transaction('settings',value===undefined?'readonly':'readwrite'),store=t.objectStore('settings');
   const r=value===undefined?store.get(KEY):value===null?store.delete(KEY):store.put(value,KEY);
   let result;r.onsuccess=()=>{result=r.result};t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Inbox write aborted'));
  });
 }finally{db.close()}
}
async function readToken(){
 let token='';
 try{token=String(await inbox()||'')}catch{}
 if(!token)try{token=sessionStorage.getItem(KEY)||''}catch{}
 if(!token)try{token=localStorage.getItem(KEY)||''}catch{}
 return token.trim();
}
async function saveToken(token){
 let saved=false;
 try{await inbox(token);saved=true}catch{}
 try{localStorage.setItem(KEY,token);saved=true}catch{}
 if(!saved)try{sessionStorage.setItem(KEY,token)}catch{}
}
async function forgetToken(){
 try{await inbox(null)}catch{}
 try{localStorage.removeItem(KEY)}catch{}
 try{sessionStorage.removeItem(KEY)}catch{}
}
const validToken=token=>typeof token==='string'&&token.length>=16&&token.length<=512&&/^[\x21-\x7e]+$/.test(token);
async function verify(token){
 if(!validToken(token))return {state:'rejected'};
 const headers={Authorization:'Bearer '+token};
 try{
  const r=await ownerFetch(HEALTH,{headers,cache:'no-store'});
  if(r.ok)return {state:'verified',headers};
  if(!(r.status===404||r.status===401||r.status===403))return {state:'unreachable'};
 }catch{return {state:'unreachable'}}
 // Recovery keys are checked first; a 64-hex recovery key is not mistaken for
 // an unused pairing code. Redemption consumes the short-lived code once.
 if(!/^[a-f0-9]{64}$/.test(token))return {state:'rejected'};
 try{
  const r=await ownerFetch('https://infinity-brain-clock.marvaseater.workers.dev/owner/pair/redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:token})});
  const result=await r.json();
  if(!r.ok||!result.ok||!/^rd_[a-f0-9]{64}$/.test(result.token||''))return {state:r.status>=500?'unreachable':'rejected'};
  return {state:'verified',headers:{Authorization:'Bearer '+result.token},pairedToken:result.token};
 }catch{return {state:'unreachable'}}
}
async function walletIdentity(){
 try{
  await window.QuantaCloudConnection?.ready;
  let token=await window.QuantaCloudConnection?.resolveDeviceToken?.();
  if(!token){try{token=new window.InfinityCloudWallet({appName:document.title}).token()}catch{}}
  if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(token||''))return {state:'no-wallet'};
  // A device credential is presented only to this first-party Brain endpoint.
  // The server confirms the session against the private Unified Wallet service.
  const response=await ownerFetch(SESSION,{method:'POST',headers:{Authorization:'Bearer '+token},cache:'no-store'},15000);
  if(response.status===404||response.status===401||response.status===403)return {state:'not-linked'};
  if(!response.ok)return {state:'unreachable'};
  const body=await response.json();
  if(!body?.ok||!/^rb_[a-f0-9]{64}$/.test(body.token||'')||Number(body.expiresAt)<=Date.now())return {state:'unreachable'};
  return {state:'verified',headers:{Authorization:'Bearer '+body.token},expiresAt:Number(body.expiresAt)};
 }catch{return {state:'unreachable'}}
}
let resolveReady;
const ready=new Promise(resolve=>{resolveReady=resolve});
window.QuantaBrainOwner={ready,verify,walletIdentity};

if(typeof document==='undefined')return;
const host=document.getElementById('robotBrainOwner');
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
let busy=false,pairingInFlight=false,retryTimer=null,renewTimer=null,verifiedHeaders=null,verifiedSource='';
const later=(fn,ms)=>{clearTimeout(retryTimer);retryTimer=setTimeout(fn,ms)};

async function renewWallet(){
 if(verifiedSource!=='wallet')return;
 const result=await walletIdentity();
 if(result.state==='verified'){
  // Mutate the same header object captured by the two Brain components.
  verifiedHeaders.Authorization=result.headers.Authorization;
  const delay=Math.max(10000,Math.min(15*60*1000,result.expiresAt-Date.now()-60000));
  clearTimeout(renewTimer);renewTimer=setTimeout(renewWallet,delay);
 }else if(result.state==='no-wallet'||result.state==='not-linked'){
  // When the active wallet changes or signs out, do not leave owner UI active.
  location.reload();
 }else{
  clearTimeout(renewTimer);renewTimer=setTimeout(renewWallet,30000);
 }
}
function unlocked(headers,token,source,expiresAt){
 clearTimeout(retryTimer);
 host.dataset.state='verified';verifiedHeaders=headers;verifiedSource=source;
 const bar=node('div','','rbo-bar');
 const label=node('span',source==='wallet'?'🤖 Robot Brain unlocked with your verified Unified Wallet.':'🤖 Owner session connected on this device. Bubbles can sync your shared conversation.');
 bar.append(label);
 if(source==='key'&&!/^rd_/.test(token||'')){
  const copy=node('button','Copy owner key');copy.type='button';
  const lock=node('button','Lock on this device');lock.type='button';
  const status=node('small','');status.setAttribute('role','status');
  copy.addEventListener('click',async()=>{
   try{await navigator.clipboard.writeText(token);status.textContent='Owner key copied. Keep it private.'}
   catch{status.textContent='Clipboard is blocked in this browser.'}
  });
  lock.addEventListener('click',async()=>{await forgetToken();location.reload()});
  bar.append(copy,lock,status);
 }
 host.replaceChildren(bar);
 resolveReady(headers);
 if(source==='wallet'){
  const delay=Math.max(10000,Math.min(15*60*1000,expiresAt-Date.now()-60000));
  clearTimeout(renewTimer);renewTimer=setTimeout(renewWallet,delay);
 }
}
// The Android WebView cannot silently inherit Chrome's authenticated cookies.
// Let its first-party chat redeem an explicitly supplied, short-lived owner
// pairing code without showing the separate desktop owner panel.
window.QuantaBrainOwner.connectWithCode=async function(raw){
 const code=String(raw||'').trim();
 if(!validToken(code))return {state:'rejected'};
 if(verifiedHeaders)return {state:'verified'};
 if(pairingInFlight)return {state:'busy'};
 pairingInFlight=true;
 try{
  const result=await verify(code);
  if(result.state!=='verified')return {state:result.state};
  const credential=result.pairedToken||code;
  await saveToken(credential);
  unlocked(result.headers,credential,'key');
  return {state:'verified'};
 }finally{pairingInFlight=false}
};
function form(message){
 if(host.dataset.state==='verified')return;
 host.dataset.state='locked';
 const details=node('details','','rbo-gate');
 const summary=node('summary','🔒 Robot Brain · owner access');
 const intro=node('p','Your Unified Wallet is checked automatically. To link another Bubbles session, say “link my APK” on your verified QuantaPhi website, then paste its two-minute pairing code here.');
 const label=node('label','Owner pairing code or recovery key');label.htmlFor='robotBrainOwnerKey';
 const input=node('input');input.id='robotBrainOwnerKey';input.type='password';input.autocomplete='current-password';input.spellcheck=false;input.maxLength=512;
 const button=node('button','Connect owner session');button.type='button';
 const status=node('p',message||'');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 if(message)details.open=true;
 async function submit(){
  const token=input.value.trim();
  if(!validToken(token)){status.textContent='That does not look like an existing owner key.';return}
  button.disabled=true;status.textContent='Checking the existing key with Brain…';
  const result=await verify(token);
  button.disabled=false;
  if(result.state==='verified'){const credential=result.pairedToken||token;await saveToken(credential);input.value='';unlocked(result.headers,credential,'key');return}
  status.textContent=result.state==='rejected'?'Brain did not accept this key.':'Brain cannot be reached right now. Please retry.';
 }
 button.addEventListener('click',submit);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});
 details.append(summary,intro,label,input,button,status);host.replaceChildren(details);
}
async function start(attempt=0){
 if(!host||host.dataset.state==='verified'||busy)return;
 busy=true;
 try{
  const wallet=await walletIdentity();
  if(wallet.state==='verified'){unlocked(wallet.headers,null,'wallet',wallet.expiresAt);return}
  const token=await readToken();
  if(token){
   const existing=await verify(token);
   if(existing.state==='verified'){unlocked(existing.headers,token,'key');return}
   if(existing.state==='unreachable'&&wallet.state!=='not-linked'){const wait=RETRY_MS[Math.min(attempt,RETRY_MS.length-1)];form('Brain is temporarily unreachable. Retrying automatically.');later(()=>start(attempt+1),wait);return}
  }
  if(wallet.state==='not-linked')form('Your Unified Wallet was recognized, but has not yet been securely linked as Robot Brain\'s owner account. Nothing has been unlocked for another wallet.');
  else if(wallet.state==='no-wallet')form('Connect your existing Unified Wallet on QuantaPhi; Robot Brain will check it automatically.');
  else{
   const wait=RETRY_MS[Math.min(attempt,RETRY_MS.length-1)];
   form('Wallet verification is temporarily unavailable. Retrying automatically.');
   later(()=>start(attempt+1),wait);
  }
 }finally{busy=false}
}
if(host){
 start();
 const retry=()=>{if(host.dataset.state!=='verified')start()};
 document.addEventListener('starquest:ledger-connected',retry);
 document.addEventListener('starquest:auth-changed',()=>{if(verifiedSource==='wallet')renewWallet();else retry()});
 window.addEventListener('infinity:wallet-state',retry);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&verifiedSource==='wallet')renewWallet();else retry()});
}else readToken().then(verify).then(r=>{if(r.state==='verified')resolveReady(r.headers)});
})();
