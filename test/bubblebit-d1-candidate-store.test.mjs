import test from 'node:test';
import assert from 'node:assert/strict';
import {persistVerifiedBitCandidate,getCustomerBitCandidates} from '../bubble-bits/d1-candidate-store.mjs';
const receipt='receipt_abcdefgh12345678';
const input={
 customerId:'customer_123',sessionId:'session_456',taskId:'task_789',operationId:'operation_abcdef',
 criteriaKey:'deploy-site-and-test',capability:'test_verification',
 goal:'Test the deployed Bubbles site without changing wallets',
 summary:'Tests ran on an authenticated job and their result was verified independently.',
 steps:[{tool:'github.test_result',receiptId:receipt,status:'complete',description:'Confirmed the requested tests succeeded'}],
 result:{stage:'tests_verified',filesTested:73,filesChanged:0},
 reuse:{permission:'private',tags:['testing'],guidance:'Review the test checklist and repeat it on your authorized website.'},
 linkedGits:[]
};
const principal={customerId:'customer_123',verified:true};
const adapters={verifyOwnerContext:async()=>true,verifyOperationReceipt:async()=>true,verifyJobResult:async()=>true};
class FakeD1 {
 constructor(){this.packets=[];this.evidence=[];this.batches=0;}
 prepare(sql){let args=[];const owner=this;return {
  bind(...values){args=values;return this;},
  async first(){return owner.packets.find(p=>p.customer_id===args[0]&&p.task_id===args[1]&&p.operation_id===args[2])||null;},
  async all(){return {results:owner.packets.filter(p=>p.customer_id===args[0]).map(p=>({packet_id:p.packet_id,state:p.state,summary:p.summary}))};},
  run(){
   if(sql.includes('INSERT INTO bubble_bit_candidates')){
    const p={packet_id:args[0],customer_id:args[1],task_id:args[2],operation_id:args[3],summary:args[6],state:args[11]};
    if(owner.packets.some(x=>x.packet_id===p.packet_id||x.customer_id===p.customer_id&&x.task_id===p.task_id&&x.operation_id===p.operation_id))throw Error('UNIQUE');
    owner.packets.push(p);return;
   }
   if(sql.includes('INSERT INTO bubble_bit_evidence')){
    if(owner.evidence.some(x=>x.id===args[0]))throw Error('UNIQUE');
    owner.evidence.push({id:args[0],packetId:args[1]});return;
   }
   throw Error('unknown_statement');
  }
 }}
 async batch(stmts){const before={p:[...this.packets],e:[...this.evidence]};try{stmts.forEach(s=>s.run());this.batches++;return []}catch(e){this.packets=before.p;this.evidence=before.e;throw e}}
}
test('only authenticated matching customer can stage a packet',async()=>{
 const db=new FakeD1();
 await assert.rejects(persistVerifiedBitCandidate({input,principal:{customerId:'customer_other',verified:true},db,adapters}),/customer_identity_mismatch/);
 await assert.rejects(persistVerifiedBitCandidate({input,principal:{customerId:'customer_123',verified:false},db,adapters}),/unauthenticated_customer/);
 assert.equal(db.packets.length,0);
});
test('a verified operation creates only one pending customer packet',async()=>{
 const db=new FakeD1();
 const a=await persistVerifiedBitCandidate({input,principal,db,adapters});
 assert.match(a.packetId,/^[a-f0-9]{64}$/);
 assert.deepEqual({status:a.status,created:a.created,creditedBits:a.creditedBits},{status:'pending_review',created:true,creditedBits:0});
 assert.equal(db.packets.length,1);assert.equal(db.evidence.length,1);
 const b=await persistVerifiedBitCandidate({input,principal,db,adapters});
 assert.equal(b.packetId,a.packetId);assert.equal(b.created,false);assert.equal(db.batches,1);
});
test('no verified receipt means no stored candidate',async()=>{
 const db=new FakeD1();
 await assert.rejects(persistVerifiedBitCandidate({input,principal,db,adapters:{...adapters,verifyOperationReceipt:async()=>false}}),/receipt_not_verified/);
 assert.equal(db.packets.length,0);
});
test('same operation with different evidence cannot create extra credit',async()=>{
 const db=new FakeD1();await persistVerifiedBitCandidate({input,principal,db,adapters});
 await assert.rejects(persistVerifiedBitCandidate({input:{...input,steps:[{...input.steps[0],receiptId:'receipt_abcdefgh87654321'}]},principal,db,adapters}),/conflicting_operation_claim/);
 assert.equal(db.batches,1);assert.equal(db.packets.length,1);
});
test('customer-only queries never expose another customer',async()=>{
 const db=new FakeD1();await persistVerifiedBitCandidate({input,principal,db,adapters});
 assert.equal((await getCustomerBitCandidates({principal,db})).length,1);
 assert.equal((await getCustomerBitCandidates({principal:{customerId:'customer_other',verified:true},db})).length,0);
 await assert.rejects(getCustomerBitCandidates({principal:{customerId:'customer_other',verified:false},db}),/unauthenticated_customer/);
});
test('duplicate receipt causes atomic rollback for other operation',async()=>{
 const db=new FakeD1();await persistVerifiedBitCandidate({input,principal,db,adapters});
 await assert.rejects(persistVerifiedBitCandidate({input:{...input,taskId:'task_other',operationId:'operation_other'},principal,db,adapters}),/receipt_or_database_conflict/);
 assert.equal(db.packets.length,1);assert.equal(db.evidence.length,1);
});
