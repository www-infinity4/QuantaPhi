import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import worker from '../src/ingest.ts';

const ID='authenticated-user-123';
const SIGNING_SECRET='test-identity-secret';
const data=(id=ID)=>({
  user:{id,device_type:'mobile'},
  queries:[{id:'event-01234567',event_type:' Watches Football ',target_entity:' NFL ',numerical_value:1}],
});
function request(body=data(),{signedUser=ID,geo='0',ts=Date.now(),validSignature=true}={}) {
  const signature=createHmac('sha256',SIGNING_SECRET)
    .update(['v1',signedUser,ts,geo].join('\n')).digest('hex');
  const headers={
    authorization:'Bearer trusted-service-token',
    'content-type':'application/json',
    'x-quant-identity-time':String(ts),
    'x-quant-identity-geo':geo,
    'x-quant-identity-signature':validSignature?signature:'0'.repeat(64),
  };
  const req=new Request('https://quantaphi.org/v1/events',{method:'POST',headers,body:JSON.stringify(body)});
  req.cf={region:'Iowa',regionCode:'IA',postalCode:'52577'};
  return req;
}
function fixture(extra={}) {
  const sent=[], writes=[];
  const env={
    INGEST_TOKEN:'trusted-service-token',
    USER_IDENTITY_HMAC_SECRET:SIGNING_SECRET,
    GEO_STORAGE_ENABLED:'false',
    INGEST_MODE:'queue',
    EVENT_QUEUE:{async send(item){sent.push(item);}},
    DB:{prepare(sql){return{bind(...args){return{sql,args}}}},async batch(statements){writes.push(statements);return[]}},
    ...extra,
  };
  return {env,sent,writes};
}
test('valid service bearer cannot bypass a missing server-signed identity',async()=>{
  const {env,sent}=fixture();
  const req=request();req.headers.delete('x-quant-identity-signature');
  assert.equal((await worker.fetch(req,env)).status,401);
  assert.equal(sent.length,0);
});
test('signed identity is tied to the authenticated subject, not the browser JSON ID',async()=>{
  const {env,sent}=fixture();
  assert.equal((await worker.fetch(request(data('other-user-123456')),env)).status,401);
  assert.equal(sent.length,0);
});
test('reject tampered, expired and malformed geo claims',async()=>{
  const {env,sent}=fixture();
  assert.equal((await worker.fetch(request(data(),{validSignature:false}),env)).status,401);
  assert.equal((await worker.fetch(request(data(),{ts:Date.now()-3600_000}),env)).status,401);
  assert.equal((await worker.fetch(request(data(),{geo:'YES'}),env)).status,401);
  assert.equal(sent.length,0);
});
test('edge metadata is absent unless both server flag and signed consent permit it',async()=>{
  const {env,sent}=fixture();
  assert.equal((await worker.fetch(request(data(),{geo:'1'}),env)).status,202);
  assert.deepEqual(sent[0].edge,{region:null,stateCode:null,postalCode:null});
  env.GEO_STORAGE_ENABLED='true';
  assert.equal((await worker.fetch(request(data(),{geo:'0'}),env)).status,202);
  assert.deepEqual(sent[1].edge,{region:null,stateCode:null,postalCode:null});
  assert.equal((await worker.fetch(request(data(),{geo:'1'}),env)).status,202);
  assert.deepEqual(sent[2].edge,{region:'Iowa',stateCode:'IA',postalCode:'52577'});
});
test('unconfigured mode must fail closed without enqueue or D1 write',async()=>{
  const {env,sent,writes}=fixture({INGEST_MODE:undefined});
  assert.equal((await worker.fetch(request(),env)).status,503);
  assert.equal(sent.length,0);
  assert.equal(writes.length,0);
});
test('unconfigured identity verifier must fail closed',async()=>{
  const {env,sent,writes}=fixture({USER_IDENTITY_HMAC_SECRET:''});
  assert.equal((await worker.fetch(request(),env)).status,503);
  assert.equal(sent.length,0);
  assert.equal(writes.length,0);
});
