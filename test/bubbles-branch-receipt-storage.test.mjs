import test from 'node:test';
import assert from 'node:assert/strict';
import {storeAndVerifyBranchReadReceipt} from '../workers/infinity-brain-clock/branch-read-receipt.mjs';

const result={ok:true,status:'branch_found',repository:'www-infinity4/Chiller',
 repositoryId:1367499788,branch:'add-full-episodes',exists:true,
 headSha:'a'.repeat(40),observedAt:'2026-11-08T01:00:00.000Z',
 jobExecutionVerified:false,deploymentVerified:false};
function storage(){
 const values=new Map();let writes=0;
 return {
  async get(key){return values.get(key)},
  async put(key,value){writes++;values.set(key,value)},
  get writes(){return writes},
  values
 };
}
test('successful GitHub branch observation is persisted and read back before receipt is confirmed',async()=>{
 const d=storage();
 const proof=await storeAndVerifyBranchReadReceipt(d,result);
 assert.match(proof.id,/^branch_[a-f0-9]{32}$/);
 assert.equal(proof.tool,'github.read_branch_status');
 assert.equal(proof.status,'complete');
 assert.equal(proof.persisted,true);
 assert.equal(proof.repository,'www-infinity4/Chiller');
 assert.equal(proof.branch,'add-full-episodes');
 assert.equal(proof.headSha,result.headSha);
 assert.equal(proof.jobExecutionVerified,false);
 assert.equal(d.writes,1);
 const records=[...d.values.values()][0];
 assert.equal(records.length,1);
 assert.equal(records[0].id,proof.id);
});
test('receipt storage is bounded at 32 observations, without minting or recording owner content',async()=>{
 const d=storage();
 for(let i=0;i<37;i++)await storeAndVerifyBranchReadReceipt(d,result);
 const records=[...d.values.values()][0];
 assert.equal(records.length,32);
 assert.equal(new Set(records.map(x=>x.id)).size,32);
 assert.ok(records.every(x=>x.tool==='github.read_branch_status'&&x.walletCredit===undefined));
});
test('unverified branch result cannot make a receipt or write anything',async()=>{
 const d=storage();
 for(const bad of [{...result,ok:false},{...result,repository:'other/Chiller'},
  {...result,exists:true,headSha:'not-a-commit'},{...result,repositoryId:0}]){
  await assert.rejects(storeAndVerifyBranchReadReceipt(d,bad),/invalid_branch_read_result/);
 }
 assert.equal(d.writes,0);
});
test('failed durable storage or mismatched readback cannot produce a complete receipt',async()=>{
 const d={get:async()=>[],put:async()=>{throw Error('storage unavailable')}};
 await assert.rejects(storeAndVerifyBranchReadReceipt(d,result),/storage unavailable/);
 const d2={get:async()=>[],put:async()=>{}};
 await assert.rejects(storeAndVerifyBranchReadReceipt(d2,result),/branch_receipt_readback_unverified/);
});
