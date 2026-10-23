import {saveSourceProposal} from './ledger.mjs';
import {normalizeCard,placementRequest,TOOLS} from './model.mjs';
import {mountCard} from './runtime.mjs';
const $=id=>document.getElementById(id),key='quantaphi:card-workshop:v1';
let saved;try{saved=JSON.parse(localStorage.getItem(key)||'null')}catch{}
let card=saved?.card||null,cloud=saved?.cloud||null,unmount=null,files=null;
const status=message=>{$('status').textContent=message};
const persist=()=>localStorage.setItem(key,JSON.stringify({card,cloud}));
function display(){if(!card)return;$('definition').value=JSON.stringify(card,null,2);unmount?.();unmount=mountCard($('preview'),card);$('save').disabled=$('export').disabled=$('placement').disabled=false}
async function sources(){
 card=normalizeCard(JSON.parse($('definition').value));
 const entries=await Promise.all(['model.mjs','runtime.mjs'].map(async name=>{const r=await fetch('./'+name);if(!r.ok)throw Error('Card runtime unavailable');return [name,await r.text()]}));
 return {...Object.fromEntries(entries),'card.json':JSON.stringify(card,null,2),
  'index.html':'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>My intelligent card</title><link rel="stylesheet" href="https://quantaphi.org/oracle-octaves.css"><main id="card"></main><script type="module">import {mountCard} from "./runtime.mjs";const r=await fetch("./card.json");mountCard(document.getElementById("card"),await r.json());</script></html>',
  'README.md':'# '+card.title+'\n\nFree Bubbles repository card. Serve these files over HTTPS. Refresh uses the QuantaPhi Bubbles tools API; the public read-only feed endpoint supports cards hosted on your own HTTPS origin. No credentials are included.\n\nAdvertising placement on QuantaPhi costs 1,000 StarCoins separately. Export and repository saves do not pay or publish an advertisement.\n'};
}
async function cloudCall(path,body){
 const bridge=window.QuantaCloudConnection||window.StarQuestCloudLedger;
 if(!bridge?.authenticatedFetch)throw Error('Sign in to your QuantaPhi wallet to save your repository');
 const response=await bridge.authenticatedFetch('https://quanta-phi-ledger.marvaseater.workers.dev/v1/projects'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
 const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Repository save failed');return data;
}
$('build').onclick=async()=>{
 $('build').disabled=true;status('Building your card definition…');
 try{const r=await fetch(TOOLS+'/v1/cards/plan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({request:$('request').value}),signal:AbortSignal.timeout(60000)});const data=await r.json();if(!r.ok||!data.ok)throw Error(data.error||'AI builder unavailable');card=normalizeCard(data.card);cloud=null;persist();display();status('Card built. Preview and edit it below. Creation fee: 0 StarCoins.')}
 catch(error){status(error.message)}finally{$('build').disabled=false}
};
$('apply').onclick=()=>{try{card=normalizeCard(JSON.parse($('definition').value));cloud=null;persist();display();status('Preview updated. Save this revision when ready.')}catch(error){status(error.message)}};
$('save').onclick=async()=>{
 $('save').disabled=true;
 try{
  files=await sources();const fingerprint=JSON.stringify(files);
  if(!cloud){cloud={createRequest:crypto.randomUUID(),title:card.title};persist()}
  if(!cloud.id){const d=await cloudCall('',{title:cloud.title,requestId:cloud.createRequest});cloud.id=d.project.id;cloud.head=d.project.head;persist()}
  if(cloud.pending&&cloud.pending.fingerprint!==fingerprint)throw Error('Retry the pending unchanged save before editing this card');
  if(!cloud.pending){cloud.pending={requestId:crypto.randomUUID(),expectedHead:cloud.head,fingerprint};persist()}
  const d=await cloudCall('/'+cloud.id+'/revisions',{requestId:cloud.pending.requestId,expectedHead:cloud.pending.expectedHead,files});cloud.head=d.revisionId;delete cloud.pending;persist();
  status('Saved to your private Bubbles source repository. Revision '+d.revisionId.slice(0,16)+'. Fee: 0 StarCoins.');
 }catch(error){status(error.message)}finally{$('save').disabled=false}
};
function download(data,name){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('export').onclick=async()=>{try{files=await sources();download({format:'quantaphi-card-source-v1',files},'bubbles-card-source.json');status('Source package exported for your repository. No advertising fee charged.')}catch(error){status(error.message)}};
$('placement').onclick=()=>{try{card=normalizeCard(JSON.parse($('definition').value));download(placementRequest(card,cloud?.head||null),'quantaphi-advertising-request.json');status('Advertising request prepared: 1,000 StarCoins for QuantaPhi placement. Checkout is not connected here; no payment or publication occurred.')}catch(error){status(error.message)}};
if(card)display();

let sourcePending=null;
$('sourceSave').onclick=async()=>{
 $('sourceSave').disabled=true;
 try{
  const proposal={provider:$('sourceProvider').value,sourceUrl:$('sourceUrl').value,amountMinor:Number($('sourceAmount').value),currency:'STARCOIN',usage:'excerpt',cardId:cloud?.id||''};
  const raw=JSON.stringify(proposal);
  if(sourcePending&&sourcePending.raw!==raw)throw Error('Retry the pending unchanged source proposal first');
  if(!sourcePending)sourcePending={raw,record:{requestId:crypto.randomUUID(),...proposal}};
  const entry=await saveSourceProposal(sourcePending.record);sourcePending=null;
  $('sourceStatus').textContent='Saved source proposal '+entry.id+'. Agreement and recipient unverified. No payment sent.';
 }catch(error){$('sourceStatus').textContent=error.message}finally{$('sourceSave').disabled=false}
};
