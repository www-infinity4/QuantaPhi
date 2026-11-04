/* Visible, receipt-aware Bubbles iteration trail. Each row is a distinct
 * skill-like action with optional user criteria and evidence. Display ONLY:
 * browser observations are not wallet settlement or server proof of a write.
 */
const TOOL_NAMES=Object.freeze({
 'web.search':['Web','searching sources','search results received'],
 'web.read_page':['Web','reading source page','source page read'],
 'google.search':['Google','searching','search results received'],
 'github.search':['GitHub','searching code','search results received'],
 'github.read_file':['GitHub','reading a file','file read'],
 'github.read_repository':['GitHub','reading repository','repository read'],
 'github.read_repo':['GitHub','reading repository','repository read'],
 'bubbles.image_read':['Bubbles','reading image','image read'],
 'cloudflare.d1.create':['Cloudflare','creating D1 database','D1 creation reported'],
 'cloudflare.d1.query':['Cloudflare','querying D1','D1 query reported'],
 'cloudflare.d1.write':['Cloudflare','writing D1 records','D1 write reported']
});
const clean=(v,n=160)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n):'';
const idOkay=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,100}$/.test(v);
const toolTitle=(tool,phase,provider)=>{
 const info=TOOL_NAMES[tool];if(!info)return '';
 const name=tool.startsWith('web.')&&provider==='google'?'Google':info[0];
 return name+' · '+(phase==='complete'?info[2]:phase==='failed'?'action failed':info[1]);
};
export function newLiveBitsState(){return {entries:[],seenReceipts:[],contextReady:false,candidates:0,credits:0,sequence:0,live:'Ready for your next request',running:false};}
export function advanceLiveBits(previous,event){
 if(!event||typeof event!=='object')return previous;
 if(event.type==='session_changed')return newLiveBitsState();
 const s={...previous,entries:previous.entries.map(e=>({...e})),seenReceipts:[...previous.seenReceipts]};
 const add=(headline,state,extra={})=>{
  const entry={number:++s.sequence,headline,state,criteria:'',criteriaKey:'',resource:'',detail:'',tool:'',receiptTail:'',...extra};
  s.entries.push(entry);if(s.entries.length>40)s.entries.shift();
  s.live='Iteration '+entry.number+' · '+headline;
  return entry;
 };
 if(event.type==='turn_started'){
  s.contextReady=false;s.running=true;
  add('Checking saved context for this request','running');return s;
 }
 if(event.type==='memory'){
  s.contextReady=event.state==='retrieved';
  add(event.state==='retrieved'?'Owner context retrieved':'Owner context unavailable','observed');
  return s;
 }
 if(event.type==='turn_finished'){
  s.running=false;
  s.live=event.failed===true?'Reply failed · review the chat status':'Reply ready · '+s.sequence+' observed iterations';
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
  // Only show exact HTTPS GitHub run URLs from the validated owner ticket.
  const evidence=typeof event.runUrl==='string'&&
    /^https:\/\/github\.com\/www-infinity4\/[A-Za-z0-9_.-]+\/actions\/runs\/[0-9]+$/.test(event.runUrl)
    ?event.runUrl:'';
  const label=status==='blocked'?'blocked':status==='working'?'working reported (result pending)':status==='deployed_verified'?'deployment recorded':status==='merged_verified'?'merge recorded':status==='committed_unverified'?'commit awaiting verification':status==='ready'||status==='queued'?'waiting for runner':status==='superseded'?'superseded':'result recorded';
  add('GitHub · '+(agent||'Brain')+' · '+label,status==='blocked'?'failed':status==='working'?'running':'observed',{
   resource:repo,criteria:stage,detail:summary||'Stage recorded in the owner Brain ledger; result evidence remains separate.',
   tool:'robot_brain.job',receiptTail:'',url:evidence
  });
  return s;
 }
 if(event.type==='job'){
  const repo=clean(event.repository,95),state=clean(event.status,35);
  if(!/^www-infinity4\/[A-Za-z0-9_.-]{1,80}$/.test(repo)||!['queued','ready','working','blocked','committed_unverified','merged_verified','deployed_verified','complete','completed'].includes(state))return s;
  const phrase=state==='queued'||state==='ready'?'runner queued':state==='working'?'runner working':state==='blocked'?'runner blocked':state==='deployed_verified'?'deployment verified by Brain':state==='merged_verified'?'merge verified; deployment pending':'result awaiting independent verification';
  // The ticket is polled every 15 seconds. Identical state is one iteration.
  const signature=repo+'|'+state;
  if(s.lastJobStatus===signature)return s;
  s.lastJobStatus=signature;
  add('GitHub · '+phrase,state==='blocked'?'failed':state==='working'?'running':'observed',{resource:repo,detail:'This reports job state; it does not mint a Bubble Bit or independently verify a deployment.'});
  return s;
 }
 if(!['tool_started','tool_progress','tool_receipt'].includes(event.type))return s;
 const tool=clean(event.tool,75);
 if(!Object.hasOwn(TOOL_NAMES,tool))return s;
 const receipt=clean(event.receiptId,100),opId=idOkay(event.operationId)?event.operationId:'';
 const existing=opId?s.entries.find(e=>e.operationId===opId&&e.tool===tool):null;
 if(event.type==='tool_receipt'&&idOkay(receipt)&&s.seenReceipts.includes(receipt))return s;
 if(event.type==='tool_progress'&&!existing)return s; // Don't invent a start from loose progress text.
 const phase=event.type==='tool_receipt'?(event.status==='complete'?'complete':event.status==='failed'?'failed':'unverified'):'running';
 const headline=toolTitle(tool,phase,clean(event.provider,30));
 const extra={tool,operationId:opId,criteria:clean(event.criteriaSummary,220),criteriaKey:clean(event.criteriaKey,100),resource:clean(event.resource,140),detail:clean(event.detail,220),receiptTail:idOkay(receipt)?receipt.slice(-8):''};
 let row;
 if(existing){
  Object.assign(existing,{headline,state:phase,criteria:extra.criteria||existing.criteria,criteriaKey:extra.criteriaKey||existing.criteriaKey,resource:extra.resource||existing.resource,detail:extra.detail||existing.detail,receiptTail:extra.receiptTail||existing.receiptTail});
  row=existing;s.live='Iteration '+row.number+' · '+headline;
 }else row=add(headline,phase,extra);
 if(event.type==='tool_receipt'&&idOkay(receipt)&&s.seenReceipts.length<500){
  s.seenReceipts.push(receipt);
  if(phase==='complete'&&s.contextReady)s.candidates++;
 }
 return s;
}

// Mount near the existing small Bubbles chat status. This module never edits
// the assistant, its turn handler, credential flow, wallet, or tool gateway.
function mountLiveView(){
 if(typeof document==='undefined')return;
 const status=document.querySelector('#bubblesAICard .ba-status');
 if(!status||document.querySelector('#bubblesAICard .ba-live-bit-feed'))return false;
 const wrapper=document.createElement('section');wrapper.className='ba-live-bit-feed';wrapper.setAttribute('aria-label','Current Bubbles iteration');
 const line=document.createElement('div');line.className='ba-live-bit-line';line.setAttribute('role','status');line.setAttribute('aria-live','polite');
 const disclosure=document.createElement('details');disclosure.className='ba-live-bit-details';
 const summary=document.createElement('summary');summary.textContent='Iteration details';
 const record=document.createElement('ol');record.className='ba-live-bit-record';
 disclosure.append(summary,record);wrapper.append(line,disclosure);status.after(wrapper);
 return state=>{
  line.textContent=state.live+' · '+state.candidates+' receipt candidate'+(state.candidates===1?'':'s');
  record.replaceChildren();
  for(const entry of state.entries){
   const li=document.createElement('li');li.className='ba-live-bit-entry';
   const heading=document.createElement('strong');heading.textContent='Iteration '+entry.number+' · '+entry.headline+' ('+entry.state+')';li.append(heading);
   for(const [label,value] of [['Criteria',entry.criteria],['Criteria key',entry.criteriaKey],['Resource',entry.resource],['Detail',entry.detail],['Tool',entry.tool],['Receipt suffix',entry.receiptTail]]){
    if(!value)continue;
    const small=document.createElement('small');small.textContent=label+': '+value;li.append(small);
   }
   if(entry.url){
    const link=document.createElement('a');link.textContent='Inspect actual GitHub run';
    link.href=entry.url;link.target='_blank';link.rel='noopener noreferrer';li.append(link);
   }
   record.append(li);
  }
  summary.textContent='Iteration details · '+state.entries.length+' steps · 0 wallet credits';
 };
}
if(typeof window!=='undefined'&&typeof document!=='undefined'&&!window.__BubblesLiveBitFeed){
 window.__BubblesLiveBitFeed=true;
 let state=newLiveBitsState(),render=null;
 const mount=()=>{
  render=render||mountLiveView()||null;
  if(render)render(state);
 };
 window.addEventListener('bubbles:iteration',event=>{state=advanceLiveBits(state,event.detail);mount();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}
