import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {INTEGRA_AUTOMATION_CASES,planIntegraAutomation,quoteTinyFishWork,mountIntegraAutomationGuide} from '../integra-automation-router.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('business capability matrix is complete, data-minimized and immutable',()=>{
 assert.equal(INTEGRA_AUTOMATION_CASES.length,8);
 assert.equal(new Set(INTEGRA_AUTOMATION_CASES.map(x=>x.id)).size,8);
 for(const entry of INTEGRA_AUTOMATION_CASES){
  assert.ok(Object.isFrozen(entry)&&Object.isFrozen(entry.data)&&Object.isFrozen(entry.requires));
  assert.ok(entry.title&&entry.preferred&&entry.need&&entry.cost&&entry.data.length);
 }
 assert.equal(typeof mountIntegraAutomationGuide,'function');
 assert.equal(planIntegraAutomation('unknown'),null);
});

test('conversation models and Grok Bot X context are distinct grants',()=>{
 assert.equal(planIntegraAutomation('questions').status,'connection_required');
 assert.equal(planIntegraAutomation('questions',{grants:{x_grok_bot:true}}).status,'connection_required');
 assert.equal(planIntegraAutomation('questions',{channel:'x',grants:{x_grok_bot:true}}).route,'grok_bot_x');
 assert.equal(planIntegraAutomation('questions',{grants:{knowledge:true,grok_model:true}}).route,'grok_model');
 assert.equal(planIntegraAutomation('questions',{grants:{knowledge:true,bubbles_model:true}}).route,'bubbles_model');
 assert.equal(planIntegraAutomation('questions',{grants:{grok_model:true}}).status,'connection_required');
});

test('provider API wins; business automation never implies a live external action',()=>{
 for(const [id,key,route] of [
  ['crm','crm_api','crm_api'],['commerce','store_api','store_api']]){
  assert.equal(planIntegraAutomation(id).status,'connection_required');
  const p=planIntegraAutomation(id,{grants:{[key]:true}});
  assert.equal(p.route,route);assert.equal(p.executed,false);assert.equal(p.authorized,false);
 }
 assert.equal(planIntegraAutomation('analytics',{grants:{analytics_api:true}}).status,'consent_required');
 assert.equal(planIntegraAutomation('analytics',{grants:{measurement_consent:true,analytics_api:true}}).route,'analytics_api');
 assert.equal(planIntegraAutomation('builder',{grants:{github_api:true,cloudflare_api:true}}).status,'approval_required');
 assert.equal(planIntegraAutomation('schedule',{grants:{calendar_api:true,mail_api:true}}).status,'approval_required');
});

test('X automated replies stay off without prior explicit X approval and recipient opt-in',()=>{
 assert.equal(planIntegraAutomation('x-replies',{grants:{x_api:true,x_recipient_opt_in:true}}).status,'platform_approval_required');
 assert.equal(planIntegraAutomation('x-replies',{grants:{x_api:true,x_ai_reply_approval:true}}).status,'consent_required');
 assert.equal(planIntegraAutomation('x-replies',{grants:{x_api:true,x_ai_reply_approval:true,x_recipient_opt_in:true}}).status,'approval_required');
});

test('paid TinyFish is an explicitly approved, host-scoped and budgeted exception',()=>{
 const quote={steps:2,minutes:3,stepUsd:.016,minuteUsd:.002};
 assert.equal(quoteTinyFishWork(quote),.038);
 for(const q of [{steps:-1,minutes:0,stepUsd:.016,minuteUsd:.002},{steps:101,minutes:0,stepUsd:.016,minuteUsd:.002},{steps:2,minutes:0,stepUsd:NaN,minuteUsd:.002}])assert.equal(quoteTinyFishWork(q),null);
 assert.equal(planIntegraAutomation('browser',{grants:{site_api:true}}).route,'site_api');
 assert.equal(planIntegraAutomation('browser').status,'consent_required');
 assert.equal(planIntegraAutomation('browser',{grants:{browser_approval:true},approval:{confirmed:true,allowedHosts:['example.com'],maxUsd:.01},quote}).status,'budget_required');
 assert.equal(planIntegraAutomation('browser',{grants:{browser_approval:true},approval:{confirmed:true,allowedHosts:['example.com'],maxUsd:.1},quote}).route,'tinyfish_exception');
 assert.equal(planIntegraAutomation('browser',{grants:{browser_approval:true},approval:{confirmed:true,allowedHosts:['example.com','evil.com'],maxUsd:1},quote}).status,'site_scope_required');
 assert.equal(planIntegraAutomation('browser',{grants:{browser_approval:true},approval:{confirmed:true,allowedHosts:['https://example.com/path'],maxUsd:1},quote}).status,'site_scope_required');
});

test('public X card guide is a read-only plan, not user credentials, analytics capture or Grok API',()=>{
 const src=read('integra-automation-router.mjs');
 assert.doesNotMatch(src,/fetch\(|localStorage|sessionStorage|document\.cookie|navigator\.sendBeacon|Bearer\s|TINYFISH_API_KEY/);
 assert.match(src,/No data collected and no external action performed/);
 const card=read('quanta-card-experience.mjs');
 assert.match(card,/mountIntegraAutomationGuide\(root\)/);
 assert.match(read('quanta-card-experience.css'),/\.qcx-integra-business/);
});
