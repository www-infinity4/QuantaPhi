import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyPinkTestProvenance} from '../workers/infinity-brain-clock/source-review.mjs';

const changedSource='workers/infinity-brain-clock/source-review.mjs';
const changedTest='test/continuity-source-review-provenance.test.mjs';

test('Pink rejects a newly changed but unrelated test instead of granting a blank exemption',async()=>{
 let reads=0;
 const proven=await verifyPinkTestProvenance([changedSource,changedTest],[changedTest],async()=>{
  reads++;
  return "import {strict as assert} from 'node:assert';\nassert.ok(true);";
 });
 assert.equal(proven,false,'a test changed in the same PR is not automatically linked to the changed source');
 assert.equal(reads,1,'read the exact pinned test content even if that test changed');
});

test('Pink accepts a changed test only when pinned source references the changed production file',async()=>{
 const proven=await verifyPinkTestProvenance([changedSource,changedTest],[changedTest],async path=>{
  assert.equal(path,changedTest);
  return "import {verifyPinkTestProvenance} from '../workers/infinity-brain-clock/source-review.mjs';";
 });
 assert.equal(proven,true);
});

test('Pink rejects a test from a PR with no production changes',async()=>{
 const proven=await verifyPinkTestProvenance([changedTest],[changedTest],async()=>{throw Error('no read expected')});
 assert.equal(proven,false);
});
