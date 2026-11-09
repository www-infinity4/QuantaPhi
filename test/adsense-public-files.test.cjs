'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const workerSource=fs.readFileSync('workers/quantaphi-site/worker.js','utf8')
 .replace(/^import \{videoAPI\} from '.\/video-api.mjs';\s*/,'')
 .replace('export default','globalThis.worker=');
function workerWithOfflineOrigins(){
 let originCalls=0;
 const context={
  URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,
  fetch:async()=>{originCalls++;throw Error('GitHub origin unavailable');}
 };
 vm.runInNewContext(workerSource,context);
 return {worker:context.worker, getOriginCalls:()=>originCalls};
}

for(const file of ['robots.txt','ads.txt']){
 test(file+' is a public HTTP 200 plain-text response even when GitHub is offline',async()=>{
  const env=workerWithOfflineOrigins();
  const response=await env.worker.fetch(new Request('https://quantaphi.org/'+file),{});
  assert.equal(response.status,200);
  assert.match(response.headers.get('Content-Type')||'',/^text\/plain\b/i);
  assert.equal(await response.text(),fs.readFileSync(file,'utf8'));
  assert.equal(env.getOriginCalls(),0);
 });
 test(file+' HEAD is successful with no body or upstream request',async()=>{
  const env=workerWithOfflineOrigins();
  const response=await env.worker.fetch(new Request('https://quantaphi.org/'+file,{method:'HEAD'}),{});
  assert.equal(response.status,200);
  assert.equal(await response.text(),'');
  assert.equal(env.getOriginCalls(),0);
 });
 test(file+' on www uses existing canonical redirect',async()=>{
  const env=workerWithOfflineOrigins();
  const response=await env.worker.fetch(new Request('https://www.quantaphi.org/'+file),{});
  assert.equal(response.status,308);
  assert.equal(response.headers.get('Location'),'https://quantaphi.org/'+file);
  assert.equal(env.getOriginCalls(),0);
 });
}

test('robots file permits all public crawlers including Mediapartners-Google',()=>{
 const robots=fs.readFileSync('robots.txt','utf8');
 assert.match(robots,/User-agent: \*/i);
 assert.match(robots,/Allow: \//i);
 assert.doesNotMatch(robots,/Disallow:\s*\//i);
});

test('ads.txt publisher matches head script and authorised seller format',()=>{
 const ads=fs.readFileSync('ads.txt','utf8');
 const html=fs.readFileSync('index.html','utf8');
 assert.equal(ads.trim(),'google.com, pub-4614831062084491, DIRECT, f08c47fec0942fa0');
 assert.match(html.slice(0,3000),/adsbygoogle\.js\?client=ca-pub-4614831062084491/);
});
