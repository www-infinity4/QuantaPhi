import {SESSION_COLORS,newHistory,createThread,addItem,recordEvidence,extractToThread,
 finishSession,nextSession,carryForward,exportHandoff,threadColor,sessionColor,activeSession}
 from './session-history-core.mjs';

const STORE='infinity:zeus-session-history:v1';
const el=(tag,cls,text)=>{
 const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;
};
const button=(label,action,cls='secondary')=>{
 const b=el('button',cls,label);b.type='button';b.addEventListener('click',action);return b;
};
const labelDot=(color)=>{
 const d=el('span','zeus-dot', '');d.dataset.color=color;d.setAttribute('aria-label',SESSION_COLORS[color]);d.title=SESSION_COLORS[color];return d;
};
const validHistory=d=>d&&d.version===1&&Array.isArray(d.threads)&&d.threads.length<=25&&
 d.threads.every(t=>typeof t.id==='string'&&Array.isArray(t.sessions)&&t.sessions.length<=12&&
 t.sessions.every(s=>Array.isArray(s.items)&&s.items.length<=40));
const read=()=>{try{const v=JSON.parse(localStorage.getItem(STORE)||'null');return validHistory(v)?v:newHistory()}catch{return newHistory()}};
let history=read(),selected=history.threads[0]?.id||null;
const arena=document.getElementById('arena');
if(arena){
 const root=el('section','zeus-history');root.id='zeusSessionHistory';root.setAttribute('aria-labelledby','zeusHistoryTitle');
 arena.insertAdjacentElement('afterend',root);
 const heading=el('div','zeus-history-head');
 const titleBlock=el('div');
 titleBlock.append(el('p','eyebrow','ZEUS 6.2 · CONTINUITY'),el('h2','','Session history & work dots'),
  el('p','', 'Follow unfinished work, preserve exact extractions, record imports and start focused continuations.'));
 heading.append(titleBlock);root.append(heading);
 const disclosure=el('p','zeus-history-disclosure',
  'Device-local tracker only. These dots do not alter ChatGPT history, read private model thinking, import external conversations, or independently verify evidence. The activity stream reflects saved user actions.');
 root.append(disclosure);
 const legend=el('div','zeus-history-legend');
 for(const color of ['red','green','blue','yellow','orange']){
  const line=el('span','zeus-legend-pair');line.append(labelDot(color),el('span','',SESSION_COLORS[color]));legend.append(line);
 }
 root.append(legend);
 const layout=el('div','zeus-history-grid'),side=el('aside','zeus-history-side'),detail=el('div','zeus-history-detail');
 layout.append(side,detail);root.append(layout);
 const notice=el('p','zeus-history-notice','Local actions will appear here.');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');root.append(notice);
 let lastActivity='No actions recorded yet.';
 const save=()=>{
  try{localStorage.setItem(STORE,JSON.stringify(history));return true}
  catch{notice.textContent='Browser storage failed; this operation is not safely stored. Export your current handoff.';return false}
 };
 const say=message=>{lastActivity=message;notice.textContent='Last recorded action: '+message};
 const mutate=(fn,message)=>{
  // Roll back failed local writes in memory as well as on screen. Otherwise a
  // storage failure would misleadingly change the in-memory session history.
  const snapshot=JSON.stringify(history),previousSelected=selected;
  const rollback=()=>{history=JSON.parse(snapshot);selected=previousSelected;render()};
  try{
   const output=fn();
   if(!save()){
    rollback();
    notice.textContent='Nothing was saved. Browser storage is unavailable; export an existing handoff before continuing.';
    return;
   }
   render();say(message);return output;
  }catch(error){rollback();notice.textContent=String(error.message||error)}
 };
 const currentThread=()=>history.threads.find(t=>t.id===selected)||history.threads[0]||null;
 const makeForm=(inputs,onSubmit)=>{
  const form=el('form','zeus-history-form');
  for(const input of inputs)form.append(input);
  form.addEventListener('submit',e=>{e.preventDefault();onSubmit()});return form;
 };
 const field=(name,tag='input')=>{
  const n=el(tag);n.setAttribute('aria-label',name);n.placeholder=name;n.maxLength=tag==='textarea'?3000:250;
  if(tag==='textarea')n.rows=3;return n;
 };
 function renderSide(){
  side.replaceChildren(el('h3','','Project threads'));
  const form=el('form','zeus-history-new');
  const title=field('New project or topic title');title.required=true;title.minLength=3;title.maxLength=90;
  const add=el('button','primary','Create project thread');add.type='submit';form.append(title,add);
  form.addEventListener('submit',e=>{
   e.preventDefault();
   mutate(()=>{const t=createThread(history,title.value);selected=t.id},'Created a private project thread');
  });
  side.append(form);
  const list=el('div','zeus-history-threads');
  if(!history.threads.length)list.append(el('p','', 'No local threads yet. Create one above.'));
  for(const thread of history.threads){
   const row=button('',()=>{selected=thread.id;render()},'zeus-thread'+(thread.id===selected?' active':''));
   row.append(labelDot(threadColor(thread)));
   const summary=el('span','zeus-thread-name');
   summary.append(el('strong','',thread.title),el('small','',thread.sessions.length+' session(s) · '+SESSION_COLORS[threadColor(thread)]));
   row.append(summary);list.append(row);
  }
  side.append(list);
 }
 function renderTimeline(thread){
  const flow=el('div','zeus-history-sessions');
  for(const s of thread.sessions){
   const entry=el('div','zeus-session-entry');entry.append(labelDot(sessionColor(s)),
    el('span','','Session '+s.number+' · '+SESSION_COLORS[sessionColor(s)]+' · '+s.items.length+' task(s)'));
   flow.append(entry);
  }
  return flow;
 }
 function renderItem(thread,item){
  const card=el('article','zeus-work-item');
  const top=el('div','zeus-work-top');
  top.append(el('strong','',item.kind.toUpperCase()),el('small','',item.doneAt?'Outcome recorded':'Action required'));
  card.append(top,el('p','zeus-work-text',item.text));
  if(item.source)card.append(el('small','zeus-source','Source: '+item.source));
  if(item.receipt)card.append(el('p','zeus-evidence','Evidence: '+item.receipt));
  if(!item.doneAt&&!thread.fullAt){
   const controls=el('div','zeus-item-controls');
   const evidence=field('Result, URL or verifiable receipt (not a claim of automated validation)');
   evidence.maxLength=800;
   const record=button('Record outcome',()=>mutate(()=>recordEvidence(thread,item.id,evidence.value),'Recorded evidence for '+item.kind),'secondary');
   controls.append(evidence,record);
   if(item.kind==='extraction'){
    controls.append(button('Open focused thread',()=>mutate(()=>{
     const next=extractToThread(history,thread.id,item.id);selected=next.id;
    },'Preserved exact extraction and created a new blue import task'),'primary'));
   }
   card.append(controls);
  }
  return card;
 }
 function renderDetail(){
  detail.replaceChildren();
  const thread=currentThread();
  if(!thread){detail.append(el('p','', 'Choose or create a project thread to begin tracking.'));return}
  const s=activeSession(thread),color=threadColor(thread);
  const head=el('div','zeus-current-head');
  const text=el('div');text.append(el('small','', 'PROJECT THREAD'),el('h3','',thread.title));
  const status=el('span','zeus-status');status.append(labelDot(color),el('strong','',SESSION_COLORS[color]));
  head.append(text,status);detail.append(head);
  detail.append(renderTimeline(thread));
  detail.append(el('h4','', 'Session '+s.number+' · '+SESSION_COLORS[sessionColor(s)]));
  if(thread.fullAt)detail.append(el('p','zeus-history-disclosure','Orange handoff recorded. The original thread remains available as a local read-only history.'));
  else if(s.completedAt)detail.append(el('p','zeus-history-disclosure','Green: every task has a recorded outcome. Evidence is user-entered; a server has not independently verified it.'));
  else detail.append(el('p','zeus-history-disclosure','A colored dot reflects pending task types. Record outcomes before completing this session.'));
  const items=el('div','zeus-history-items');
  for(const item of s.items)items.append(renderItem(thread,item));
  if(!s.items.length)items.append(el('p','zeus-empty','This session has no tasks yet.'));
  detail.append(items);
  if(!thread.fullAt&&!s.completedAt){
   const kind=el('select');kind.setAttribute('aria-label','Work classification');
   for(const [value,name] of [['work','Red · unfinished work'],['extraction','Yellow · exact extraction'],['import','Blue · import required'],['answer','Blue · AI answer required']]){
    const op=el('option','',name);op.value=value;kind.append(op);
   }
   const content=field('Write a task or paste the exact extract','textarea');content.required=true;
   const source=field('Source reference (required for yellow extraction)');source.maxLength=250;
   const submit=el('button','primary','Add work to this session');submit.type='submit';
   detail.append(makeForm([el('h4','','Add a work point'),kind,content,source,submit],
    ()=>mutate(()=>addItem(thread,kind.value,content.value,source.value),'Added '+kind.value+' work point')));
  }
  const actions=el('div','zeus-history-actions');
  if(!thread.fullAt&&!s.completedAt){
   const finish=button('Finish session · green',()=>mutate(()=>finishSession(thread),'Completed session '+s.number+' with recorded evidence'),'primary');
   finish.disabled=!s.items.length||s.items.some(i=>!i.doneAt||!i.receipt);
   actions.append(finish);
  }
  if(!thread.fullAt&&s.completedAt){
   const next=button('Start next session',()=>mutate(()=>nextSession(thread),'Started next private session in '+thread.title),'primary');
   next.disabled=thread.sessions.length>=12;actions.append(next);
   if(next.disabled)detail.append(el('p','zeus-history-disclosure','This local tracker has reached its 12-session limit; use orange handoff. This is not a measured AI context-window limit.'));
  }
  if(!thread.fullAt)actions.append(button('Thread full · orange handoff',()=>{
   if(!confirm('Record orange and open a continuation? Unfinished work will be copied into the new local thread.'))return;
   mutate(()=>{const result=carryForward(history,thread.id);selected=result.next.id},'Created orange handoff; copied unfinished work to the new thread');
  }));
  const copy=button('Show handoff for copying',()=>{
   const exportBox=document.getElementById('zeusHandoffText');
   if(exportBox){exportBox.value=exportHandoff(thread);exportBox.hidden=false;exportBox.focus();exportBox.select();say('Prepared private handoff; copy it manually to a new AI conversation.')}
  });
  actions.append(copy);detail.append(actions);
  const exportBox=el('textarea','zeus-handoff-output');exportBox.id='zeusHandoffText';exportBox.readOnly=true;exportBox.rows=8;
  exportBox.hidden=true;exportBox.setAttribute('aria-label','Private handoff text to copy');detail.append(exportBox);
 }
 function render(){renderSide();renderDetail();notice.textContent='Last recorded action: '+lastActivity}
 render();
}
