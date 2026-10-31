import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyQuantMailLive} from '../scripts/verify-quant-mail-passkey-live.mjs';

const response=(body,status=200,headers={'Cache-Control':'no-store, private'})=>
 Response.json(body,{status,headers});
const request=async(url,options={})=>options.method==='POST'
 ?options.headers?.Origin==='https://quantaphi.org'
   ?response({ok:false,error:'passkey_service_not_ready'},503)
   :response({ok:false,error:'origin_not_allowed'},403)
 :response({ok:true,enabled:false,registrationReady:false,
   loginReady:false,rpId:'quantaphi.org'});
test('live smoke accepts correctly routed, disabled-by-default WebAuthn server',async()=>{
 const output=await verifyQuantMailLive({request});
 assert.deepEqual(output,{ok:true,serverReached:true,enabled:false,
  originDenied:true,noOriginDenied:true,anonymousOwnerDenied:true,rpId:'quantaphi.org'});
});
test('live smoke rejects old Worker origin-denied status instead of claiming success',async()=>{
 const old=async()=>response({ok:false,error:'origin_not_allowed'},403);
 await assert.rejects(verifyQuantMailLive({request:old}),/passkey_status_http_403/);
});
test('live smoke rejects deceptive readiness, cached responses, and alias leaks',async()=>{
 for(const [body,headers,error] of [
  [{ok:true,enabled:true,registrationReady:false,loginReady:true,rpId:'quantaphi.org'},
   {'Cache-Control':'no-store'},/passkey_status_inconsistent/],
  [{ok:true,enabled:false,registrationReady:false,loginReady:false,rpId:'quantaphi.org'},
   {'Cache-Control':'public, max-age=60'},/passkey_status_cacheable/],
  [{ok:true,enabled:false,registrationReady:false,loginReady:false,
   rpId:'quantaphi.org',aliases:['private-owner-address']},
   {'Cache-Control':'no-store'},/passkey_private_owner_data_exposed/]
 ]){
  const responseForTest=async(url,init)=>init?.method==='POST'
   ?response({ok:false},403):response(body,200,headers);
  await assert.rejects(verifyQuantMailLive({request:responseForTest}),error);
 }
});
test('live smoke refuses a Worker that allows cross-origin registration',async()=>{
 const vulnerable=async(url,init)=>init?.method==='POST'
  ?response({ok:true},200)
  :response({ok:true,enabled:true,registrationReady:true,
   loginReady:true,rpId:'quantaphi.org'});
 await assert.rejects(verifyQuantMailLive({request:vulnerable}),
  /passkey_cross_origin_denial_missing/);
});

test('live smoke accepts enabled server only if anonymous enrollment is wallet-denied',async()=>{
 const secure=async(url,options={})=>{
  if(options.method==='POST')return options.headers?.Origin==='https://quantaphi.org'
   ?response({ok:false,error:'owner_verification_required'},401)
   :response({ok:false,error:'origin_not_allowed'},403);
  return response({ok:true,enabled:true,registrationReady:true,
   loginReady:true,rpId:'quantaphi.org'});
 };
 const result=await verifyQuantMailLive({request:secure});
 assert.equal(result.enabled,true);
 assert.equal(result.anonymousOwnerDenied,true);
});
test('live smoke catches private alias enumeration before authentication',async()=>{
 const aliasProber=async(url,options={})=>{
  if(options.method==='POST')return options.headers?.Origin==='https://quantaphi.org'
   ?response({ok:false,error:'owner_alias_invalid'},400)
   :response({ok:false,error:'origin_not_allowed'},403);
  return response({ok:true,enabled:true,registrationReady:true,
   loginReady:true,rpId:'quantaphi.org'});
 };
 await assert.rejects(verifyQuantMailLive({request:aliasProber}),
  /passkey_anonymous_owner_denial_missing/);
});
test('disabled passkey service must reject synthetic owner POST without enabling enrollment',async()=>{
 const mistakenlyOpen=async(url,options={})=>{
  if(options.method==='POST')return options.headers?.Origin==='https://quantaphi.org'
   ?response({ok:true,attemptId:'unsafe'},200)
   :response({ok:false,error:'origin_not_allowed'},403);
  return response({ok:true,enabled:false,registrationReady:false,
   loginReady:false,rpId:'quantaphi.org'});
 };
 await assert.rejects(verifyQuantMailLive({request:mistakenlyOpen}),
  /passkey_anonymous_owner_denial_missing/);
});
