import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyQuantMailLive} from '../scripts/verify-quant-mail-passkey-live.mjs';

const response=(body,status=200,headers={'Cache-Control':'no-store, private'})=>
 Response.json(body,{status,headers});
const request=async(url,options={})=>options.method==='POST'
 ?response({ok:false,error:'origin_not_allowed'},403)
 :response({ok:true,enabled:false,registrationReady:false,
   loginReady:false,rpId:'quantaphi.org'});
test('live smoke accepts correctly routed, disabled-by-default WebAuthn server',async()=>{
 const output=await verifyQuantMailLive({request});
 assert.deepEqual(output,{ok:true,serverReached:true,enabled:false,
  originDenied:true,noOriginDenied:true,rpId:'quantaphi.org'});
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
