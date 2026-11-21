import test from 'node:test';
import assert from 'node:assert/strict';
import site from '../../quantaphi-site/worker.js';

test('site Worker exposes only a fail-closed, disabled Quant events route', async()=>{
  const request=new Request('https://quantaphi.org/api/quant-events',{
    method:'POST',
    headers:{
      Origin:'https://quantaphi.org',
      Authorization:'Bearer sq_'+'x'.repeat(40),
      'Content-Type':'application/json',
    },
    body:JSON.stringify({queries:[{id:'event-00000001',event_type:'card_click',target_entity:'card:physics',numerical_value:1}]})
  });
  const response=await site.fetch(request,{},{});
  assert.equal(response.status,503);
  assert.deepEqual(await response.json(),{error:'event_collection_disabled'});
});
