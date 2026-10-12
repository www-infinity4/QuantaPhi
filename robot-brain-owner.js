/* Robot Brain owner gate.
 * The Robot Brain stays hidden from the public. The owner key is checked by the
 * brain clock (/health returns 404 for any other key). A missing key on this
 * device or a brief network failure must never remove the Brain for good, so
 * this gate lets the owner unlock it again and retries transient failures. */
(function(){
'use strict';
const KEY='infinity-work-ticket-owner-v1';
const HEALTH='https://infinity-brain-clock.marvaseater.workers.dev/health';
const RETRY_MS=[5000,15000,30000,60000,120000];

function openInbox(){
 return new Promise((resolve,reject)=>{
  try{const r=indexedDB.open('quantaphi-robot-inbox',1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Inbox storage blocked'));}
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
 // A second copy lets the Brain recover if the browser evicts IndexedDB.
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
  const r=await fetch(HEALTH,{headers,cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(r.ok)return {state:'verified',headers};
  return {state:r.status===404||r.status===401||r.status===403?'rejected':'unreachable'};
 }catch{return {state:'unreachable'}}
}

let resolveReady;
const ready=new Promise(resolve=>{resolveReady=resolve});
window.QuantaBrainOwner={ready,verify};

if(typeof document==='undefined')return;
const host=document.getElementById('robotBrainOwner');
const node=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};

function unlocked(headers,token){
 host.dataset.state='verified';
 const bar=node('div','','rbo-bar');
 const label=node('span','🤖 Robot Brain unlocked for the owner on this device.');
 const copy=node('button','Copy owner key');copy.type='button';
 const lock=node('button','Lock on this device');lock.type='button';
 const status=node('small','');status.setAttribute('role','status');
 copy.addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText(token);status.textContent='Owner key copied. Keep it private; paste it on another device or domain to unlock the Brain there.'}
  catch{status.textContent='Clipboard is blocked in this browser.'}
 });
 lock.addEventListener('click',async()=>{await forgetToken();location.reload()});
 bar.append(label,copy,lock,status);host.replaceChildren(bar);
 resolveReady(headers);
}

function form(message){
 host.dataset.state='locked';
 const details=node('details','','rbo-gate');
 const summary=node('summary','🔒 Robot Brain · owner sign-in');
 const intro=node('p','Owner only. Paste your Robot Brain owner key to show the Brain, its color-bot crews and the job controls on this device. The key is checked by the brain clock and stays in this browser.');
 const label=node('label','Owner key');label.htmlFor='robotBrainOwnerKey';
 const input=node('input');input.id='robotBrainOwnerKey';input.type='password';input.autocomplete='current-password';input.spellcheck=false;input.maxLength=512;
 const button=node('button','Unlock Robot Brain');button.type='button';
 const status=node('p',message||'');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 if(message)details.open=true;
 async function submit(){
  const token=input.value.trim();
  if(!validToken(token)){status.textContent='That does not look like an owner key.';return}
  button.disabled=true;status.textContent='Checking the key with the brain clock…';
  const result=await verify(token);
  button.disabled=false;
  if(result.state==='verified'){await saveToken(token);input.value='';unlocked(result.headers,token);return}
  status.textContent=result.state==='rejected'?'The brain clock did not accept this key.':'The brain clock is not reachable right now. Try again in a moment.';
 }
 button.addEventListener('click',submit);
 input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit()}});
 details.append(summary,intro,label,input,button,status);host.replaceChildren(details);
}

async function start(attempt=0){
 const token=await readToken();
 if(!token){form();return}
 const result=await verify(token);
 if(result.state==='verified'){unlocked(result.headers,token);return}
 if(result.state==='rejected'){form('The owner key saved on this device was not accepted. Paste your current owner key.');return}
 // Unreachable: keep the saved key and retry instead of hiding the Brain forever.
 const wait=RETRY_MS[Math.min(attempt,RETRY_MS.length-1)];
 const message='Your owner key is saved, but the brain clock is not reachable yet. Retrying automatically in '+Math.round(wait/1000)+' seconds…';
 const typing=host.querySelector('#robotBrainOwnerKey');
 const existing=host.querySelector('.rbo-gate [role=status]');
 if(existing){existing.textContent=message;if(!typing||!typing.value)host.querySelector('.rbo-gate').open=true}else form(message);
 setTimeout(()=>{if(host.dataset.state!=='verified')start(attempt+1)},wait);
}
if(host)start();else readToken().then(verify).then(r=>{if(r.state==='verified')resolveReady(r.headers)});
})();
