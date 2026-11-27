import test from 'node:test';
import assert from 'node:assert/strict';
import {brainRunnerOrigin} from '../scripts/brain-runner-origin.mjs';

test('writer retains existing origin unless explicitly configured',()=>{
 assert.equal(brainRunnerOrigin({}),'https://infinity-brain-clock.marvaseater.workers.dev');
 assert.equal(brainRunnerOrigin({BRAIN_RUNNER_ORIGIN:''}),'https://infinity-brain-clock.marvaseater.workers.dev');
 assert.equal(brainRunnerOrigin({BRAIN_RUNNER_ORIGIN:'https://brain.example.org/'}),'https://brain.example.org');
});
test('writer rejects unsafe or ambiguous origins without exposing values',()=>{
 for(const value of ['http://brain.example.org','https://user:secret@brain.example.org','https://brain.example.org/runner','https://brain.example.org/?token=secret','https://brain.example.org/#x','not a URL','https://brain.example.org\\other',' https://brain.example.org','https://brain.example.org/a/..','https://brain.example.org?','https://brain.example.org#']){
  assert.throws(()=>brainRunnerOrigin({BRAIN_RUNNER_ORIGIN:value}),{message:'brain_runner_origin_invalid'});
 }
});
