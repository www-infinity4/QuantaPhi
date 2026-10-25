/* Continuity owner UI. Uses the same first-party verified owner session as Bubbles. */
const $=id=>document.getElementById(id);
const API='https://infinity-brain-clock.marvaseater.workers.dev';
let auth=null,rows=[],cursor=null,hasMore=false,selected='',loading=false;
const statuses={verified_delivery:'Verified delivery',completion_needs_receipts:'Completion needs proof',
 awaiting_deployment_proof:'Deployment unverified',stale_working:'Stale working job',
 blocked_recoverable:'Blocked · inspect',owner_decision_required:'Owner decision required',
 ready_to_dispatch:'Ready for runner',working:'Runner working',draft:'Draft',
 failed_recoverable:'Failed · recoverable',needs_inspection:'Needs inspection'};
const elt=(tag,text,className='')=>{
 const e=document.createElement(tag);
 if(text!==undefined)e.textContent=String(text);
 if(className)e.className=className;
 return e;
};
const prettyRepo=s=>String(s||'').split('/').at(-1)||'Project';
function stat(number,label){
 const b=elt('div',undefined,'stat');b.append(elt('b',number),elt('span',label));return b;
}
function draw(){
 $('app').classList.remove('hide');
 const jobs=rows.flatMap(t=>t.jobs||[]),projects=[...new Set(rows.map(t=>t.repository))].sort();
 const saved=rows.length,verified=jobs.filter(j=>j.verifiedDelivery).length,
 unresolved=jobs.filter(j=>!j.verifiedDelivery).length,
 decisions=jobs.filter(j=>j.approvalRequired).length;
 $('stats').replaceChildren(stat(saved,'Saved tickets loaded'),stat(unresolved,'Jobs still unverified'),
  stat(verified,'Jobs with recorded proof'),stat(decisions,'Owner decisions to review'));
 const folders=$('folders');folders.replaceChildren();
 for(const repo of projects){
  const ts=rows.filter(t=>t.repository===repo),open=ts.flatMap(t=>t.jobs||[]).filter(j=>!j.verifiedDelivery).length;
  const btn=elt('button',undefined,'folder');btn.type='button';btn.setAttribute('aria-pressed',String(repo===selected));
  btn.append(elt('b','▣ '+prettyRepo(repo)),elt('small',ts.length+' tickets · '+open+' unverified jobs'));
  btn.addEventListener('click',()=>{selected=repo;draw();$('listTitle').scrollIntoView({block:'nearest'});});
  folders.append(btn);
 }
 const output=$('tickets');output.replaceChildren();
 $('listTitle').textContent=selected?prettyRepo(selected)+' · saved work':'Unfinished work';
 const showing=rows.filter(t=>!selected||t.repository===selected)
  .sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
 if(!showing.length)output.append(elt('p','No saved tickets in this folder on the loaded pages.'));
 for(const t of showing){
  const box=elt('article',undefined,'work');box.append(elt('h3',t.title||t.ticketId),elt('small',t.repository));
  const jobs=t.jobs||[];
  for(const j of jobs){
   const group=elt('div',undefined,'line'),badge=elt('span',statuses[j.phase]||j.phase,'phase'+(j.verifiedDelivery?' verified':''));
   group.append(badge,elt('small',j.jobId||'Ticket-level state'));box.append(group);
   const next=elt('p',j.next);box.append(next);
   if(j.blocker){const d=elt('details');d.append(elt('summary','Why it stopped'),elt('p',j.blocker));box.append(d);}
   if(j.missingEvidence?.length)box.append(elt('small','Missing proof: '+j.missingEvidence.join(', ')));
   const actions=elt('div',undefined,'bar');
   if(j.runUrl){
    const link=elt('a','Open actual workflow receipt');link.href=j.runUrl;link.target='_blank';link.rel='noopener noreferrer';actions.append(link);
   }
   if(j.phase==='ready_to_dispatch' && j.jobId){
    const btn=elt('button','Resume this authorized job','btn secondary');btn.type='button';
    const status=elt('small','');status.setAttribute('role','status');
    btn.addEventListener('click',()=>dispatch(t.ticketId,j.jobId,btn,status));
    actions.append(btn,status);
   }
   if(actions.childElementCount)box.append(actions);
  }
  output.append(box);
 }
 $('more').hidden=!hasMore;
 $('coverage').textContent=hasMore?'More saved work remains. Load the next page before treating this as the whole backlog.':'All pages fetched in this view.';
}
async function request(path,data){
 if(!auth?.Authorization)throw Error('Owner connection is not verified.');
 const response=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json',...auth},cache:'no-store',body:JSON.stringify(data)});
 let result;try{result=await response.json();}catch{throw Error('Robot Brain response could not be read.');}
 if(!response.ok||result.ok===false)throw Error(result.error||('Brain HTTP '+response.status));
 return result;
}
async function load(reset=false){
 if(loading)return;loading=true;$('error').textContent='';
 $('refresh').disabled=true;$('more').disabled=true;
 try{
  const body={limit:100,...(!reset&&cursor?cursor:{})},data=await request('/work/continuity',body);
  if(reset){rows=[];selected='';}
  const seen=new Set(rows.map(t=>t.ticketId));
  for(const item of data.tickets||[]){if(!seen.has(item.ticketId)){rows.push(item);seen.add(item.ticketId);}}
  cursor=data.nextCursor;hasMore=data.hasMore===true;draw();
 }catch(e){$('error').textContent='Continuity could not confirm your saved state: '+(e.message||'unavailable');}
 finally{loading=false;$('refresh').disabled=false;$('more').disabled=false;}
}
async function dispatch(ticketId,jobId,button,status){
 button.disabled=true;status.textContent='Checking the existing runner…';
 try{
  const result=await request('/work/run-next',{ticketId,jobId});
  const state=result.status||result.state||'unverified';
  status.textContent=state==='queued_for_runner'?'Runner accepted the request; completion is not verified.':
    'Runner result: '+state+'. Refresh for proof of execution.';
 }catch(e){status.textContent='Runner not started: '+(e.message||'unavailable');}
 finally{button.disabled=false;}
}
$('refresh').addEventListener('click',()=>load(true));
$('more').addEventListener('click',()=>load());
$('showAll').addEventListener('click',()=>{selected='';draw();});
const gate=window.QuantaBrainOwner;
if(!gate?.ready){$('connection').textContent='Existing Robot Brain owner gate is unavailable; no tickets have been requested.';}
else{
 $('connection').textContent='Waiting for existing owner verification. Your saved work stays private.';
 gate.ready.then(headers=>{
  if(!headers?.Authorization)throw Error('Owner session was not verified.');
  auth=headers;
  $('connection').textContent='Owner session verified. Saved work is loaded from Robot Brain.';
  load(true);
 }).catch(e=>{$('connection').textContent='Owner connection is not available: '+(e.message||'retry through Bubbles');});
}
