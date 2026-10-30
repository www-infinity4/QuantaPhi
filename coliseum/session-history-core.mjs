/* Zeus 6.2 local session-history contract.
 * These are SESSION badges, not the independent robot operation colors.
 * No access to ChatGPT history, reasoning traces or model context limits. */
export const KIND = Object.freeze(['work','extraction','import','answer']);
export const SESSION_COLORS = Object.freeze({
 red:'Unfinished',green:'Completed with recorded evidence',
 blue:'Import or AI answer needed',yellow:'Extraction point',
 orange:'Thread full / continuation'
});
export const MAX_THREADS = 25, MAX_SESSIONS = 12, MAX_ITEMS = 40;
const stamp=()=>new Date().toISOString();
const unique=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'local-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const clean=(v,max)=>String(v??'').trim().slice(0,max);
const freshSession=(number)=>({id:unique(),number,openedAt:stamp(),completedAt:null,items:[]});
export const newHistory=()=>({version:1,threads:[]});
export const activeSession=t=>t?.sessions?.at(-1)||null;
export function sessionColor(session){
 if(!session)return 'red';
 if(session.completedAt)return 'green';
 if(session.items.some(i=>!i.doneAt&&i.kind==='extraction'))return 'yellow';
 if(session.items.some(i=>!i.doneAt&&(i.kind==='import'||i.kind==='answer')))return 'blue';
 return 'red';
}
export function threadColor(thread){
 return thread.fullAt?'orange':sessionColor(activeSession(thread));
}
export function createThread(history,title,source=''){
 if(history.threads.length>=MAX_THREADS)throw Error('Local thread limit reached; export your notes before adding more.');
 const label=clean(title,90);
 if(label.length<3)throw Error('Give this thread a descriptive title.');
 const t={id:unique(),title:label,source:clean(source,180),createdAt:stamp(),fullAt:null,handoff:'',sessions:[freshSession(1)]};
 history.threads.unshift(t);
 return t;
}
export function addItem(thread,kind,text,source=''){
 const current=activeSession(thread);
 if(thread.fullAt||current.completedAt)throw Error('Start an active session first.');
 if(!KIND.includes(kind))throw Error('Unknown work type.');
 if(current.items.length>=MAX_ITEMS)throw Error('Local session item limit reached. Close or carry forward this thread.');
 const description=clean(text,3000), origin=clean(source,250);
 if(description.length<3)throw Error('Describe the work or extract at least three characters.');
 if(kind==='extraction'&&!origin)throw Error('Exact extractions need a source reference.');
 const item={id:unique(),kind,text:description,source:origin,createdAt:stamp(),doneAt:null,receipt:''};
 current.items.push(item);
 return item;
}
export function recordEvidence(thread,itemId,receipt){
 const session=activeSession(thread);
 if(!session||session.completedAt||thread.fullAt)throw Error('This session is no longer editable.');
 const item=session.items.find(i=>i.id===itemId);
 if(!item||item.doneAt)throw Error('Work item is not available.');
 const note=clean(receipt,800);
 if(note.length<8)throw Error('Include a real result or evidence reference (at least eight characters).');
 item.receipt=note;item.doneAt=stamp();return item;
}
export function extractToThread(history,threadId,itemId){
 const source=history.threads.find(t=>t.id===threadId);
 if(!source||source.fullAt)throw Error('Source thread unavailable.');
 const session=activeSession(source);
 const item=session.items.find(i=>i.id===itemId);
 if(!item||item.doneAt||item.kind!=='extraction')throw Error('Choose an unfinished yellow extraction.');
 const focused=createThread(history,'Extracted · '+item.text.slice(0,55),item.source);
 addItem(focused,'import',item.text,'Local extraction: '+source.title+' / '+session.id+' / '+item.id);
 item.doneAt=stamp();item.receipt='Exact copy prepared in local thread '+focused.id+'; import not yet completed.';
 return focused;
}
export function finishSession(thread){
 const current=activeSession(thread);
 if(thread.fullAt||!current||current.completedAt)throw Error('No unfinished session to close.');
 if(!current.items.length||current.items.some(i=>!i.doneAt||!i.receipt))throw Error('Every work item requires a recorded outcome before green.');
 current.completedAt=stamp();return current;
}
export function nextSession(thread){
 const current=activeSession(thread);
 if(thread.fullAt||!current?.completedAt)throw Error('Finish the current session before starting the next.');
 if(thread.sessions.length>=MAX_SESSIONS)throw Error('Local thread capacity reached. Use orange handoff to continue.');
 const next=freshSession(current.number+1);thread.sessions.push(next);return next;
}
export function carryForward(history,threadId){
 const current=history.threads.find(t=>t.id===threadId);
 if(!current||current.fullAt)throw Error('This thread was already rolled over.');
 const active=activeSession(current);
 const open=active.items.filter(i=>!i.doneAt);
 const next=createThread(history,current.title+' · continuation','Local thread '+current.id);
 for(const item of open)addItem(next,item.kind,item.text,item.source||'Carried forward from local session '+active.id);
 current.handoff='Continued in '+next.id+'; '+open.length+' unfinished item(s) copied with source references.';
 current.fullAt=stamp();
 return {next,moved:open.length};
}
export function exportHandoff(thread){
 const lines=['Infinity Zeus 6.2 — local session handoff',thread.title,'Original local ID: '+thread.id,
 'Session count: '+thread.sessions.length,'Full: '+Boolean(thread.fullAt)];
 for(const session of thread.sessions){
  lines.push('Session '+session.number+' · '+sessionColor(session)+' · '+(session.completedAt||'open'));
  for(const i of session.items)lines.push('['+i.kind+'] '+(i.doneAt?'recorded':'pending')+' — '+i.text+
   (i.source?' | Source: '+i.source:'')+(i.receipt?' | Evidence: '+i.receipt:''));
 }
 if(thread.handoff)lines.push(thread.handoff);
 lines.push('Local record only. Evidence is user-entered and not independently validated.');
 return lines.join('\n');
}
