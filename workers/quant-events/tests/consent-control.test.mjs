import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleEventConsent} from '../src/consent-control.mjs';

const token='sq_'+'t'.repeat(40);
const secret='synthetic-test-consent-key';
const url='https://quantaphi.org/api/quant-events/consent';
const pseudo='ev_'+createHmac('sha256',secret).update('quant-events-user-v1\n501').digest('hex');
function fixture(){
  const sqlite=new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0002_quant_event_consents.sql',import.meta.url),'utf8'));
  const calls={wallet:0};
  const env={
    EVENT_CONSENT_MANAGEMENT_ENABLED:'true',
    USER_IDENTITY_HMAC_SECRET:secret,
    BOT_WALLET:{async fetch(_url,options){calls.wallet++;assert.equal(options.headers.Authorization,'Bearer '+token);return Response.json({ok:true,user:{id:501}});}},
    EVENT_CONSENT_DB:{prepare(q){return{bind(...args){const stmt=sqlite.prepare(q);return {
      async first(){return stmt.get(...args)||null;},
      async run(){const r=stmt.run(...args);return {success:true,meta:{changes:r.changes}};}
    };}}}
  };
  return {sqlite,calls,env};
}
function request(method='GET',body,headers={}){
  return new Request(url,{method,headers:{
    Origin:'https://quantaphi.org',
    Authorization:'Bearer '+token,
    ...(method==='POST'?{'Content-Type':'application/json'}:{}),
    ...headers
  },...(method==='POST'?{body:JSON.stringify(body)}:{})});
}
test('GET status is never implied consent and does not write',async()=>{
  const f=fixture();try{
    const r=await handleEventConsent(request(),f.env);
    assert.equal(r.status,200);
    assert.deepEqual(await r.json(),{enabled:false,policyVersion:'v1',location:false});
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM quant_event_consents').get().n,0);
  }finally{f.sqlite.close();}
});
test('requires explicit checked opt-in and policy version, never browser-selected identity',async()=>{
  const f=fixture();try{
    for(const value of [
      {action:'grant',policy_version:'v1'},
      {action:'grant',opt_in:true,policy_version:'v0'},
      {action:'grant',opt_in:true,policy_version:'v1',userId:'some-other-user'}
    ]){
      const res=await handleEventConsent(request('POST',value),f.env);
      assert.ok(res.status>=400);
    }
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM quant_event_consents').get().n,0);
  }finally{f.sqlite.close();}
});
test('authorized opt-in, GET status, and revocation operate on verified account only',async()=>{
  const f=fixture();try{
    const grant=await handleEventConsent(request('POST',{action:'grant',opt_in:true,policy_version:'v1'}),f.env);
    assert.equal(grant.status,200);
    assert.deepEqual(await grant.json(),{enabled:true,policyVersion:'v1',location:false});
    const row=f.sqlite.prepare('SELECT * FROM quant_event_consents').get();
    assert.equal(row.user_id,pseudo);
    assert.equal(row.purpose,'analytics');
    assert.equal(row.revoked_at_ms,null);
    assert.equal((await (await handleEventConsent(request(),f.env)).json()).enabled,true);
    const revoke=await handleEventConsent(request('POST',{action:'revoke'}),f.env);
    assert.equal(revoke.status,200);
    assert.equal((await revoke.json()).enabled,false);
    assert.ok(f.sqlite.prepare('SELECT revoked_at_ms FROM quant_event_consents').get().revoked_at_ms>0);
    assert.equal((await (await handleEventConsent(request(),f.env)).json()).enabled,false);
  }finally{f.sqlite.close();}
});
test('disabled, cross-site, paired browser, failed Wallet, or missing D1 cannot grant',async()=>{
  const f=fixture();try{
    for(const [change,req,status] of [
      [{EVENT_CONSENT_MANAGEMENT_ENABLED:undefined},request('POST',{action:'grant',opt_in:true,policy_version:'v1'}),503],
      [{},request('POST',{action:'grant',opt_in:true,policy_version:'v1'},{Origin:'https://evil.example'}),403],
      [{},request('POST',{action:'grant',opt_in:true,policy_version:'v1'},{Authorization:'Bearer bc_'+'z'.repeat(40)}),401],
      [{BOT_WALLET:{async fetch(){return new Response('',{status:401});}}},request('POST',{action:'grant',opt_in:true,policy_version:'v1'}),401],
      [{EVENT_CONSENT_DB:undefined},request('POST',{action:'grant',opt_in:true,policy_version:'v1'}),503]
    ]) {
      const response=await handleEventConsent(req,{...f.env,...change});
      assert.equal(response.status,status);
    }
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM quant_event_consents').get().n,0);
  }finally{f.sqlite.close();}
});
test('revocation without a prior grant never grants consent',async()=>{
  const f=fixture();try{
    const response=await handleEventConsent(request('POST',{action:'revoke'}),f.env);
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{enabled:false,policyVersion:'v1',location:false});
    assert.equal(f.sqlite.prepare('SELECT count(*) n FROM quant_event_consents').get().n,0);
  }finally{f.sqlite.close();}
});
