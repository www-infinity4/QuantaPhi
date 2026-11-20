import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {readdirSync} from 'node:fs';
import site from '../../quantaphi-site/worker.js';
import ingest from '../src/ingest.ts';

const id='ev_'+'a'.repeat(64);
function ingestRequest(secret='a-tested-signing-secret') {
  const time=String(Date.now());
  const sig=createHmac('sha256',secret).update(['v1',id,time,'0'].join('\n')).digest('hex');
  return new Request('https://quantaphi.org/v1/events',{
    method:'POST',
    headers:{
      authorization:'Bearer test-only-service-token',
      'content-type':'application/json',
      'x-quant-identity-time':time,
      'x-quant-identity-geo':'0',
      'x-quant-identity-signature':sig
    },
    body:JSON.stringify({user:{id,device_type:'unknown'},queries:[
      {id:'review-event-001',event_type:'card_click',target_entity:'card:review',numerical_value:1}
    ]})
  });
}
const env=(secret='a-tested-signing-secret')=>({
  INGEST_MODE:'queue',INGEST_TOKEN:'test-only-service-token',
  USER_IDENTITY_HMAC_SECRET:secret,
  EVENT_QUEUE:{async send(){}}
});
test('ingest errors use no-store, nosniff, and snake_case JSON codes',async()=>{
  const cases=[
    [new Request('https://quantaphi.org/v1/missing'),{},404,'not_found'],
    [new Request('https://quantaphi.org/v1/events'),{},405,'post_required'],
  ];
  for(const [req,settings,status,code] of cases) {
    const result=await ingest.fetch(req,settings);
    assert.equal(result.status,status);
    assert.equal(result.headers.get('cache-control'),'no-store');
    assert.equal(result.headers.get('x-content-type-options'),'nosniff');
    assert.equal((await result.json()).error,code);
  }
});
test('site preference and event routing share secure headers and snake_case payloads',async()=>{
  for(const [url,error] of [
    ['/api/quant-events','event_collection_disabled'],
    ['/api/quant-events/consent','consent_management_disabled']
  ]){
    const res=await site.fetch(new Request('https://quantaphi.org'+url),{},{});
    assert.equal(res.status,503);
    assert.equal(res.headers.get('cache-control'),'no-store');
    assert.equal(res.headers.get('x-content-type-options'),'nosniff');
    assert.equal((await res.json()).error,error);
  }
});
test('HMAC signer key is reused within isolate and re-imported after secret rotation',async()=>{
  const subtle=crypto.subtle;
  const original=subtle.importKey;
  let imports=0;
  subtle.importKey=function(...args){imports++;return original.apply(subtle,args);};
  try {
    assert.equal((await ingest.fetch(ingestRequest(),env())).status,202);
    assert.equal((await ingest.fetch(ingestRequest(),env())).status,202);
    assert.equal((await ingest.fetch(ingestRequest('changed-signing-secret'),env('changed-signing-secret'))).status,202);
    assert.equal(imports,2,'one import per unique signing secret, not per request');
  } finally {subtle.importKey=original;}
});
test('direct D1 failure logs diagnostic without leaking service bearer',async()=>{
  const original=console.error,record=[];
  console.error=(...args)=>record.push(args);
  try {
    const request=ingestRequest();
    const options={...env(),INGEST_MODE:'direct',DIRECT_STAGING_ALLOWED:'true',
      DB:{prepare(){return{bind(){return{}}}},async batch(){throw Error('synthetic database unavailable')}}};
    const response=await ingest.fetch(request,options);
    assert.equal(response.status,503);
    assert.equal(record.length,1);
    const diagnostic=JSON.stringify(record[0]);
    assert.match(diagnostic,/synthetic database unavailable/);
    assert.doesNotMatch(diagnostic,/test-only-service-token/);
  } finally{console.error=original;}
});
test('README names the tests actually present in repository',()=>{
  const tests=readdirSync(new URL('.',import.meta.url)).filter(x=>x.endsWith('.test.mjs'));
  const readme=readFileSync(new URL('../README.md',import.meta.url),'utf8');
  for(const file of tests)assert.ok(readme.includes('tests/'+file),file);
  for(const name of ['tests/ingest.test.mjs','tests/scaling.test.mjs','tests/sqlite-worker.test.mjs']){
    assert.ok(!readme.includes(name),'stale inventory: '+name);
  }
});
