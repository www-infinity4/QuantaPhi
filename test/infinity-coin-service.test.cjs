const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const app=import(pathToFileURL(path.resolve('workers/quantaphi-site/worker.js')).href);
const root='https://quantaphi.org';

test('read-only connection diagnostics fail closed without a Quant AI binding',async()=>{
 const worker=(await app).default;
 const response=await worker.fetch(new Request(root+'/api/infinity-connections'),{});
 assert.equal(response.status,503);
 assert.equal((await response.json()).quantAi,'BINDING_MISSING');
 assert.equal(response.headers.get('cache-control'),'no-store');
});

test('private Quant AI authentication route is checked without leaking credentials',async()=>{
 const worker=(await app).default; let seen;
 const response=await worker.fetch(new Request(root+'/api/infinity-connections',{
  headers:{Authorization:'Bearer userprivate',Cookie:'session=userprivate'}
 }),{QUANT_AI:{fetch:async request=>{
  seen=request;
  return Response.json({error:'authorization_required'},{status:401});
 }}});
 assert.equal(response.status,200);
 const json=await response.json();
 assert.equal(json.quantAi,'AUTH_ROUTE_REACHABLE');
 assert.equal(json.wallet,'NOT_CHECKED');
 assert.equal(json.mint,'NOT_CHECKED');
 assert.equal(json.model,'NOT_CHECKED');
 assert.equal(seen.headers.get('authorization'),null);
 assert.equal(seen.headers.get('cookie'),null);
 assert.equal(new URL(seen.url).pathname,'/api/quants/owned');
});
test('response 200 from unauthenticated upstream is not declared healthy',async()=>{
 const worker=(await app).default;
 const response=await worker.fetch(new Request(root+'/api/infinity-connections'),{
  QUANT_AI:{fetch:async()=>Response.json({ok:true})}
 });
 assert.equal(response.status,503);
 assert.equal((await response.json()).quantAi,'ROUTE_UNVERIFIED');
});
