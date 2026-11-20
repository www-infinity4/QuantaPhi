import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {handleWalletEventIngress} from '../src/wallet-bridge.mjs';

const URL='https://quantaphi.org/api/quant-events';
const WALLET='sq_'+'a'.repeat(40);
const SECRET='test-secret-not-for-production';
function request(body={queries:[{id:'event-00000001',event_type:'card_click',target_entity:'card:physics',numerical_value:1}]}, init={}) {
  return new Request(URL,{method:'POST',headers:{
    Origin:'https://quantaphi.org',
    Authorization:'Bearer '+WALLET,
    'Content-Type':'application/json',
    ...(init.headers??{})
  },body:JSON.stringify(body)});
}
function fixture(overrides={}) {
  const calls={wallet:0,consent:0,events:0,subject:null,upstream:null};
  const env={
    EVENTS_BRIDGE_ENABLED:'true',
    USER_IDENTITY_HMAC_SECRET:SECRET,
    INGEST_TOKEN:'internal-only-token',
    BOT_WALLET:{async fetch(_url,options) {
      calls.wallet++;
      assert.equal(options.headers.Authorization,'Bearer '+WALLET);
      return Response.json({ok:true,user:{id:317}});
    }},
    EVENT_CONSENT_DB:{prepare(sql) {
      assert.match(sql,/quant_event_consents/);
      return {bind(user,purpose){
        calls.consent++; calls.subject=user;
        assert.equal(purpose,'analytics');
        return {async first(){return {policy_version:'v1',consented_at_ms:Date.now()-1000,revoked_at_ms:null}}};
      }};
    }},
    EVENTS_SERVICE:{async fetch(req) {
      calls.events++;calls.upstream=req;
      return Response.json({received:1,accepted:1,persisted:false},{status:202});
    }},
    ...overrides,
  };
  return {env,calls};
}

test('closed feature flag causes no wallet, consent or ingestion call',async()=>{
  const {env,calls}=fixture({EVENTS_BRIDGE_ENABLED:undefined});
  assert.equal((await handleWalletEventIngress(request(),env)).status,503);
  assert.deepEqual([calls.wallet,calls.consent,calls.events],[0,0,0]);
});
test('requires authenticated Wallet subject and rejects paired-browser tokens',async()=>{
  const {env,calls}=fixture({BOT_WALLET:{async fetch(){return new Response('unauthorized',{status:401})}}});
  assert.equal((await handleWalletEventIngress(request(),env)).status,401);
  assert.equal(calls.events,0);
  const pairReq=request(undefined,{headers:{Authorization:'Bearer bc_'+'b'.repeat(40)}});
  assert.equal((await handleWalletEventIngress(pairReq,env)).status,401);
});
test('rejects wrong-origin requests and untrusted user IDs',async()=>{
  const {env,calls}=fixture();
  assert.equal((await handleWalletEventIngress(request(undefined,{headers:{Origin:'https://evil.example'}}),env)).status,403);
  assert.equal((await handleWalletEventIngress(request({user:{id:'victim-user'},queries:[{id:'event-00000001',event_type:'card_click',target_entity:'card:physics',numerical_value:1}]}),env)).status,422);
  assert.equal(calls.events,0);
});
test('requires consent record and refuses revoked and outdated policy',async()=>{
  for(const record of [null,{policy_version:'v1',consented_at_ms:Date.now()-1000,revoked_at_ms:Date.now()-5},{policy_version:'old',consented_at_ms:Date.now()-1000,revoked_at_ms:null}]) {
    const {env,calls}=fixture({EVENT_CONSENT_DB:{prepare(){return {bind(){return{async first(){return record;}}}}}}});
    assert.equal((await handleWalletEventIngress(request(),env)).status,403);
    assert.equal(calls.events,0);
  }
});
test('uses Wallet subject, pseudonym and signed internal-only request with no geo flag',async()=>{
  const {env,calls}=fixture();
  const result=await handleWalletEventIngress(request(),env);
  assert.equal(result.status,202);
  assert.deepEqual(await result.json(),{received:1,accepted:1,persisted:false});
  assert.equal(calls.wallet,1);
  assert.equal(calls.consent,1);
  assert.equal(calls.events,1);
  const backend=calls.upstream;
  assert.equal(backend.url,'https://quant-events.internal/v1/events');
  assert.equal(backend.headers.get('authorization'),'Bearer internal-only-token');
  assert.equal(backend.headers.get('x-quant-identity-geo'),'0');
  const payload=await backend.json();
  assert.match(payload.user.id,/^ev_[0-9a-f]{64}$/);
  assert.equal(payload.user.id,calls.subject);
  assert.notEqual(payload.user.id,'317');
  assert.equal(payload.user.device_type,'unknown');
  assert.equal(payload.queries[0].event_type,'card_click');
  const ts=backend.headers.get('x-quant-identity-time');
  const actual=backend.headers.get('x-quant-identity-signature');
  const expected=createHmac('sha256',SECRET).update(['v1',payload.user.id,ts,'0'].join('\n')).digest('hex');
  assert.equal(actual,expected);
});
test('fail closed on missing consent DB, shared secrets or service binding',async()=>{
  for(const change of [{EVENT_CONSENT_DB:undefined},{USER_IDENTITY_HMAC_SECRET:''},{INGEST_TOKEN:undefined},{EVENTS_SERVICE:undefined}]) {
    const {env,calls}=fixture(change);
    assert.equal((await handleWalletEventIngress(request(),env)).status,503);
    assert.equal(calls.events,0);
  }
});
test('rejects malformed event arrays and does not forward client identity claims',async()=>{
  const {env,calls}=fixture();
  assert.equal((await handleWalletEventIngress(request({queries:[]}),env)).status,400);
  assert.equal((await handleWalletEventIngress(request({queries:[{id:'event-00000001',event_type:' card_click ',target_entity:'card:physics',numerical_value:'1'}]}),env)).status,422);
  assert.equal(calls.events,0);
});
test('upstream failure never claims persistence or falls back to D1',async()=>{
  const {env,calls}=fixture({EVENTS_SERVICE:{async fetch(){calls.events++;return Response.json({error:'queue unavailable'},{status:503});}}});
  const result=await handleWalletEventIngress(request(),env);
  assert.equal(result.status,503);
  assert.equal(calls.events,1);
  assert.equal((await result.json()).persisted,undefined);
});
