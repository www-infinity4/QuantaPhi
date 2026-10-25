/* Owner-only view. No private snapshots or credentials are saved by this page. */
import {projectLegacyTickets} from './client-model.mjs';
const $=id=>document.getElementById(id);
const API='https://infinity-brain-clock.marvaseater.workers.dev';
let auth=null,rows=[],cursor=null,hasMore=false,selected='',loading=false,inventoryCoverage='';
const statuses={recorded_delivery_evidence:'Recorded proof · recheck needed',completion_needs_receipts:'Completion needs proof',
 awaiting_deployment_proof:'Deployment unverified',stale_working:'Stale working job',
 blocked_recoverable:'Blocked · inspect',owner_decision_required:'Owner decision required',
 ready_to_dispatch:'Ready for runner',working:'Runner working',draft:'Draft',
 failed_recoverable:'Failed · recoverable',needs_inspection:'Needs inspection'};
const TICKET=/^IW-\d{8}-[0-9A-F-]{8}$/,REPO=/^www-infinity4\/[A-Za-z0-9_.-]+$/;
const RUN=/^https:\/\/github\.com\/www-infinity4\/[\w.-]+\/actions\/runs\/[1-9]\d*$/;
const elt=(tag,text,className='')=>{
 const e=document.createElement(tag);
 if(text!==undefined)e.textContent=String(text);
 if(className)e.className=className;
 return e;
};
const prettyRepo=s=>String(s||'').split('/').at(-1)||'Project';
function stat(number,label){const b=elt('div',undefined,'stat');b.append(elt('b',number),elt('span',label));return b;}
function clearPrivateState(){
 rows=[];cursor=null;hasMore=false;selected='';
 for(const id of ['stats','folders','tickets','coverage'])$(id).replaceChildren();
 $('app').classList.add('hide');
}
function draw(){
 $('app').classList.remove('hide');
 const jobs=rows.flatMap(t=>t.jobs||[]),projects=[...new Set(rows.map(t=>t.repository))].sort();
 $('stats').replaceChildren(stat(rows.length,'Saved tickets loaded'),stat(jobs.length,'Jobs to verify'),
  stat(jobs.filter(j=>j.deliveryEvidenceRecorded).length,'Jobs with recorded proof'),stat(jobs.filter(j=>j.approvalRequired).length,'Owner decisions'));
 const folders=$('folders');folders.replaceChildren();
 for(const repo of projects){
  const ts=rows.filter(t=>t.repository===repo);
  const btn=elt('button',undefined,'folder');btn.type='button';btn.setAttribute('aria-pressed',String(repo===selected));
  btn.append(elt('b',prettyRepo(repo)),elt('small',ts.length+' saved tickets'));
  btn.addEventListener('click',()=>{selected=repo;draw();$('listTitle').scrollIntoView({block:'nearest'});});folders.append(btn);
 }
 const output=$('tickets');output.replaceChildren();
 $('listTitle').textContent=selected?prettyRepo(selected)+' · saved work':'Saved work and evidence';
 const showing=rows.filter(t=>!selected||t.repository===selected).sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 if(!showing.length)output.append(elt('p','No saved tickets in this folder on the loaded pages.'));
 for(const t of showing){
  const box=elt('article',undefined,'work');box.append(elt('h3',t.title||t.ticketId),elt('small',t.repository));
  if(t.request){const detail=elt('details');detail.append(elt('summary','Original request'),elt('p',t.request));box.append(detail);}
  for(const j of t.jobs||[]){
   const group=elt('div',undefined,'line');group.append(elt('span',statuses[j.phase]||'Needs inspection','phase'),elt('small',j.jobId||'Ticket-level state'));box.append(group);
   box.append(elt('p',j.next));
   if(j.blocker){const d=elt('details');d.append(elt('summary','Why it stopped'),elt('p',j.blocker));box.append(d);}
   if(j.instructions||j.acceptance?.length){
    const d=elt('details');d.append(elt('summary','Saved instructions and acceptance'),elt('p',j.instructions));
    const checks=elt('ul');for(const x of j.acceptance||[])checks.append(elt('li',x));d.append(checks);box.append(d);
   }
   if(j.missingEvidence?.length)box.append(elt('small','Missing proof: '+j.missingEvidence.join(', ')));
   const actions=elt('div',undefined,'bar');
   if(RUN.test(j.runUrl||'')){const link=elt('a','Open workflow receipt');link.href=j.runUrl;link.target='_blank';link.rel='noopener noreferrer';actions.append(link);}
   if(j.phase==='ready_to_dispatch'&&!j.approvalRequired&&/^TASK-\d+$/.test(j.jobId||'')){
    const btn=elt('button','Resume this authorized job','btn secondary');btn.type='button';
    const status=elt('small','');status.setAttribute('role','status');
    btn.addEventListener('click',()=>dispatch(t.ticketId,j.jobId,btn,status));actions.append(btn,status);
   }
   if(actions.childElementCount)box.append(actions);
  }
  output.append(box);
 }
 $('more').hidden=!hasMore;
 $('coverage').textContent=inventoryCoverage==='potentially_truncated_at_100'?
  'Showing the latest 100 tickets from the legacy Brain endpoint. Older work may be outside this limited list.':
  hasMore?'More saved work remains; load another page for full coverage.':'All saved work on this snapshot has been loaded. Refresh to check for later changes.';
}
async function request(path,data){
 if(!auth?.Authorization)throw Error('Owner connection is not verified. Reload after signing in through Bubbles.');
 const token=auth.Authorization,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{
  const response=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:token},cache:'no-store',signal:controller.signal,body:JSON.stringify(data)});
  const text=await response.text();let result;try{result=JSON.parse(text);}catch{}
  if(auth?.Authorization!==token)throw Error('Owner session changed. Reload to verify again.');
  if(!response.ok||result?.ok===false){
   const error=Error(result?.error||('Brain HTTP '+response.status));
   error.endpointMissing=response.status===404&&(['Not found','Not Found'].includes(text.trim())||result?.error==='not_found');
   if([401,403,404].includes(response.status)&&!error.endpointMissing){auth=null;clearPrivateState();$('connection').textContent='Owner access is no longer verified. Sign in through Bubbles and reload.';}
   throw error;
  }
  if(!result||typeof result!=='object'||Array.isArray(result))throw Error('Robot Brain response could not be read.');
  return result;
 }finally{clearTimeout(timer);}
}
function validateSnapshot(data){
 if(data?.ok!==true||data.service!=='Continuity'||!Array.isArray(data.tickets)||data.tickets.length>100||typeof data.hasMore!=='boolean')throw Error('Invalid saved-work response.');
 if(data.tickets.some(t=>!TICKET.test(t?.ticketId||'')||!REPO.test(t.repository||'')||!Array.isArray(t.jobs)))throw Error('Invalid saved-work record.');
 if(data.hasMore&&(!Number.isSafeInteger(data.nextCursor?.beforeUpdatedAt)||!TICKET.test(data.nextCursor?.beforeId||'')))throw Error('Invalid saved-work cursor.');
 if(data.hasMore&&cursor&&data.nextCursor.beforeId===cursor.beforeId&&data.nextCursor.beforeUpdatedAt===cursor.beforeUpdatedAt)throw Error('Saved-work cursor did not advance.');
}
async function load(reset=false){
 if(loading)return;loading=true;$('error').textContent='';
 $('refresh').disabled=true;$('more').disabled=true;
 if(reset)clearPrivateState();
 try{
  const body={limit:100,...(!reset&&cursor?cursor:{})};let data;
  try{data=await request('/work/continuity',body);}
  catch(error){
   if(!error.endpointMissing||(!reset&&cursor))throw error;
   const saved=await request('/work/tickets/list',{});data=projectLegacyTickets(saved.tickets);
  }
  validateSnapshot(data);inventoryCoverage=data.inventoryCoverage||'';
  const found=new Map(rows.map(t=>[t.ticketId,t]));for(const item of data.tickets)found.set(item.ticketId,item);rows=[...found.values()];
  cursor=data.nextCursor;hasMore=data.hasMore;draw();
 }catch(e){$('error').textContent='Continuity could not confirm your saved state: '+(e.message||'unavailable');}
 finally{loading=false;$('refresh').disabled=false;$('more').disabled=false;}
}
async function dispatch(ticketId,jobId,button,status){
 button.disabled=true;status.textContent='Checking the existing runner…';
 try{
  const result=await request('/work/run-next',{ticketId,jobId});
  const state=result.status||result.state;
  status.textContent=state==='queued_for_runner'?'Runner accepted the request; completion is not verified.':
   state?'Runner result: '+state+'. Refresh for proof of execution.':'Runner returned no execution status. Completion is unverified.';
 }catch(e){status.textContent='Runner not started: '+(e.message||'unavailable');}
 // Avoid a second dispatch from the same control until status has been refreshed.
}
$('refresh').addEventListener('click',()=>load(true));$('more').addEventListener('click',()=>load());
$('showAll').addEventListener('click',()=>{selected='';draw();});
const gate=window.QuantaBrainOwner;
if(!gate?.ready){$('connection').textContent='Existing Robot Brain owner gate is unavailable; no tickets have been requested.';}
else{
 $('connection').textContent='Waiting for existing owner verification. Your saved work stays private.';
 gate.ready.then(headers=>{
  if(typeof headers?.Authorization!=='string'||!headers.Authorization)throw Error('Owner session was not verified.');
  auth={Authorization:headers.Authorization};$('connection').textContent='Owner session verified. Saved work is read from Robot Brain.';load(true);
 }).catch(()=>{clearPrivateState();$('connection').textContent='Owner connection is not available. Sign in through Bubbles and reload.';});
}
