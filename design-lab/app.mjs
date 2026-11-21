import {LANES,ALL_TARGETS,planChain,inferCircuit,runPowerChain} from './power-chain-core.mjs';
const $=id=>document.getElementById(id);
const active=new Set(['collect']);let controller=null,lastReceipt=null,lastPlan=null;
const grid=$('laneGrid');
function e(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
function paintLanes(){
 grid.replaceChildren();
 for(const lane of LANES){
  const b=e('button','lab-lane');b.type='button';b.dataset.lane=lane.id;
  b.setAttribute('aria-pressed',String(active.has(lane.id)));
  const icon=e('span','lab-lane-ic',lane.icon),content=e('div');
  const title=e('span','lab-lane-title');title.append(e('span','',lane.label),e('small','lab-lane-count',lane.domains.length+' sites'));
  content.append(title,e('div','lab-lane-desc',lane.purpose));
  b.append(icon,content);
  b.addEventListener('click',()=>{
   if(controller)return;
   if(active.has(lane.id)){if(active.size===1)return;active.delete(lane.id);}
   else active.add(lane.id);
   paintLanes();preview();
  });
  grid.append(b);
 }
}
function preview(){
 try{
  const plan=planChain({query:$('chainIntent').value,lanes:[...active],limit:$('runDepth').value});
  $('targetCount').textContent=plan.targets.length+' TARGETS';
  if(!controller)$('chainStatus').textContent='Ready to check '+plan.targets.length+' original-source domains in one controlled run.';
 }catch{if(!controller)$('chainStatus').textContent='Enter an intent of at least three characters.';}
}
function applyIntent(){
 if(controller)return;
 const decision=inferCircuit($('chainIntent').value);
 active.clear();decision.lanes.forEach(id=>active.add(id));
 $('intentReason').textContent=decision.reason+' Override any selected lane below.';
 paintLanes();preview();
}
function renderReceipt(data){
 const container=$('chainResults');container.replaceChildren();
 for(const item of data.results){
  const card=e('article','lab-result');
  const host=e('small','',item.target.toUpperCase());
  const a=e('a','',item.title);a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';
  const desc=e('p','',item.snippet||'Open the original source for details.');
  card.append(host,a,desc);container.append(card);
 }
 if(!data.results.length)container.append(e('p','lab-empty','No matching original-source links were returned. Nothing has been fabricated.'));
 $('resultsSection').hidden=false;
}
function logStep(step){
 const host=$('chainLog');const empty=host.querySelector('.lab-empty');if(empty)empty.remove();
 const row=e('div','lab-log-row');row.dataset.status=step.status;
 const mark=e('i','lab-log-dot');mark.setAttribute('aria-hidden','true');
 row.append(mark,e('span','',step.target),e('strong','',step.status==='matched'?step.results+' FOUND':step.status.toUpperCase()));
 host.prepend(row);
}
function counters(checked,matches,total){
 $('countChecked').textContent=String(checked).padStart(2,'0');
 $('countMatches').textContent=String(matches).padStart(2,'0');
 const value=total?Math.min(100,Math.round(100*checked/total)):0;
 $('chainProgress').setAttribute('aria-valuenow',String(value));
 $('chainProgressFill').style.width=value+'%';
}
async function run(){
 if(controller)return;
 let plan;
 try{plan=planChain({query:$('chainIntent').value,lanes:[...active],limit:Number($('runDepth').value)})}
 catch(err){$('chainStatus').textContent=err.message;$('chainIntent').focus();return;}
 lastPlan=plan;lastReceipt=null;controller=new AbortController();
 $('runPower').disabled=true;$('heroPower').disabled=true;$('autoWire').disabled=true;$('runDepth').disabled=true;
 $('stopPower').disabled=false;document.body.classList.add('is-running');
 $('monitorMode').textContent='CHAIN ACTIVE';$('targetCount').textContent=plan.targets.length+' TARGETS';
 $('chainStatus').textContent='Public-index research started. Checking source domains in controlled parallel batches…';
 $('chainLog').replaceChildren();$('chainResults').replaceChildren();$('resultsSection').hidden=true;
 counters(0,0,plan.targets.length);
 try{
  const receipt=await runPowerChain(plan,{signal:controller.signal,onStep:(step,progress)=>{
   logStep(step);counters(progress.completed,progress.matches,progress.total);
   $('chainStatus').textContent=progress.completed+' of '+progress.total+' source checks completed · '+progress.matches+' verified page matches.';
  }});
  lastReceipt=receipt;
  renderReceipt(receipt);
  $('monitorMode').textContent=receipt.stopped?'STOPPED':'RUN COMPLETE';
  $('chainStatus').textContent=(receipt.stopped?'Run stopped. ':'Run finished. ')+receipt.checked+' checked, '+receipt.matchedSources+' source domains matched, '+receipt.found+' links returned, '+receipt.failed+' failed. These are independent public-index lookups.';
 }catch(err){$('monitorMode').textContent='RUN ERROR';$('chainStatus').textContent='Run error: '+String(err?.message||'Unknown failure').slice(0,140);}
 finally{
  controller=null;$('runPower').disabled=false;$('heroPower').disabled=false;$('autoWire').disabled=false;$('runDepth').disabled=false;$('stopPower').disabled=true;
  document.body.classList.remove('is-running');
 }
}
$('runPower').addEventListener('click',()=>void run());
$('heroPower').addEventListener('click',()=>{document.getElementById('workbench').scrollIntoView({behavior:'smooth'});void run()});
$('autoWire').addEventListener('click',applyIntent);
$('stopPower').addEventListener('click',()=>controller?.abort());
$('runDepth').addEventListener('change',preview);
$('chainIntent').addEventListener('input',preview);
$('chainIntent').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();void run()}});
$('copyReceipt').addEventListener('click',async()=>{
 if(!lastReceipt)return;
 const payload={type:'QuantaPhi-Power-Chain-Receipt',version:1,query:lastReceipt.query,lanes:lastPlan?.lanes||[],execution:lastReceipt.execution,directWebsiteHits:0,
 checked:lastReceipt.checked,matchedSources:lastReceipt.matchedSources,found:lastReceipt.found,failed:lastReceipt.failed,stopped:lastReceipt.stopped,finishedAt:lastReceipt.finishedAt,
 sources:lastReceipt.steps,links:lastReceipt.results};
 try{await navigator.clipboard.writeText(JSON.stringify(payload,null,2));$('copyReceipt').textContent='Receipt copied ✓'}
 catch{$('copyReceipt').textContent='Copy unavailable';}
});
const sculpture=$('labSculpture'),scene=sculpture.querySelector('.lab-scene');
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){
 sculpture.addEventListener('pointermove',event=>{
  if(event.pointerType==='touch')return;
  const r=sculpture.getBoundingClientRect(),x=(event.clientX-r.left)/r.width-.5,y=(event.clientY-r.top)/r.height-.5;
  scene.style.setProperty('--rx',(14-y*14).toFixed(1)+'deg');
  scene.style.setProperty('--ry',(-17+x*22).toFixed(1)+'deg');
 });
 sculpture.addEventListener('pointerleave',()=>{scene.style.removeProperty('--rx');scene.style.removeProperty('--ry');});
}
paintLanes();preview();
