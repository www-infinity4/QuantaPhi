import {DEFAULT_PILOT,PILOT_FIELDS,normalizePilot,readiness,manifest} from '/cellular/network-plan.mjs?v=20261015-radio1';
const KEY='infinity-cellular:pilot:v1';
const $=id=>document.getElementById(id);
const status=id=>$(id);
function saved(){
 try{const row=JSON.parse(localStorage.getItem(KEY)||'null');return normalizePilot(row||DEFAULT_PILOT)}
 catch{return normalizePilot(DEFAULT_PILOT)}
}
function makeChecks(){
 const target=$('checks');target.replaceChildren();
 for(const row of PILOT_FIELDS){
  const label=document.createElement('label');label.className='check';
  const box=document.createElement('input');box.type='checkbox';box.dataset.key=row.key;
  const span=document.createElement('span');span.textContent=row.label;
  label.append(box,span);target.append(label);
  box.addEventListener('change',render);
 }
}
function collect(){
 const out={...DEFAULT_PILOT};
 for(const row of PILOT_FIELDS)out[row.key]=$('checks').querySelector('[data-key="'+row.key+'"]').checked;
 out.permittedBackhaul=$('backhaul').value;
 out.testSiteDescription=$('pilot-site').value;
 out.labNotes=$('notes').value;
 return normalizePilot(out);
}
function paint(pilot){
 for(const row of PILOT_FIELDS)$('checks').querySelector('[data-key="'+row.key+'"]').checked=pilot[row.key];
 $('backhaul').value=pilot.permittedBackhaul;
 $('pilot-site').value=pilot.testSiteDescription;
 $('notes').value=pilot.labNotes;
 render();
}
function render(){
 const result=readiness(collect());
 $('progress').textContent=result.completed+' of '+result.total+' requirements marked — '+(result.readiness==='not_ready'?'not ready':'operator claims complete; independently unverified');
 const list=$('outstanding');list.replaceChildren();
 if(!result.remaining.length){
  const p=document.createElement('p');p.textContent='All boxes are marked. This does NOT mean the network is live: independent site acceptance, SAS credentials and real SIM attach/WAN tests still require verification.';
  list.append(p);return;
 }
 const p=document.createElement('p');p.textContent='Still needed:';const ul=document.createElement('ul');
 for(const need of result.remaining){const li=document.createElement('li');li.textContent=need;ul.append(li)}
 list.append(p,ul);
}
function write(){
 try{localStorage.setItem(KEY,JSON.stringify(collect()));$('diag-notes').textContent='Engineering notes saved on this device. No network configuration was changed.';}
 catch{$('diag-notes').textContent='Local storage unavailable. Export a copy of your plan.';}
}
function exportPlan(){
 const file=JSON.stringify(manifest(collect()),null,2);
 const blob=new Blob([file],{type:'application/json'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download='Infinity-Cellular-Private-LTE-Pilot.json';a.rel='noopener';
 document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function setReachability(id,state,message){
 const node=status(id);node.textContent=message;node.classList.toggle('online',state===true);node.classList.toggle('offline',state===false);
}
async function probe(id,url,predicate){
 setReachability(id,null,'Checking…');
 const start=performance.now();
 const ctrl=new AbortController();const timer=setTimeout(()=>ctrl.abort(),8000);
 try{
  const response=await fetch(url,{cache:'no-store',signal:ctrl.signal});
  const data=await response.json();
  if(!response.ok||!predicate(data))throw Error('service did not confirm a healthy response');
  setReachability(id,true,'Reachable · '+Math.max(1,Math.round(performance.now()-start))+' ms via current connection');
 }catch{setReachability(id,false,'Not reachable on current connection')}
 finally{clearTimeout(timer)}
}
async function checkConnections(){
 $('check-connections').disabled=true;
 try{
  await Promise.all([
   probe('site-health','/health',d=>d?.ok===true&&d?.service==='quantaphi-site'),
   probe('switch-health','https://infinity-switchboard.marvaseater.workers.dev/health',d=>d?.ok===true&&d?.service==='infinity-platinum-switchboard')
  ]);
  $('diag-notes').textContent='Only website reachability was checked. Your phone may have used LTE, Wi-Fi or another existing connection. There is no deployed Infinity radio to verify yet.';
 }finally{$('check-connections').disabled=false}
}
makeChecks();paint(saved());
$('pilot-form').addEventListener('submit',e=>e.preventDefault());
$('pilot-form').addEventListener('input',render);
$('save').addEventListener('click',write);
$('export').addEventListener('click',exportPlan);
$('check-connections').addEventListener('click',checkConnections);
checkConnections();
