import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeBubblesBits,validateBitReceipt} from '../workers/infinity-brain-clock/bubbles-bits.mjs';

const owner='a'.repeat(64);
const receipt=(id,step='github_read')=>({id,ownerHash:owner,sessionId:'session-123',step,status:'verified',evidence:{tool:step==='personal_context'?'brain.owner_context':'github.read_file',receiptId:'tool-'+id,sourceSha:'b'.repeat(40)},quantData:{source:'GitHub'}});
test('only authenticated server-verified eligible steps count; text is never currency',()=>{
 const result=summarizeBubblesBits([receipt('context','personal_context'),receipt('step-1'),{...receipt('step-2'),status:'thinking'},receipt('step-3','assistant_message')],{ownerHash:owner,sessionId:'session-123'});
 assert.equal(result.eligibleCount,2);assert.equal(result.provisionalBits,2);assert.equal(result.spendableBits,0);
});
test('replayed receipts never credit twice',()=>{
 const result=summarizeBubblesBits([receipt('context','personal_context'),receipt('step-1'),receipt('step-1')],{ownerHash:owner,sessionId:'session-123'});
 assert.equal(result.eligibleCount,2);assert.equal(result.duplicates,1);
});
test('cross-user and cross-session events are rejected',()=>{
 const result=summarizeBubblesBits([receipt('context','personal_context'),receipt('ok'),{...receipt('bad'),ownerHash:'c'.repeat(64)},{...receipt('other'),sessionId:'other-session'}],{ownerHash:owner,sessionId:'session-123'});
 assert.equal(result.eligibleCount,2);assert.equal(result.rejected,2);
});
test('unverified or missing tool evidence cannot be credited',()=>{
 assert.equal(validateBitReceipt({...receipt('bad'),evidence:{}},owner,'session-123'),false);
 assert.equal(validateBitReceipt({...receipt('bad'),status:'completed'},owner,'session-123'),false);
 assert.equal(validateBitReceipt(receipt('ok'),owner,'session-123'),true);
});
test('context retrieval must be the first verified iteration step',()=>{
 const events=[receipt('read'),receipt('context','personal_context')];
 const result=summarizeBubblesBits(events,{ownerHash:owner,sessionId:'session-123'});
 assert.equal(result.eligibleCount,0);assert.equal(result.blockedReason,'personal_context_first_required');
});
test('counter cannot mint or spend without an authoritative wallet',()=>{
 const result=summarizeBubblesBits([receipt('context','personal_context'),receipt('read')],{ownerHash:owner,sessionId:'session-123'});
 assert.equal(result.eligibleCount,2);assert.equal(result.provisionalBits,2);assert.equal(result.spendableBits,0);assert.equal(result.walletWrites,0);
});

test('the same signed tool receipt with different event IDs must never count twice',()=>{
 const original=receipt('first');
 const replay={...receipt('different'),evidence:{...original.evidence}};
 const result=summarizeBubblesBits([receipt('context','personal_context'),original,replay],{ownerHash:owner,sessionId:'session-123'});
 assert.equal(result.eligibleCount,2);assert.equal(result.duplicates,1);
});
test('step evidence must come from the matching tool family, not an unrelated read',()=>{
 const fakeContext=receipt('context','personal_context');
 fakeContext.evidence.tool='github.read_file';
 assert.equal(validateBitReceipt(fakeContext,owner,'session-123'),false);
 const fakeMerge={...receipt('merge','pr_merge'),evidence:{tool:'github.read_file',receiptId:'tool-merge',sourceSha:'b'.repeat(40)}};
 assert.equal(validateBitReceipt(fakeMerge,owner,'session-123'),false);
});
test('unbounded receipt arrays fail closed instead of quietly truncating the ledger',()=>{
 const tooMany=Array.from({length:501},(_,i)=>receipt('step-'+i));
 tooMany.unshift(receipt('context','personal_context'));
 assert.throws(()=>summarizeBubblesBits(tooMany,{ownerHash:owner,sessionId:'session-123'}),/too_many|limit/i);
});
