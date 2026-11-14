import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import site from '../../quantaphi-site/worker.js';

const root=new URL('../../../',import.meta.url);
const page=readFileSync(new URL('quant-events-privacy.html',root),'utf8');
const script=readFileSync(new URL('quant-events-privacy.mjs',root),'utf8');
const policy=readFileSync(new URL('privacy.html',root),'utf8');
const accounts=readFileSync(new URL('bubbles-accounts.html',root),'utf8');

test('privacy page has explicit, initially disabled opt-in and revocation controls',()=>{
  assert.match(page,/id="analytics-consent"[^>]+disabled/);
  assert.match(page,/id="save-consent"[^>]+disabled/);
  assert.match(page,/id="revoke-consent"[^>]+disabled/);
  assert.match(page,/id="status" role="status"/);
  assert.match(page,/Location collection stays off/);
  assert.match(page,/existing Google Analytics, AdSense/);
  assert.match(script,/resolveConnectorWalletToken/);
  assert.match(script,/if\(!checkbox.checked\|\|!available\|\|enabled\)return/);
  assert.match(script,/action:'grant',opt_in:true,policy_version:'v1'/);
  assert.match(script,/action:'revoke'/);
  assert.match(script,/apply\(\);/);
  assert.match(policy,/quant-events-privacy\.html/);
  assert.match(accounts,/quant-events-privacy\.html/);
});
test('consent preferences route fails closed by default and remains separate from event collection',async()=>{
  const request=new Request('https://quantaphi.org/api/quant-events/consent',{
    method:'GET',headers:{Origin:'https://quantaphi.org'}
  });
  const disabled=await site.fetch(request,{
    EVENTS_BRIDGE:{async fetch(){throw Error('should not be called');}}
  },{});
  assert.equal(disabled.status,503);
  assert.equal((await disabled.json()).error,'consent_management_disabled');

  let calls=0;
  const enabled=await site.fetch(request,{
    EVENT_CONSENT_MANAGEMENT_ENABLED:'true',
    EVENTS_BRIDGE:{async fetch(req){calls++;assert.equal(req.url,request.url);
      return Response.json({enabled:false,policyVersion:'v1',location:false});}}
  },{});
  assert.equal(enabled.status,200);
  assert.equal(calls,1);
  assert.equal((await enabled.json()).enabled,false);
});
