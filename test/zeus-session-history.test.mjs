import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newHistory,createThread,addItem,recordEvidence,extractToThread,finishSession,
 nextSession,carryForward,exportHandoff,sessionColor,threadColor,MAX_SESSIONS} from '../coliseum/session-history-core.mjs';

test('red is default, yellow is extraction, blue is import or unanswered AI question',()=>{
 const h=newHistory(),t=createThread(h,'Zeus continuity');
 assert.equal(threadColor(t),'red');
 assert.throws(()=>addItem(t,'extraction','Exact passage'),/source reference/);
 const y=addItem(t,'extraction','Exact passage here','Chat chapter and message 17');
 assert.equal(threadColor(t),'yellow');
 const focused=extractToThread(h,t.id,y.id);
 assert.equal(threadColor(focused),'blue');
 assert.equal(focused.sessions[0].items[0].text,'Exact passage here');
 assert.match(focused.sessions[0].items[0].source,/Local extraction/);
 assert.equal(y.doneAt!==null,true);
 assert.match(y.receipt,/not yet completed/);
 const q=addItem(t,'answer','AI should answer the remaining question');
 assert.equal(threadColor(t),'blue');
 assert.throws(()=>finishSession(t),/Every work item/);
 assert.throws(()=>recordEvidence(t,q.id,'ok'),/at least eight/);
 recordEvidence(t,q.id,'Answered with owner-approved work log #17');
 assert.equal(threadColor(t),'red');
 const old=finishSession(t);
 assert.equal(sessionColor(old),'green');
 assert.equal(threadColor(t),'green');
 nextSession(t);
 assert.equal(threadColor(t),'red');
});
test('red cannot become green without recorded outcomes, and session history stays green',()=>{
 const h=newHistory(),t=createThread(h,'Fix onboarding');
 const task=addItem(t,'work','Repair broken login');
 assert.throws(()=>finishSession(t),/Every work item/);
 recordEvidence(t,task.id,'Commit abc123 and auth tests green');
 const done=finishSession(t);
 assert.equal(sessionColor(done),'green');
 assert.throws(()=>recordEvidence(t,task.id,'Another result'),/no longer editable/);
 const current=nextSession(t);
 assert.equal(sessionColor(current),'red');
 assert.equal(sessionColor(t.sessions[0]),'green');
 assert.equal(threadColor(t),'red');
});
test('orange creates a new local thread with all unfinished items and retains the old source',()=>{
 const h=newHistory(),t=createThread(h,'StarQuest wallet');
 const work=addItem(t,'work','Inspect auth error');
 const importTask=addItem(t,'import','Reconnect verified account mapping','Ticket #12');
 const {next,moved}=carryForward(h,t.id);
 assert.equal(moved,2);
 assert.equal(threadColor(t),'orange');
 assert.equal(threadColor(next),'blue');
 assert.equal(next.sessions[0].items.length,2);
 assert.equal(next.sessions[0].items[0].text,work.text);
 assert.equal(next.sessions[0].items[1].text,importTask.text);
 assert.equal(t.sessions[0].items[1].source,'Ticket #12');
 assert.match(exportHandoff(t),/Ticket #12/);
 assert.throws(()=>addItem(t,'work','More work'),/Start an active session/);
});
test('orange handoff is necessary at 12 local sessions, not a claimed model token limit',()=>{
 const h=newHistory(),t=createThread(h,'Extended sessions');
 for(let i=0;i<MAX_SESSIONS;i++){
  const task=addItem(t,'work','Work item '+i);
  recordEvidence(t,task.id,'Manual completion receipt '+i);
  finishSession(t);
  if(i<MAX_SESSIONS-1)nextSession(t);
 }
 assert.equal(threadColor(t),'green');
 assert.throws(()=>nextSession(t),/local thread capacity/i);
 assert.equal(threadColor(t),'green');
 const {next}=carryForward(h,t.id);
 assert.equal(threadColor(t),'orange');
 assert.equal(threadColor(next),'red');
});
test('tracker is installed on Zeus but never claims ChatGPT-native access',()=>{
 const html=readFileSync(new URL('../coliseum/index.html',import.meta.url),'utf8');
 const source=readFileSync(new URL('../coliseum/session-history.mjs',import.meta.url),'utf8');
 assert.match(html,/session-history\.css/);assert.match(html,/session-history\.mjs/);
 assert.match(source,/Device-local tracker only/);
 assert.match(source,/user-entered/);
 assert.match(source,/Private handoff text to copy/);
});
