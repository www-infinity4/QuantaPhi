import test from 'node:test';
import assert from 'node:assert/strict';
import {transition} from '../continuity/router.mjs';
const now=1800000000000;
const auth={verified:true,ownerId:'a',expiresAt:now+1000};
const work={id:'w',ownerId:'a',revision:0,status:'ready',requiredReceiptKinds:['test','deploy','live'],receipts:[],events:[]};
const command={expectedRevision:0,to:'running',idempotencyKey:'one'};
test('transition preserves context and appends ordered evidence without mutating input',()=>{
 const w={...work,instructions:'original',acceptance:['real behavior']},before=structuredClone(w);
 const r=transition(w,command,auth,now);
 assert.deepEqual(w,before);assert.equal(r.work.instructions,'original');assert.deepEqual(r.work.acceptance,w.acceptance);assert.equal(r.event.sequence,1);
});
test('same request replays; stale revision and conflicting key fail',()=>{
 const r=transition(work,command,auth,now);
 assert.equal(transition(r.work,command,auth,now).replayed,true);
 assert.throws(()=>transition(r.work,{...command,to:'blocked'},auth,now),/idempotency_conflict/);
 assert.throws(()=>transition(r.work,{...command,idempotencyKey:'two'},auth,now),/revision_conflict/);
});
test('wrong owner, expired and revoked authority cannot mutate work or replay',()=>{
 for(const a of [{...auth,ownerId:'b'},{...auth,expiresAt:now},{...auth,revoked:true},{...auth,verified:false}]){
  assert.throws(()=>transition(work,command,a,now),/unauthorized/);
 }
 const r=transition(work,command,auth,now);
 assert.throws(()=>transition(r.work,command,{...auth,revoked:true},now),/unauthorized/);
});
test('merge or tests alone cannot finish work requiring deploy and live receipts',()=>{
 const c={...command,to:'complete'};
 const w={...work,receipts:[{kind:'test',provenance:'provider-confirmed',status:'success'}]};
 assert.throws(()=>transition(w,c,auth,now),/acceptance_unverified/);
 const receipts=work.requiredReceiptKinds.map(kind=>({kind,provenance:'provider-confirmed',status:'success'}));
 assert.equal(transition({...work,receipts},c,auth,now).work.status,'complete');
 assert.throws(()=>transition({...work,requiredReceiptKinds:[]},c,auth,now),/acceptance_undefined/);
});
