/* Bubbles iteration lenses: one assistant, separate truthful activity bubbles.
 * Browser-only display; never a tool/permission grant, hidden reasoning stream,
 * wallet operation, extra floating assistant, or independent agent executor.
 */
import {newBitSession,applyBitObservation} from './bubbles-bit-session.mjs?v=20261101-bits1';
export const BUBBLE_ROLES=Object.freeze([
 {id:'listen',label:'Listen',help:'Actual voice capture state from the Bubbles orb.'},
 {id:'think',label:'Think',help:'A response is being processed. Private model reasoning is not displayed.'},
 {id:'memory',label:'Memory',help:'Owner-scoped prior context retrieval, not permission for new work.'},
 {id:'research',label:'Research',help:'Observed tool receipts. No search is claimed before a receipt.'},
 {id:'build',label:'Build',help:'Authenticated Robot Brain work status, not a simulated code writer.'},
 {id:'verify',label:'Verify',help:'A write is not finished until its actual verification status is recorded.'},
 {id:'speak',label:'Speak',help:'The active speech playback state of the same assistant.'}
]);
const STATES=new Set(['idle','active','queued','review','verified','blocked']);
const WORK_STATES=new Set(['queued','ready','working','blocked','committed_unverified','merged_verified','deployed_verified','completed','complete','superseded']);
const TOOL=/^(?:web\.search|web\.read_page|github\.(?:search|read_file|read_repo)|bubbles\.(?:image_read|browser_read|github_research))$/;
const REPO=/^www-infinity4\/[a-zA-Z0-9_.-]{1,80}$/;
function checkedUrl(raw){
 try{const u=new URL(raw);return u.origin==='https://github.com'&&!u.username&&!u.password&&!u.search&&!u.hash&&
  /^\/www-infinity4\/[a-zA-Z0-9_.-]+\/(?:pull|commit|actions|issues)\/[a-zA-Z0-9/_-]+$/.test(u.pathname)?u.href:''}catch{return ''}
}
export function newIterationState(){
 return Object.fromEntries(BUBBLE_ROLES.map(x=>[x.id,{status:'idle',message:'No observed activity yet.',url:''}]));
}
export function applyIterationEvent(previous,event){
 const state={...previous};
 if(!event||typeof event!=='object')return state;
 const set=(id,status,message,url='')=>{
  if(!STATES.has(status))return;
  state[id]={status,message,url:checkedUrl(url)};
 };
 if(event.type==='orb'){
  const value=String(event.state||'');
  set('listen',['listening','hearing'].includes(value)?'active':'idle',
   ['listening','hearing'].includes(value)?'Microphone listening.':'Not capturing speech.');
  set('think',['thinking','busy'].includes(value)?'active':'idle',
   ['thinking','busy'].includes(value)?'Processing the current request; no hidden thoughts exposed.':'No request processing observed.');
  set('speak',value==='speaking'?'active':'idle',value==='speaking'?'Speaking a reply.':'Not speaking.');
 }else if(event.type==='memory'){
  set('memory',event.state==='retrieved'?'verified':'blocked',
   event.state==='retrieved'?'Owner context retrieved for this turn. This does not authorize actions.':'Owner context not available for this turn.');
 }else if(event.type==='tool_receipt'){
  const tool=String(event.tool||'');
  if(!TOOL.test(tool))return state;
  const status=event.status==='complete'?'verified':event.status==='failed'?'blocked':'review';
  set('research',status,tool+' · '+(status==='verified'?'completed with a tool receipt':status==='blocked'?'failed':'result not verified'));
 }else if(event.type==='job'){
  if(!WORK_STATES.has(event.status)||!REPO.test(event.repository||''))return state;
  const repo=event.repository;
  if(event.status==='queued'||event.status==='ready')set('build','queued',repo+' · waiting for a runner',event.url);
  else if(event.status==='working')set('build','active',repo+' · runner marked working; outcome pending',event.url);
  else if(event.status==='blocked')set('build','blocked',repo+' · blocked; no completion claimed',event.url);
  else if(event.status==='deployed_verified'){
   set('build','verified',repo+' · deployment verified by Brain',event.url);
   set('verify','verified',repo+' · verified deployment receipt',event.url);
  }else if(event.status==='merged_verified'){
   set('build','review',repo+' · merged; deployment still unverified',event.url);
   set('verify','verified',repo+' · merge verified, not live deployment',event.url);
  }else if(event.status==='committed_unverified'||event.status==='complete'||event.status==='completed'){
   set('build','review',repo+' · code/result awaiting independent verification',event.url);
   set('verify','review',repo+' · verification still required',event.url);
  }
 }
 return state;
}
export function mountBubbleIterations({launcher,panel,status}={}){
 if(typeof document==='undefined'||!launcher||!panel||!status)return false;
 if(panel.querySelector('.ba-iteration-bubbles'))return true;
 const create=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text)el.textContent=text;return el};
 const box=create('section','ba-iteration-bubbles');box.setAttribute('aria-label','Bubbles iteration activity');
 const title=create('div','ba-iteration-heading');
 title.append(create('strong','','Bubbles · live iteration'),create('small','','One assistant · seven activity roles'));
 const buttons=create('div','ba-iteration-row');
 const details=create('p','ba-iteration-detail');details.setAttribute('role','status');details.setAttribute('aria-live','polite');
 const nodes=new Map();let selected='think',state=newIterationState(),bitsState=newBitSession();
 const labels={idle:'Idle',active:'Active',queued:'Queued',review:'Review',verified:'Verified',blocked:'Blocked'};
 for(const role of BUBBLE_ROLES){
  const button=create('button','ba-iteration-button');
  button.type='button';button.dataset.role=role.id;button.setAttribute('aria-label',role.label+' activity');
  button.append(create('span','ba-iteration-orb'),create('span','ba-iteration-name',role.label),create('small','ba-iteration-state','Idle'));
  button.addEventListener('click',()=>{selected=role.id;render()});
  buttons.append(button);nodes.set(role.id,button);
 }
 const bitPanel=create('section','ba-iteration-bits');bitPanel.setAttribute('aria-label','Bubbles Bits verified action candidates');
 const bitHeading=create('strong','','Bubbles Bits · verified source actions');
 const bitCount=create('span','ba-bits-count','0 candidates · 0 credited');
 const bitNote=create('small','ba-bits-note','Wallet settlement unavailable. These are receipt observations, not spendable credits.');
 const bitRecent=create('div','ba-bits-recent');
 bitPanel.append(bitHeading,bitCount,bitNote,bitRecent);
 box.append(title,buttons,details,bitPanel);status.after(box);
 function render(){
  for(const role of BUBBLE_ROLES){
   const button=nodes.get(role.id),item=state[role.id];
   button.dataset.status=item.status;button.setAttribute('aria-pressed',String(role.id===selected));
   button.querySelector('.ba-iteration-state').textContent=labels[item.status];
  }
  bitCount.textContent=bitsState.candidateCount+' candidate'+(bitsState.candidateCount===1?'':'s')+' · 0 credited · 0 spendable';
  bitNote.textContent=bitsState.contextReady
    ?'Owner context checked. Candidate receipts are not wallet credits.'
    :'Owner context not verified this turn. Later actions will not count until checked.';
  bitRecent.replaceChildren();
  for(const item of bitsState.recent.slice(0,3))bitRecent.append(create('span','ba-bits-proof',item.tool+' · receipt …'+item.receiptTail));
  const role=BUBBLE_ROLES.find(x=>x.id===selected),item=state[selected];
  details.replaceChildren(create('strong','',role.label+': '+labels[item.status]+'. '),document.createTextNode(item.message+' '+role.help));
  if(item.url){const a=create('a','',' View receipt');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';details.append(a)}
 }
 function update(event){state=applyIterationEvent(state,event);bitsState=applyBitObservation(bitsState,event);render()}
 const observer=new MutationObserver(()=>update({type:'orb',state:launcher.dataset.state}));
 observer.observe(launcher,{attributes:true,attributeFilter:['data-state']});
 window.addEventListener('bubbles:iteration',event=>update(event.detail));
 window.addEventListener('quantaphi:robot-directions',event=>{
  const jobs=Array.isArray(event.detail?.jobs)?event.detail.jobs:[];
  const repo=jobs.find(x=>REPO.test(x.repository||''))?.repository;
  if(repo)update({type:'job',repository:repo,status:'queued'});
 });
 update({type:'orb',state:launcher.dataset.state});
 return true;
}
