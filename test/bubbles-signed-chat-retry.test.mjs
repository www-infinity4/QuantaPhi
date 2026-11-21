import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchPublicAssistantWithRetry} from '../workers/bubbles-cloud-browser/server-assist.mjs';
const endpoint='https://bubbles-tools.marvaseater.workers.dev/v1/assist';
const payload={method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},body:'{"request":"example","mcp":true}',redirect:'manual'};
test('transient public gateway transport loss retries the identical read-only request',async()=>{
 const calls=[];
 const result=await fetchPublicAssistantWithRetry(async(url,options)=>{
  calls.push({url,body:options.body,authorization:options.headers.Authorization,signal:options.signal});
  if(calls.length===1)throw new TypeError('fetch failed');
  return Response.json({ok:true,output:'Read-only result'});
 },endpoint,payload,{pause:async()=>{},now:()=>1000});
 assert.equal(result.status,200);
 assert.equal(calls.length,2);
 assert.equal(calls[0].body,calls[1].body);
 assert.equal(calls[0].url,endpoint);
 assert.equal(calls[0].authorization,undefined);
 assert.ok(calls[0].signal instanceof AbortSignal);
});
test('a successful request is never repeated and no owner authorization is sent',async()=>{
 let n=0;
 const result=await fetchPublicAssistantWithRetry(async(_url,options)=>{
  n++;assert.equal(options.headers.Authorization,undefined);
  return Response.json({ok:true});
 },endpoint,payload,{pause:async()=>{}});
 assert.equal(result.status,200);assert.equal(n,1);
});
test('403 permission refusal is never retried or upgraded',async()=>{
 let n=0;
 const result=await fetchPublicAssistantWithRetry(async()=>{
  n++;return Response.json({ok:false,error:'denied'},{status:403});
 },endpoint,payload,{pause:async()=>{}});
 assert.equal(result.status,403);assert.equal(n,1);
});
test('transient 503 retries once but permanent 503 returns the real status',async()=>{
 let n=0;
 const result=await fetchPublicAssistantWithRetry(async()=>{n++;return new Response('upstream temporary',{status:503});},
 endpoint,payload,{pause:async()=>{},now:()=>1000});
 assert.equal(result.status,503);assert.equal(n,2);
});
test('deadline prevents busy retries and reports the network failure',async()=>{
 let ticks=0,n=0;
 await assert.rejects(fetchPublicAssistantWithRetry(async()=>{
  n++;ticks=3000;throw new TypeError('network offline');
 },endpoint,payload,{pause:async()=>{},now:()=>ticks,deadlineMs:3000}),/network offline/);
 assert.equal(n,1);
});
