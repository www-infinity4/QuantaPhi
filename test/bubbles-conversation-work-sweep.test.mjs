import test from 'node:test';
import assert from 'node:assert/strict';
import {sweepOwnerWorkHistory,combineAuditCandidates} from '../workers/infinity-brain-clock/conversation-work-sweep.mjs';
const owner='a'.repeat(64),second='b'.repeat(64);
const make=(n,who=owner,text='Fix Infinity Radio playback; verify the full playlist.')=>
 ({owner:who,id:'owner-message-'+String(n).padStart(8,'0'),role:'user',text,at:100000+Math.floor(n/3)});
function dbFor(rows){
 const queries=[];
 return {queries,prepare(sql){
  const q={bind(...args){this.args=args;return this},async all(){
   queries.push({sql,args:this.args});
   assert.match(sql,/WHERE owner=\? AND role='user'/);
   const [who]=this.args;
   const hasCursor=/at<\?/.test(sql);
   const limit=this.args.at(-1);
   let out=rows.filter(r=>r.owner===who&&r.role==='user');
   if(hasCursor){const at=this.args[1],id=this.args[3];out=out.filter(r=>r.at<at||(r.at===at&&r.id<id));}
   out.sort((a,b)=>b.at-a.at||b.id.localeCompare(a.id));
   return {results:out.slice(0,limit)};
  }};return q;
 }};
}
test('four bounded pages reconcile 550 owner requests, retaining source and negative constraints',async()=>{
 const rows=Array.from({length:550},(_,i)=>make(i+1,owner,i<500?'Fix Infinity Radio playback; verify the full playlist.':'Fix APK website sync and never sing the spoken reply.'));
 rows.push(make(555,second,'Fix another owner Radio playback.'));
 rows.push({...make(556,owner,'Fix unsafe assistant-sourced text'),role:'assistant'});
 const db=dbFor(rows);
 const x=await sweepOwnerWorkHistory(db,owner,{pages:4,limit:150});
 assert.equal(x.messagesScanned,550);
 assert.equal(x.pagesScanned,4);
 assert.equal(db.queries.length,4);
 assert.equal(x.nextCursor,null);
 assert.equal(x.executionStarted,false);
 assert.equal(x.ownerApprovalInferred,false);
 assert.equal(x.runnerDispatchRequested,false);
 const radio=x.candidates.find(c=>c.id==='radio');
 assert.equal(radio.mentions,500);
 assert.equal(radio.repositoryVerified,false);
 assert.equal(radio.status,'candidate_needs_repository_inspection');
 assert.equal(radio.evidence.length,12);
 assert.ok(radio.evidence.every(e=>e.messageId!=='owner-message-00000555'));
 const voice=x.candidates.find(c=>c.id==='voice');
 assert.equal(voice.mentions,50);
 assert.match(voice.constraints[0],/never sing/);
 assert.equal(x.candidates[0].id,'radio');
 assert.equal(JSON.stringify(x).includes('another owner'),false);
});
test('keyset cursor continues beyond a 600-message sweep without repeating same-timestamp rows',async()=>{
 const db=dbFor(Array.from({length:680},(_,i)=>make(i+1)));
 const x=await sweepOwnerWorkHistory(db,owner,{pages:3,limit:200});
 assert.equal(x.messagesScanned,600);
 assert.ok(x.nextCursor?.beforeId);
 const y=await sweepOwnerWorkHistory(db,owner,{...x.nextCursor,pages:3,limit:200});
 assert.equal(y.messagesScanned,80);
 assert.equal(y.nextCursor,null);
 const total=combineAuditCandidates([x,y]);
 assert.equal(total.find(t=>t.id==='radio').mentions,680);
 assert.equal(new Set([...x.candidates[0].evidence,...y.candidates[0].evidence].map(x=>x.messageId)).size,24);
 assert.equal(total.find(t=>t.id==='radio').evidence.length,12);
});
test('strict input bounds, owner isolation, and no arbitrary execution from a sweep',async()=>{
 const data=Array.from({length:10},(_,i)=>make(i+1));
 const db=dbFor(data);
 const a=await sweepOwnerWorkHistory(db,second,{limit:250,pages:4});
 assert.equal(a.messagesScanned,0);
 const b=await sweepOwnerWorkHistory(db,owner,{limit:25000,pages:1000});
 assert.equal(b.pagesScanned,1);
 assert.equal(b.messagesScanned,10);
 assert.equal(db.queries.at(-1).args.at(-1),251);
 await assert.rejects(sweepOwnerWorkHistory(db,'',{limit:1}),/verified_owner_required/);
 await assert.rejects(sweepOwnerWorkHistory(db,owner,{beforeAt:40,beforeId:'malicious/../cursor'}),/work_audit_cursor_invalid/);
 const folded=combineAuditCandidates([{candidates:[{id:'radio',status:'candidate_needs_repository_inspection',
  repositoryVerified:true,receipt:{sha:'f'.repeat(40)},mentions:1,evidence:[],constraints:[]}]}]);
 assert.equal(folded[0].repositoryVerified,false);
 assert.equal(folded[0].receipt,undefined);
});
