import test from 'node:test';
import assert from 'node:assert/strict';
import {workBucket,triageBacklog} from '../workers/infinity-brain-clock/autopilot-triage.mjs';
const owner='a'.repeat(64);
const row=(id,n,jobs)=>({id,created_at:n,repository:'www-infinity4/QuantaPhi',context_json:JSON.stringify({kind:'robot-directions',color_jobs:jobs})});
function harness(rows){
 const memory=new Map(),queries=[];
 const storage={get:async key=>memory.get(key),put:async(key,value)=>memory.set(key,value)};
 const db={prepare:sql=>({bind(...args){queries.push({sql,args});this.args=args;return this},async all(){
  const [hash,at,same,id,limit]=this.args;
  assert.equal(hash,owner);assert.equal(at,same);
  return {results:rows.filter(r=>r.created_at>at||r.created_at===at&&r.id>id).slice(0,limit)};
 }})};
 return {memory,queries,storage,db};
}
test('agent intake distinguishes source work from separate commit/deployment receipts',()=>{
 assert.equal(workBucket({status:'merged_verified',progress:{blocker:'deployment_not_verified'}}),'deployment_needs_verification');
 assert.equal(workBucket({status:'committed_unverified'}),'commit_needs_verification');
 assert.equal(workBucket({status:'blocked',progress:{blocker:'security_hold'}}),'owner_or_security_decision');
 assert.equal(workBucket({status:'queued',dependencies:['TASK-2']},[{id:'TASK-2',status:'blocked'}]),'waiting_for_dependencies');
 assert.equal(workBucket({status:'queued',dependencies:['TASK-2']},[{id:'TASK-2',status:'complete'}]),'queued_for_existing_runner');
});
test('owner-siloed paginated intake moves in bounded batches and never repeats a page in the same cycle',async()=>{
 const rows=[row('a',1,[{id:'TASK-1',status:'queued'}]),row('b',2,[{id:'TASK-2',status:'committed_unverified'}]),row('c',3,[{id:'TASK-3',status:'merged_verified',progress:{blocker:'deployment_not_verified'}}])];
 const h=harness(rows);
 const one=await triageBacklog(h.db,h.storage,owner,{batchSize:2,now:1000});
 assert.equal(one.tickets,2);assert.equal(one.cycleComplete,false);
 const two=await triageBacklog(h.db,h.storage,owner,{batchSize:2,now:1001});
 assert.equal(two.tickets,1);assert.equal(two.cycleComplete,true);assert.equal(two.completedCycle.tickets,3);
 assert.deepEqual(two.completedCycle.counts,{queued_for_existing_runner:1,commit_needs_verification:1,deployment_needs_verification:1});
 const three=await triageBacklog(h.db,h.storage,owner,{batchSize:2,now:1002});
 assert.equal(three.tickets,2);assert.equal(h.queries.length,3);
 assert.equal((await triageBacklog(h.db,h.storage,'wrong')).ok,false);
});
test('private project instructions never enter triage receipts, and triage cannot execute code',async()=>{
 const h=harness([row('a',1,[{id:'TASK-1',instructions:'PRIVATE conversation contents',status:'blocked',progress:{blocker:'owner_approval_required'}}])]);
 const result=await triageBacklog(h.db,h.storage,owner,{batchSize:3});
 assert.equal(result.executionVerified,false);
 assert.equal(result.runnerDispatchRequested,false);
 assert.equal(result.counts.owner_or_security_decision,1);
 assert.doesNotMatch(JSON.stringify([...h.memory]),/PRIVATE conversation contents/);
});
