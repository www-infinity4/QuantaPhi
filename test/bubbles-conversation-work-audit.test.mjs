import test from 'node:test';
import assert from 'node:assert/strict';
import {auditWorkHistory,reconcileWorkEvidence,auditOwnerConversation} from '../workers/infinity-brain-clock/conversation-work-audit.mjs';
const m=(n,role,text)=>({id:'message_'+String(n).padStart(4,'0'),role,text,at:1000+n});
test('actual user demands found; assistant completion claims are ignored',()=>{
 const tasks=auditWorkHistory([m(1,'assistant','I fixed Infinity Radio'),m(2,'user','Infinity Radio shuts off after two songs; please fix it.'),m(3,'user','Fix infinity radio playback and verify the whole list'),m(4,'assistant','APK synced')]);
 assert.equal(tasks.length,1);assert.equal(tasks[0].id,'radio');assert.equal(tasks[0].evidence.length,2);assert.equal(tasks[0].repositoryVerified,false);assert.equal(tasks[0].status,'candidate_needs_repository_inspection');
});
test('distinct older plans produce traceable requests without dispatch',()=>{
 const t=auditWorkHistory([m(1,'user','Hook in to owner mode for Bubbles and robot brain.'),m(2,'user','Build Bubbles memory from my conversations.'),m(3,'user','Upgrade automated GitHub PR builders so Bubbles builds itself.'),m(4,'user','Fix the Android APK not syncing to the website.')]);
 for(const id of ['owner-delegation','conversation-memory','autonomous-building','apk-web-sync'])assert.ok(t.find(x=>x.id===id),id);
 assert.ok(t.every(x=>x.status.startsWith('candidate_')));
});
test('questions, model chatter, invalid IDs and invented names do not become tickets',()=>{
 assert.deepEqual(auditWorkHistory([m(1,'user','What is a diaphragm?'),m(2,'assistant','Create fake repository.'),m(3,'user','Flabbage is a word I invented.'),m(4,'user','I built a website two years ago.'),{id:'bad ID',role:'user',text:'Fix Infinity Radio.'}]),[]);
});
test('owner negative voice constraints remain attached to relevant candidate',()=>{
 const t=auditWorkHistory([m(1,'user','Fix Bubbles voice and never sing the reply; do not read ticket numbers aloud.')]);
 assert.equal(t.length,1);assert.match(t[0].constraints[0],/never sing/);
});
test('self-asserted CI/URL/deployment claims cannot finish a backlog task',()=>{
 const c=auditWorkHistory([m(1,'user','Fix Infinity Radio playback now.')])[0];
 const forged={repository:c.repositorySuggestion,sha:'a'.repeat(40),
  testReceipts:[{passed:true,url:'https://github.com/example/actions/1'}],
  deployed:true,deploymentUrl:'https://example.org',liveObserved:true};
 const result=reconcileWorkEvidence(c,forged);
 assert.equal(result.status,'candidate_needs_repository_inspection');
 assert.equal(result.repositoryVerified,false);
 assert.equal(result.receipt,undefined);
 assert.equal(c.status,'candidate_needs_repository_inspection');
 assert.equal(reconcileWorkEvidence(c,null).status,c.status);
});
test('archive reads are owner-partitioned, paginated and never create work',async()=>{
 const calls=[],db={prepare(sql){const q={bind(...args){calls.push({sql,args});return q},async all(){return {results:[m(3,'user','Fix Infinity Radio playback.'),m(2,'user','Build Bubbles memory retrieval.'),m(1,'user','Sync Android APK with website.')]}}};return q}};
 const a=await auditOwnerConversation(db,'verified_owner',{limit:2});
 assert.equal(a.scanned,2);assert.equal(a.executionStarted,false);assert.equal(a.ownerApprovalInferred,false);
 assert.deepEqual(a.nextCursor,{beforeAt:1002,beforeId:'message_0002'});
 assert.match(calls[0].sql,/WHERE owner=\? AND role='user'/);assert.equal(calls[0].args[0],'verified_owner');
 await auditOwnerConversation(db,'verified_owner',{limit:2,...a.nextCursor});
 assert.deepEqual(calls[1].args.slice(0,4),['verified_owner',1002,1002,'message_0002']);
 await assert.rejects(auditOwnerConversation(db,'verified_owner',{beforeAt:12,beforeId:'../../evil'}),/cursor_invalid/);
 await assert.rejects(auditOwnerConversation(db,''),/verified_owner_required/);
});
test('plural GitHub repos and repositories are recognized as unfinished owner build work',()=>{
 for(const request of ['Build GitHub repos automatically for Bubbles.',
  'Fix GitHub repositories that were left unfinished.',
  'Check GitHub pull requests and build missing features.']){
  const found=auditWorkHistory([m(101,'user',request)]);
  assert.ok(found.some(x=>x.id==='autonomous-building'),request);
 }
});
