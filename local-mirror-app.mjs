import {classifyObservedResource,createAuditReceipt} from './local-mirror-core.mjs';
const $=id=>document.getElementById(id);
const consent=$('consent'), text=$('text'), status=$('status'), items=$('records'), radar=$('radar'), audit=$('audit');
const saved=$('save'), refresh=$('refresh'), clear=$('clear');
const worker=new Worker('./local-mirror-worker.mjs',{type:'module',name:'QuantaPhi Local Mirror'});
let requestId=0;
const pending=new Map();
const seen=new Map();
const message=(str)=>{status.textContent=str;};
worker.addEventListener('message', ({data})=>{
 const request=pending.get(data?.requestId);
 if(!request)return;
 pending.delete(data.requestId);
 if(data.ok)request.resolve(data.result);
 else request.reject(new Error(data.error||'Local operation failed'));
});
worker.addEventListener('error',()=>{message('Local worker could not start. No text was sent to a remote service.');});
function send(type,payload={}){
 return new Promise((resolve,reject)=>{
   const id=++requestId;
   pending.set(id,{resolve,reject});
   worker.postMessage({requestId:id,type,...payload});
 });
}
function renderRecords(records){
 items.replaceChildren();
 if(!records.length){items.textContent='No locally saved snippets.';return;}
 for(const record of records.slice().reverse().slice(0,40)){
   const li=document.createElement('li');
   const heading=document.createElement('strong');heading.textContent=`${record.length} characters · ${record.timestamp}`;
   const p=document.createElement('p');
   p.textContent=`SHA-256: ${record.sha256} · Local word counts: ${Object.entries(record.lexicalProfile).map(([w,n])=>`${w} (${n})`).join(', ') || 'none'}`;
   li.append(heading,p);items.append(li);
 }
}
async function updateRecords(){
 if(!consent.checked){renderRecords([]);return;}
 const records=await send('LIST',{consent:true});renderRecords(records);
 const last=records.at(-1);
 if(last){const receipt=await createAuditReceipt({sourceHash:last.sha256,count:records.length,time:new Date().toISOString()});
  audit.textContent=`Local hash receipt ${receipt.receiptHash}. Network proof: not established. Outbound bytes: unknown. Local storage: IndexedDB / quantaphi-local-mirror-v1.`;
 } else audit.textContent='No local entries. Network proof not established.';
}
function setControls(){saved.disabled=!consent.checked;refresh.disabled=!consent.checked;}
consent.addEventListener('change',async()=>{
 setControls();
 if(consent.checked){message('Local-only mode enabled for this tab. Nothing is uploaded by this card.');try{await updateRecords();}catch(e){message(e.message);}}
 else {renderRecords([]);message('Collection disabled. Existing local snippets remain until you clear them.');}
});
saved.addEventListener('click',async()=>{
 if(!consent.checked)return;
 saved.disabled=true;
 try{const record=await send('STORE',{text:text.value,consent:consent.checked});text.value='';message(`Saved locally. SHA-256: ${record.sha256.slice(0,16)}…`);await updateRecords();}
 catch(e){message(e.message);} finally {setControls();}
});
refresh.addEventListener('click',()=>updateRecords().catch(e=>message(e.message)));
clear.addEventListener('click',async()=>{
 try{await send('CLEAR');renderRecords([]);audit.textContent='Local records cleared. Network proof not established.';message('Local Mirror storage was cleared.');}
 catch(e){message(e.message);}
});
function recordResource(raw, kindOverride){
 const classified=classifyObservedResource(raw,location.origin);
 if(classified.kind==='invalid')return;
 const label=kindOverride||classified.kind;
 const key=classified.domain+'|'+label;
 seen.set(key,(seen.get(key)||0)+1);
 renderRadar();
}
function renderRadar(){
 radar.replaceChildren();
 if(!seen.size){radar.textContent='No observable resource entries yet. This is not a whole-browser network capture.';return;}
 for(const [key,count] of seen){const [domain,kind]=key.split('|');const li=document.createElement('li');
   li.textContent=`${domain} — ${kind} (${count} observed)`;radar.append(li);
 }
}
for(const entry of performance.getEntriesByType('resource'))recordResource(entry.name);
if('PerformanceObserver' in globalThis){
 try{new PerformanceObserver(list=>{for(const entry of list.getEntries()) recordResource(entry.name);}).observe({type:'resource',buffered:true});}
 catch{message('Resource observer unsupported; local vault remains available.');}
}
document.addEventListener('securitypolicyviolation',event=>{
 if(event.blockedURI&&/^https?:/i.test(event.blockedURI))recordResource(event.blockedURI,'CSP-blocked (reported)');
});
setControls();renderRadar();
