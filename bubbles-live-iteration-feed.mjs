/* Visible, receipt-aware Bubbles iteration trail. Each row is a distinct
 * skill-like action with optional user criteria and evidence. Display ONLY:
 * browser observations are not wallet settlement or server proof of a write.
 */
import {newBitSession,applyBitObservation} from './bubbles-bit-session.mjs?v=20261104-credit1';
const TOOL_NAMES=Object.freeze({
 'web.search':['Web','searching sources','search results received'],
 'web.read_page':['Web','reading source page','source page read'],
 'google.search':['Google','searching','search results received'],
 'github.search':['GitHub','searching code','search results received'],
 'github.create_repository':['GitHub','requesting a repository','repository creation result received'],
 'github.read_file':['GitHub','reading a file','file read'],
 'github.read_repository':['GitHub','reading repository','repository read'],
 'github.read_repo':['GitHub','reading repository','repository read'],
 'github.assist':['GitHub','planning and executing authorized repository work','engineering receipt received (verify each action)'],
 'github.capabilities':['GitHub','checking actual GitHub access','GitHub access response received'],
 'github.list_workflows':['GitHub','listing repository workflows','workflow catalog received'],
 'github.list_runs':['GitHub','reading recent workflow results','workflow runs received (outcomes shown separately)'],
 'github.create_pr':['GitHub','opening a reviewed pull request','pull request opened (not merged)'],
 'github.dispatch_workflow':['GitHub','requesting a GitHub Actions run','workflow dispatch accepted (execution pending)'],
 'bubbles.image_read':['Bubbles','reading image','image read'],
 'cloudflare.d1.create':['Cloudflare','creating D1 database','D1 creation reported'],
 'cloudflare.d1.query':['Cloudflare','querying D1','D1 query reported'],
 'cloudflare.d1.write':['Cloudflare','writing D1 records','D1 write reported'],
 // The work pulse is a trail of distinct authenticated-tool observations,
 // never a rhythm-based claim that the Brain moved code or minted currency.
 'github.commit':['GitHub','committing reviewed changes','commit receipt received'],
 'github.update_file':['GitHub','updating reviewed source','source update receipt received'],
 'github.workflow_checks':['GitHub','checking exact-head tests','test results received'],
 'github.test_result':['GitHub','verifying tests','test receipt received'],
 'github.merge_pull_request':['GitHub','merging an approved PR','merge receipt received'],
 'github.pr_merge_receipt':['GitHub','reading PR merge confirmation','merge confirmation received'],
 'cloudflare.worker.stage':['Cloudflare','staging Worker version','staging receipt received'],
 'cloudflare.worker.deploy':['Cloudflare','deploying Worker version','deployment receipt received'],
 'cloudflare.worker.verify':['Cloudflare','checking active Worker version','deployment readback received'],
 'brain.runner_receipt':['Brain','checking signed runner result','runner receipt received']
});
const clean=(v,n=160)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n):'';
const idOkay=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(v);
const TECHNICAL_TOOLS=new Set(['github.create_repository','github.assist','github.capabilities','github.list_workflows','github.list_runs',
 'github.create_pr','github.dispatch_workflow','github.commit','github.update_file','github.workflow_checks',
 'github.test_result','github.merge_pull_request','github.pr_merge_receipt',
 'cloudflare.worker.stage','cloudflare.worker.deploy','cloudflare.worker.verify','brain.runner_receipt']);
const toolTitle=(tool,phase,provider)=>{
 const info=TOOL_NAMES[tool];if(!info)return '';
 const name=tool.startsWith('web.')&&provider==='google'?'Google':info[0];
 return name+' · '+(phase==='complete'?info[2]:phase==='failed'?'action failed':info[1]);
};
export function newLiveBitsState(){return {entries:[],seenReceipts:[],bitState:newBitSession(),contextReady:false,candidates:0,credits:0,sequence:0,live:'Ready for your next request',running:false};}
export function advanceLiveBits(previous,event){
 if(!event||typeof event!=='object')return previous;
 if(event.type==='session_changed')return newLiveBitsState();
 const s={...previous,entries:previous.entries.map(e=>({...e})),seenReceipts:[...previous.seenReceipts]};
 s.bitState=applyBitObservation(previous.bitState||newBitSession(),event);
 s.candidates=s.bitState.candidateCount;s.credits=s.bitState.creditedBits;
 const add=(headline,state,extra={})=>{
  const entry={number:++s.sequence,headline,state,criteria:'',criteriaKey:'',resource:'',detail:'',tool:'',receiptTail:'',...extra};
  s.entries.push(entry);if(s.entries.length>40)s.entries.shift();
  s.live=entry.contextOnly?'Context · '+headline:'Iteration '+entry.number+' · '+headline;
  return entry;
 };
 if(event.type==='turn_started'){
  s.contextReady=false;s.running=true;s.turnStart=s.sequence+1;
  add('Checking saved context for this request','running',{contextOnly:true});return s;
 }
 if(event.type==='memory'){
  s.contextReady=event.state==='retrieved';
  // A completed context read must not leave the prior step marked running.
  const pendingContext=[...s.entries].reverse().find(entry=>entry.contextOnly&&entry.state==='running');
  if(pendingContext)pendingContext.state=event.state==='retrieved'?'observed':'unverified';
  add(event.state==='retrieved'?'Owner context retrieved':'Owner context unavailable',
   event.state==='retrieved'?'observed':'unverified',{contextOnly:true});
  return s;
 }
 if(event.type==='turn_finished'){
  s.running=false;
  const current=s.entries.filter(entry=>entry.number>=(Number.isInteger(s.turnStart)?s.turnStart:1));
  const pendingTool=current.some(entry=>entry.state==='running'&&entry.tool);
  const completedToolCount=current.filter(entry=>entry.tool&&entry.state==='complete').length;
  s.live=event.failed===true?'Reply incomplete · no verified job result':
   pendingTool?'Tool still running · awaiting a verified execution receipt':
   completedToolCount?'Reply received · '+completedToolCount+' confirmed tool receipt'+(completedToolCount===1?'':'s'):
   'Reply received · no tool execution receipt';
  return s;
 }
 if(event.type==='job_step'){
  // Each distinct stage comes only from the authenticated owner ticket read;
  // it is still an observation, not an independently proven code write.
  if(event.source!=='owner_ticket_snapshot')return s;
  const repo=clean(event.repository,95),status=clean(event.status,36);
  if(!/^www-infinity4\/[A-Za-z0-9_.-]{1,80}$/.test(repo))return s;
  if(!['queued','ready','working','blocked','committed_unverified','merged_verified','deployed_verified','complete','completed','superseded'].includes(status))return s;
  const agent=clean(event.agent,40),stage=clean(event.stage,100);
  const summary=clean(event.summary,180);
  const ticketId=clean(event.ticketId,30);
  const runnerJob=clean(event.runnerJob,48);
  // Links come from the verified owner ticket.
  const evidence=typeof event.runUrl==='string'&&
    /^https:\/\/github\.com\/www-infinity4\/[A-Za-z0-9_.-]+\/(?:actions\/runs|pull)\/[0-9]+$/.test(event.runUrl)
    ?event.runUrl:'';
  if(runnerJob&&(event.runnerPhase||status!=='working'))for(const entry of s.entries){
   if(entry.ticketId===ticketId&&entry.runnerJob===runnerJob&&entry.state==='running')entry.state='observed';
  }
  if(typeof event.runnerPhase==='string'&&event.runnerPhase){
   const state=event.runnerPhase==='attempt_failed'?'failed':
    event.runnerPhase.endsWith('_started')&&status==='working'?'running':'observed';
   add(stage,state,{ticketId,runnerJob,resource:repo,detail:summary,tool:'robot_brain.job',url:evidence});
   return s;
  }
  const label=status==='blocked'?'blocked':status==='working'?'working reported (result pending)':status==='deployed_verified'?'deployment recorded':status==='merged_verified'?'merge recorded':status==='committed_unverified'?'commit awaiting verification':status==='ready'||status==='queued'?'waiting for runner':status==='superseded'?'superseded':'result recorded';
  add('GitHub · '+(agent||'Brain')+' · '+label,status==='blocked'?'failed':status==='working'?'running':'observed',{
   ticketId,runnerJob,resource:repo,criteria:stage,detail:summary||'Stage recorded in the owner Brain ledger; result evidence remains separate.',
   tool:'robot_brain.job',receiptTail:'',url:evidence
  });
  return s;
 }
 if(event.type==='job'){
  const repo=clean(event.repository,95),state=clean(event.status,35);
  if(!/^www-infinity4\/[A-Za-z0-9_.-]{1,80}$/.test(repo)||!['queued','ready','working','blocked','committed_unverified','merged_verified','deployed_verified','complete','completed'].includes(state))return s;
  const phrase=state==='queued'||state==='ready'?'runner queued':state==='working'?'runner working':state==='blocked'?'runner blocked':state==='deployed_verified'?'deployment verified by Brain':state==='merged_verified'?'merge verified; deployment pending':'result awaiting independent verification';
  // Identical owner snapshots never create or redraw a progress row.
  const ticketId=clean(event.ticketId,30);
  const signature=ticketId+'|'+repo+'|'+state;
  if(s.lastJobStatus===signature)return previous;
  s.lastJobStatus=signature;
  add('GitHub · '+phrase,state==='blocked'?'failed':state==='working'?'running':'observed',{ticketId,resource:repo,detail:'This reports job state; it does not mint a Bubble Bit or independently verify a deployment.'});
  return s;
 }
 if(!['tool_started','tool_progress','tool_receipt'].includes(event.type))return s;
 const tool=clean(event.tool,75);
 if(!Object.hasOwn(TOOL_NAMES,tool))return s;
 const receipt=clean(event.receiptId,100),opId=idOkay(event.operationId)?event.operationId:'';
 const existing=opId?s.entries.find(e=>e.operationId===opId&&e.tool===tool):null;
 if(event.type==='tool_receipt'&&idOkay(receipt)&&s.seenReceipts.includes(receipt)){
  if(event.credit?.status==='credited'&&s.bitState.creditedReceiptIds.includes(receipt)){
   const row=s.entries.find(e=>e.fullReceiptId===receipt);if(row)row.detail='1 Bubble Bit credited';
  }
  return s;
 }
 if(event.type==='tool_progress'&&!existing)return s; // Don't invent a start from loose progress text.
 const phase=event.type==='tool_receipt'?(event.status==='failed'?'failed':event.status==='complete'&&idOkay(receipt)?'complete':'unverified'):'running';
 const headline=toolTitle(tool,phase,clean(event.provider,30));
 const extra={tool,operationId:opId,criteria:clean(event.criteriaSummary,220),criteriaKey:clean(event.criteriaKey,100),resource:clean(event.resource,140),detail:clean(event.detail,220),fullReceiptId:idOkay(receipt)?receipt:'',receiptTail:idOkay(receipt)?receipt.slice(-8):'',evidenceKind:TECHNICAL_TOOLS.has(tool)?'technical_execution':'activity_observation'};
 let row;
 if(existing){
  Object.assign(existing,{headline,state:phase,criteria:extra.criteria||existing.criteria,criteriaKey:extra.criteriaKey||existing.criteriaKey,resource:extra.resource||existing.resource,detail:extra.detail||existing.detail,receiptTail:extra.receiptTail||existing.receiptTail,fullReceiptId:extra.fullReceiptId||existing.fullReceiptId});
  row=existing;s.live='Iteration '+row.number+' · '+headline;
 }else row=add(headline,phase,extra);
 if(event.type==='tool_receipt'&&idOkay(receipt)&&s.seenReceipts.length<500){
  s.seenReceipts.push(receipt);
 }
 return s;
}

// Mount near the existing small Bubbles chat status. This module never edits
// the assistant, its turn handler, credential flow, wallet, or tool gateway.
// Show the user's requested sequence INSIDE the same Bubbles conversation,
// not next to a detached product card or in another activity panel.
export function mountLiveView(doc=typeof document!=='undefined'?document:null){
 if(!doc)return false;
 const panel=doc.querySelector('.ba-panel');
 const status=panel?.querySelector('.ba-status');
 const conversation=panel?.querySelector('.ba-messages');
 if(!status||!conversation)return false;
 if(panel.querySelector('.ba-current-iteration'))return false;
 const small=doc.createElement('small');
 small.className='ba-current-iteration';
 small.setAttribute('role','status');small.setAttribute('aria-live','polite');
 status.after(small);
 let current=null;
 const jobViews=new Map();
 const begin=()=>{
  current=null;
  small.textContent='Bubbles · checking the request; no GitHub result confirmed yet.';
 };
 const reset=()=>{current=null;jobViews.clear();small.textContent='';};
 const show=(state,ticketId='')=>{
  let view=ticketId?jobViews.get(ticketId):current;
  if(!view){
   const wrapper=doc.createElement('section');
   wrapper.className='ba-line ba-line-ai ba-live-bit-feed';
   wrapper.setAttribute('aria-label','Bubbles iterations for this chat message');
   const heading=doc.createElement('strong');
   heading.className='ba-chat-iteration-title';
   heading.textContent=ticketId?'Repository work in this chat':'Bubbles · working through your request';
   const record=doc.createElement('ol');record.className='ba-live-bit-record';
   const footer=doc.createElement('small');footer.className='ba-chat-iteration-footer';
   wrapper.append(heading,record,footer);
   conversation.append(wrapper);
   view={wrapper,record,footer};
   if(ticketId)jobViews.set(ticketId,view);
   else current=view;
  }
  const {record,footer}=view;
  record.replaceChildren();
  const entries=state.entries.filter(entry=>ticketId?entry.ticketId===ticketId:!entry.ticketId&&entry.number>=state.turnStart);
  for(const entry of entries){
   const li=doc.createElement('li');li.className='ba-live-bit-entry';
   const heading=doc.createElement('strong');
   heading.textContent=entry.contextOnly?'Context · '+entry.headline+' · '+entry.state:
    'Iteration '+entry.number+' · '+entry.headline+' · '+entry.state;
   li.append(heading);
   for(const [label,value] of [['Criteria',entry.criteria],['Repository / resource',entry.resource],
       ['Work performed',entry.detail],['Receipt suffix',entry.receiptTail]]){
    if(!value)continue;
    const valueLine=doc.createElement('small');valueLine.textContent=label+': '+value;li.append(valueLine);
   }
   if(entry.url){
    const link=doc.createElement('a');link.textContent=entry.url.includes('/pull/')?'GitHub pull request':'Verified GitHub run';
    link.href=entry.url;link.target='_blank';link.rel='noopener noreferrer';li.append(link);
   }
   record.append(li);
  }
  footer.hidden=Boolean(ticketId);
  footer.textContent=state.credits+' Bubble Bits confirmed · '+Math.max(0,state.candidates-state.credits)+
   ' receipt candidates pending; no unverified wallet credit.';
  if(!ticketId||!state.running)small.textContent=state.live;
 };
 return {begin,reset,show};
}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&!window.__BubblesLiveBitFeed){
 window.__BubblesLiveBitFeed=true;
 let state=newLiveBitsState(),render=null,turnVisible=false;
 const mount=()=>{render=render||mountLiveView()||null;};
 window.addEventListener('bubbles:iteration',event=>{
  const kind=event?.detail?.type;
  if(kind==='turn_started'){turnVisible=false;mount();render?.begin();}
  if(kind==='session_changed'){turnVisible=false;mount();render?.reset();}
  const next=advanceLiveBits(state,event.detail);
  if(next===state)return;
  state=next;
  mount();
  const ticketId=['job','job_step'].includes(kind)?event.detail.ticketId:'';
  if(ticketId)render?.show(state,ticketId);
  else if(turnVisible)render?.show(state);
 });
 // The user message is appended by the actual Bubbles chat before starting
 // this assistant iteration sequence. Old history replay never emits this.
 window.addEventListener('bubbles:chat-user-visible',()=>{
  if(!state.running)return;
  turnVisible=true;mount();render?.show(state);
 });
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}
