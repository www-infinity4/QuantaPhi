/* Safe, read-only Bubbles owner diagnostics. Never print, store, transmit or copy tokens. */
(function(){
'use strict';
const panel=document.getElementById('bubblesOwnerDiagnostics');
if(!panel)return;
const result=document.getElementById('bubblesOwnerDiagnosticResults');
const summary=document.getElementById('bubblesOwnerDiagnosticSummary');
const button=document.getElementById('bubblesOwnerDiagnosticRun');
let inFlight=false;
function line(name,value){
 const row=document.createElement('li');
 const label=document.createElement('strong');
 label.textContent=name+': ';
 const description=document.createElement('span');
 description.textContent=String(value);
 row.append(label,description);
 return row;
}
async function health(){
 const controller=new AbortController();
 let timer;
 try{
  const response=await Promise.race([
   fetch('https://infinity-brain-clock.marvaseater.workers.dev/health',{cache:'no-store',signal:controller.signal}),
   new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'))},7000)})
  ]);
  return response.ok?'reachable (HTTP '+response.status+')':
    response.status===401||response.status===403?'reachable; access controlled (HTTP '+response.status+')':
    'HTTP '+response.status+' (service needs inspection)';
 }catch{return 'unreachable or blocked by browser/network';}
 finally{clearTimeout(timer)}
}
async function run(){
 if(inFlight)return;
 inFlight=true;
 button.disabled=true;
 summary.textContent='Owner check: checking safely…';
 result.replaceChildren(line('Diagnostic','Checking current page and Brain reachability'));
 try{
  const bridge=window.QuantaBrainOwner;
  const info=typeof bridge?.diagnostics==='function'?bridge.diagnostics():null;
  const owner=info?.owner==='verified';
  const account=document.getElementById('bubblesSigninGate');
  const script=[...document.querySelectorAll('script[src]')].find(x=>x.src.includes('/bubbles-ai.js'));
  const revision=script?new URL(script.src).searchParams.get('v'):'unknown';
  const stages=[
   line('Page revision',revision||'not specified'),
   line('Wallet bridge',info?info.bridge:'owner script not loaded'),
   line('Device credential',info?info.credential==='present'?'present; not proof of ownership':info.credential:'unavailable'),
   line('Brain wallet verification',info?info.server+' ('+info.reason+')':'owner script not loaded'),
   line('Owner session',owner?'server-verified on this page':'not verified on this page'),
   line('Account OAuth',account?.dataset?.ready==='true'?'GitHub and Cloudflare approved':'not fully verified; not a basic-chat requirement'),
   line('Brain public health',await health())
  ];
  result.replaceChildren(...stages);
  summary.textContent=owner?'Owner check: verified on this page':'Owner check: needs attention (view details)';
 }catch{
  result.replaceChildren(line('Diagnostic','Unable to inspect this page. Chat is still available.'));
  summary.textContent='Owner check: diagnostic unavailable';
 }finally{inFlight=false;button.disabled=false}
}
button.addEventListener('click',()=>void run());
// Show a result automatically after the initial wallet startup deadline.
setTimeout(()=>void run(),12000);
})();