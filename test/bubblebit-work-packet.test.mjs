import test from 'node:test';
import assert from 'node:assert/strict';
import {createBitCandidate, exportBitBlueprint, draftPeerTransfer, matchReusableBit} from '../bubble-bits/work-packet.mjs';

const receiptA='receipt_abcdefgh12345678',receiptB='receipt_abcdefgh12345679';
const base={
 customerId:'customer_123',sessionId:'session_456',taskId:'task_789',operationId:'operation_abcdef',
 criteriaKey:'deploy-site-and-test',goal:'Deploy my website with safe release checks',
 summary:'Website deployment checks completed and 73 files passed verified tests.',
 capability:'deployment_verification',
 steps:[
  {tool:'github.workflow_checks',receiptId:receiptA,status:'complete',description:'Check GitHub Actions tests'},
  {tool:'cloudflare.worker.verify',receiptId:receiptB,status:'complete',description:'Confirm deployment version'}
 ],
 result:{stage:'deployed_verified',filesTested:73,filesChanged:0},
 reuse:{permission:'public_blueprint',tags:['deployment','testing'],guidance:'Reuse the tested release checklist with your own application and credentials.'},
 linkedGits:['a'.repeat(64)]
};
const adapters={
 verifyOwnerContext:async q=>q.customerId==='customer_123',
 verifyOperationReceipt:async s=>s.receiptId===receiptA||s.receiptId===receiptB,
 verifyJobResult:async q=>q.taskId==='task_789'&&q.result.stage==='deployed_verified',
 verifyShareGrant:async()=>true,
 verifyTransferAuthorization:async()=>true
};

test('builds one candidate per verified meaningful iteration with a contextual verified packet',async()=>{
 const p=await createBitCandidate(base,adapters);
 assert.equal(p.status,'pending_settlement');assert.equal(p.walletCredits,0);
 assert.equal(p.asset,'BUBBLE_BIT');assert.equal(p.result.filesTested,73);
 assert.equal(p.steps.length,2);assert.equal(p.linkedGits.length,1);
 assert.match(p.id,/^[a-f0-9]{64}$/);
 assert.deepEqual(p,await createBitCandidate(base,adapters));
});
test('rejects duplicate receipt, unverifiable action and missing context',async()=>{
 await assert.rejects(createBitCandidate({...base,steps:[base.steps[0],base.steps[0]]},adapters),/duplicate_receipt/);
 await assert.rejects(createBitCandidate(base,{...adapters,verifyOperationReceipt:async()=>false}),/receipt_not_verified/);
 await assert.rejects(createBitCandidate(base,{...adapters,verifyOwnerContext:async()=>false}),/owner_context_unverified/);
 await assert.rejects(createBitCandidate({...base,steps:[{...base.steps[0],status:'failed'}]},adapters),/invalid_step/);
});
test('rejects ungrounded deployment counts and apparent credentials',async()=>{
 await assert.rejects(createBitCandidate({...base,result:{...base.result,filesTested:'73'}},adapters),/invalid_result/);
 await assert.rejects(createBitCandidate({...base,summary:'Deploy with token ghp_abcdefghijklmnopqrstuvwxyz12345678'},adapters),/sensitive_description/);
 await assert.rejects(createBitCandidate({...base,steps:[base.steps[0]]},adapters),/deployment_receipt_required/);
});
test('blueprint requires sharing approval and omits private identifiers',async()=>{
 const p=await createBitCandidate(base,adapters);
 const blue=await exportBitBlueprint(p,{verifyShareGrant:adapters.verifyShareGrant});
 assert.equal(blue.summary,base.summary);assert.equal(blue.filesTested,73);
 assert.equal(blue.stage,'deployed_verified');
 const all=JSON.stringify(blue);
 assert.ok(!all.includes(base.customerId)&&!all.includes(base.sessionId)&&!all.includes(receiptA)&&!all.includes('wallet'));
 await assert.rejects(exportBitBlueprint(p,{verifyShareGrant:async()=>false}),/share_not_authorized/);
 const privateP=await createBitCandidate({...base,reuse:{...base.reuse,permission:'private'}},adapters);
 await assert.rejects(exportBitBlueprint(privateP,adapters),/share_not_authorized/);
});
test('matches useful tags without claiming execution or a payment',async()=>{
 const p=await createBitCandidate(base,adapters);
 const r=matchReusableBit(p,{tags:['testing'],goal:'Need deployment tests'});
 assert.equal(r.match,true);assert.equal(r.transferStatus,'not_requested');assert.equal(r.executable,false);
 assert.equal(matchReusableBit(p,{tags:['unrelated'],goal:'Design logos'}).match,false);
});
test('peer transfer only creates a request, never a balance mutation',async()=>{
 const p=await createBitCandidate(base,adapters);
 const intent=await draftPeerTransfer(p,{fromWalletId:'wallet_sender',toWalletId:'wallet_receiver',grantId:'grant_12345678',verifyTransferAuthorization:async()=>true});
 assert.equal(intent.status,'pending_server_settlement');assert.equal(intent.creditsMoved,0);
 assert.equal(intent.asset,'BUBBLE_BIT');assert.equal(intent.amount,1);
 await assert.rejects(draftPeerTransfer(p,{fromWalletId:'wallet_sender',toWalletId:'wallet_sender',grantId:'grant_12345678',verifyTransferAuthorization:async()=>true}),/invalid_transfer/);
 await assert.rejects(draftPeerTransfer(p,{fromWalletId:'wallet_sender',toWalletId:'wallet_receiver',grantId:'grant_12345678',verifyTransferAuthorization:async()=>false}),/transfer_not_authorized/);
});
