import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/bubbles-tools/worker.mjs';

const request = text => new Request('https://tools/v1/assist', {
  method: 'POST',
  headers: {'Origin':'https://quantaphi.org','Content-Type':'application/json'},
  body: JSON.stringify({request:text})
});

test('ordinary Bubbles chat chooses the lighter free Workers AI model', async () => {
  const calls=[];
  const res=await worker.fetch(request('Hello Bubbles'),{
    AI:{run:async (model,options)=>{calls.push(model);return {response:'Hello, what would you like to discuss?'};}}
  });
  const body=await res.json();
  assert.equal(res.status,200);
  assert.deepEqual(calls,['@cf/openai/gpt-oss-20b']);
  assert.equal(body.model,'@cf/openai/gpt-oss-20b');
  assert.equal(body.receipt.status,'complete');
});

test('complex Owner Brain work retains stronger reasoning model', async () => {
  const calls=[];
  const res=await worker.fetch(request('Explain the architecture of my robot brain repository deployment'),{
    AI:{run:async model=>{calls.push(model);return {response:'The deployment requires an authenticated runner, exact-head tests and independently verified production release.'};}}
  });
  const body=await res.json();
  assert.equal(res.status,200);
  assert.deepEqual(calls,['@cf/openai/gpt-oss-120b']);
  assert.equal(body.model,'@cf/openai/gpt-oss-120b');
});

test('a small-model transient failure does not silently spend a third retry on that same model', async () => {
  const calls=[];
  const res=await worker.fetch(request('How are you, Bubbles?'),{
    AI:{run:async model=>{calls.push(model);throw Error('temporary_inference_error');}}
  });
  assert.equal(res.status,502);
  assert.deepEqual(calls,['@cf/openai/gpt-oss-20b','@cf/openai/gpt-oss-20b']);
});
