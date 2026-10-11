const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const source=fs.readFileSync('workers/quantaphi-site/worker.js','utf8');
const app=import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const origin='https://quantaphi.org';

test('Quant-AI mount normalizes its base path without leaving the paid origin',async()=>{
 const worker=(await app).default;
 const response=await worker.fetch(new Request(origin+'/quant-ai?tab=quants'),{});
 assert.equal(response.status,308);
 assert.equal(response.headers.get('location'),origin+'/quant-ai/?tab=quants');
});

test('Quant-AI static assets and authenticated API use the private service binding',async()=>{
 const worker=(await app).default;
 const received=[];
 const env={QUANT_AI:{async fetch(request){
  received.push({
   url:request.url,
   method:request.method,
   authorization:request.headers.get('authorization'),
   body:request.method==='POST'?await request.text():null
  });
  return new Response(request.method==='POST'?'{"quants":[]}':'asset',{
   status:200,
   headers:{'content-type':request.method==='POST'?'application/json':'text/plain','cache-control':'public,max-age=999'}
  });
 }}};
 for(const resource of ['/quant-ai/','/quant-ai/index.html','/quant-ai/styles.css','/quant-ai/app.js']){
  const response=await worker.fetch(new Request(origin+resource),env);
  assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  assert.equal(response.headers.get('x-quantaphi-app'),'Quant-AI');
 }
 const token='sq_'+'a'.repeat(40);
 const request=new Request(origin+'/quant-ai/api/packets?source=wallet',{
  method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},
  body:JSON.stringify({version:2})
 });
 const response=await worker.fetch(request,env);
 assert.equal(response.status,200);
 assert.equal(received.length,5);
 assert.deepEqual(received.map(x=>new URL(x.url).pathname),['/','/index.html','/styles.css','/app.js','/api/packets']);
 assert.equal(new URL(received[4].url).origin,origin);
 assert.equal(new URL(received[4].url).search,'?source=wallet');
 assert.equal(received[4].authorization,'Bearer '+token);
 assert.equal(received[4].body,'{"version":2}');
});

test('without service binding Quant-AI fails closed rather than leaking tokens to GitHub',async()=>{
 const worker=(await app).default;
 const response=await worker.fetch(new Request(origin+'/quant-ai/api/quants/owned',{headers:{authorization:'Bearer sq_'+'b'.repeat(40)}}),{});
 assert.equal(response.status,503);
 const data=await response.json();
 assert.equal(data.error,'quant_ai_service_not_configured');
 assert.equal(response.headers.get('cache-control'),'no-store');
});

test('existing Code Phi service routing remains independent',async()=>{
 const worker=(await app).default;
 let called=false;
 const response=await worker.fetch(new Request(origin+'/api/codephi/health'),{CODEPHI:{fetch:async req=>{
  called=true;return new Response(req.url,{status:200});
 }}});
 assert.equal(response.status,200);
 assert.equal(called,true);
 assert.equal(await response.text(),origin+'/api/codephi/health');
});
