import test from 'node:test';
import assert from 'node:assert/strict';
import {authorized,publicUrl,validate,tinyfishBroker} from '../workers/continuity-session-coordinator/tinyfish-broker.mjs';
import {readViaTinyfish} from '../workers/bubbles-tools/tinyfish-client.mjs';
const token='a'.repeat(64);
const req=(body,auth=token)=>new Request('https://coordinator.internal/internal/tinyfish',{
 method:'POST',headers:{'Content-Type':'application/json','X-Tinyfish-Bridge-Token':auth},body:JSON.stringify(body)});
const env={TINYFISH_BRIDGE_TOKEN:token,TINYFISH_API_KEY:'test-only-secret'};

test('rejects unauthenticated calls and methods before upstream fetch',async()=>{
 let calls=0;
 const mock=async()=>{calls++;throw Error('must not call')};
 assert.equal((await tinyfishBroker(req({operation:'search',query:'robots'},'bad'),env,mock)).status,401);
 assert.equal((await tinyfishBroker(new Request('https://coordinator.internal/internal/tinyfish'),env,mock)).status,405);
 assert.equal(calls,0);
 assert.equal(authorized(req({operation:'search',query:'robots'}),env),true);
});
test('rejects private targets, credential URLs, and unknown operations',async()=>{
 for(const url of ['http://example.com','https://localhost/','https://10.0.0.8/',
 'https://127.0.0.1/','https://thing.internal/','https://user:pass@example.com/'])
  assert.equal(publicUrl(url),null,url);
 assert.ok(publicUrl('https://example.com/shop'));
 assert.equal(validate({operation:'delete',url:'https://example.com'}),null);
 assert.equal(validate({operation:'fetch',url:'https://127.0.0.1'}),null);
 assert.equal(validate({operation:'search',query:'a'}),null);
});
test('search uses fixed TinyFish host with secret only upstream',async()=>{
 let seen;const mock=async(url,options)=>{
  seen={url,options};
  return Response.json({results:[{title:'Verified Test',url:'https://example.com'}]});
 };
 const response=await tinyfishBroker(req({operation:'search',query:'cast iron'}),env,mock);
 const output=await response.json();
 assert.equal(response.status,200);
 assert.equal(output.provider,'TinyFish');
 assert.equal(output.receipt.paidAutomation,false);
 assert.match(seen.url,/^https:\/\/api\.search\.tinyfish\.ai\//);
 assert.equal(seen.options.headers['X-API-Key'],'test-only-secret');
 assert.doesNotMatch(JSON.stringify(output),/test-only-secret/);
});
test('Bubbles forwards only to the private coordinator and returns provenance',async()=>{
 let target,passed;
 const caller={TINYFISH_BRIDGE_TOKEN:token,TINYFISH_BROKER:{fetch:async request=>{
  target=request.url;passed=request.headers.get('X-Tinyfish-Bridge-Token');
  return Response.json({ok:true,provider:'TinyFish',sourceUrl:'https://example.com/',data:{markdown:'Real page text'},
   observedAt:'2026-10-27T15:00:00Z'});
 }}};
 const request=new Request('https://bubbles-tools.internal/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org'}});
 const response=await readViaTinyfish(request,caller,{tool:'tinyfish.fetch',url:'https://example.com'});
 const data=await response.json();
 assert.equal(target,'https://continuity-session-coordinator.internal/internal/tinyfish');
 assert.equal(passed,token);assert.equal(data.output,'Real page text');
 assert.equal(data.receipt.status,'complete');
});
