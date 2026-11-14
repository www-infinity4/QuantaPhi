/* Infinity Wireless intake UI. Never infer connectivity from animation or receipt. */
const form=document.getElementById('order-form');
const status=document.getElementById('order-status');
const receipt=document.getElementById('receipt');
const refresh=document.getElementById('refresh-order');
const KEY='infinity-wireless:last-order:v1';
let pending=null;
function key(){return [...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join('')}
function setStatus(message,bad=false){status.textContent=message;status.dataset.error=String(bad)}
function showReceipt(data){
 receipt.replaceChildren();
 const h=document.createElement('h3');h.textContent='Planning request recorded';
 const number=document.createElement('p');number.textContent='Order ID: '+data.id;
 const area=document.createElement('p');area.textContent='Requested area: '+data.city+', '+data.state;
 const phase=document.createElement('p');phase.textContent='Current stage: '+(data.phase==='request_recorded'?'Recorded in planning database':'Review required');
 const caveat=document.createElement('p');caveat.textContent='Coverage not verified. No wireless service or tower was activated.';
 const events=document.createElement('ul');
 for(const event of data.events||[]){const li=document.createElement('li');li.textContent=event.kind==='request_received'?'Request saved in database':event.kind==='preliminary_screening_pending'?'Engineering review pending':'Recorded planning event';events.append(li)}
 receipt.append(h,number,area,phase,caveat,events);receipt.hidden=false;
 setStatus('Cloudflare database confirmed your planning request. This is not a live Internet connection.');
}
function readSaved(){try{return JSON.parse(localStorage.getItem(KEY)||'null')}catch{return null}}
function save(order){try{localStorage.setItem(KEY,JSON.stringify(order));refresh.hidden=false}catch{setStatus('Order recorded, but this browser could not save its private tracking key. Keep this page open.')}}
refresh.hidden=!readSaved();
form.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!form.reportValidity())return;
 const fields=new FormData(form);
 const city=String(fields.get('city')||'').trim();
 const state=String(fields.get('state')||'').trim().toUpperCase();
 const goal=String(fields.get('goal')||'');
 const backhaul=String(fields.get('backhaul')||'');
 const acceptedPlanningOnly=form.elements.acceptedPlanningOnly.checked;
 const draft={city,state,goal,backhaul,acceptedPlanningOnly};
 const fingerprint=JSON.stringify(draft);
 if(!pending||pending.fingerprint!==fingerprint)pending={fingerprint,requestKey:key()};
 const payload={...draft,requestKey:pending.requestKey};
 const submit=form.querySelector('[type="submit"]');
 submit.disabled=true;receipt.hidden=true;
 setStatus('Sending planning request to the database… No network activation will occur.');
 try{
  const response=await fetch('/api/wireless/orders',{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  const data=await response.json();
  if(!response.ok||data.ok!==true||!data.id)throw new Error(data.error||'The server did not confirm a receipt.');
  save({id:data.id,requestKey:pending.requestKey});
  showReceipt(data);
 }catch(err){setStatus('Request not confirmed: '+(err?.message||'network error')+'. No order receipt was issued.',true)}
 finally{submit.disabled=false}
});
refresh.addEventListener('click',async()=>{
 const saved=readSaved();
 if(!saved||!/^IW-[A-F0-9]{20}$/.test(saved.id)||!/^[a-f0-9]{64}$/.test(saved.requestKey)){
  setStatus('No valid tracking receipt is saved on this browser.',true);return;
 }
 refresh.disabled=true;
 setStatus('Checking the database for your saved planning request…');
 try{
  const response=await fetch('/api/wireless/orders/'+saved.id,{cache:'no-store',credentials:'same-origin',
    headers:{Authorization:'Bearer '+saved.requestKey}});
  const data=await response.json();
  if(!response.ok||data.ok!==true||data.id!==saved.id)throw new Error(data.error||'No verified result.');
  showReceipt(data);
 }catch(err){setStatus('Tracking unavailable: '+(err?.message||'network error'),true)}
 finally{refresh.disabled=false}
});
