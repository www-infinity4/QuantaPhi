import test from 'node:test';
import assert from 'node:assert/strict';
import {queueKnock,deliverAtCheckpoint,acknowledgeKnock} from '../workers/infinity-brain-clock/door-knocker.mjs';
const owner='a'.repeat(64),run='run-123';
const msg=(id='msg-123')=>({id,ownerHash:owner,runId:run,body:'Please check wallet isolation before merging'});
test('enqueue does not interrupt or rewrite active run',()=>{
 const s=queueKnock({activeRun:{id:run,phase:'writing',cancelled:false},messages:[]},msg());
 assert.equal(s.activeRun.phase,'writing');assert.equal(s.activeRun.cancelled,false);
 assert.equal(s.messages[0].status,'queued');
});
test('duplicate message IDs are idempotent',()=>{
 const a=queueKnock({activeRun:{id:run},messages:[]},msg());
 const b=queueKnock(a,msg());assert.equal(b.messages.length,1);
});
test('cross-owner or cross-run delivery is refused',()=>{
 const a=queueKnock({activeRun:{id:run},messages:[]},msg());
 assert.equal(deliverAtCheckpoint(a,{ownerHash:'b'.repeat(64),runId:run,checkpointId:'safe-1'}).messages[0].status,'queued');
 assert.equal(deliverAtCheckpoint(a,{ownerHash:owner,runId:'run-999',checkpointId:'safe-1'}).messages[0].status,'queued');
});
test('cannot deliver during an active tool operation',()=>{
 const a=queueKnock({activeRun:{id:run},messages:[]},msg());
 assert.equal(deliverAtCheckpoint(a,{ownerHash:owner,runId:run,checkpointId:'safe-1',toolActive:true}).messages[0].status,'queued');
});
test('only safe checkpoint can deliver; acknowledgment is separate',()=>{
 const a=queueKnock({activeRun:{id:run},messages:[]},msg());
 const b=deliverAtCheckpoint(a,{ownerHash:owner,runId:run,checkpointId:'safe-1',toolActive:false});
 assert.equal(b.messages[0].status,'delivered');
 assert.equal(b.messages[0].checkpointId,'safe-1');
 const c=acknowledgeKnock(b,{ownerHash:owner,runId:run,messageId:'msg-123',status:'accepted',receiptId:'executor-123'});
 assert.equal(c.messages[0].status,'accepted');
});
test('cannot invent completion without executor receipt',()=>{
 const a=queueKnock({activeRun:{id:run},messages:[]},msg());
 const b=deliverAtCheckpoint(a,{ownerHash:owner,runId:run,checkpointId:'safe-1'});
 assert.throws(()=>acknowledgeKnock(b,{ownerHash:owner,runId:run,messageId:'msg-123',status:'completed'}),/receipt/);
});
