import test from 'node:test';
import assert from 'node:assert/strict';
import {STATES,policy,eligibleStore,qualitySignal} from '../cannabis-directory-policy.mjs';
import worker from '../workers/cannabis-directory.mjs';
test('nationwide queue covers exactly all 50 states, no DC conflation',()=>{
 assert.equal(STATES.length,50);assert.equal(new Set(STATES).size,50);
 for(const s of ['IA','IL','MO','CO','AK','HI','NY','WY'])assert.ok(STATES.includes(s));
});
test('Midwest law profiles keep Iowa distinct from Illinois and Missouri',()=>{
 assert.equal(policy('IA').adult_use,'not_authorized');
 assert.equal(policy('IL').adult_use,'legal_with_conditions');
 assert.equal(policy('MO').adult_use,'legal_with_conditions');
 assert.equal(policy('UT').adult_use,'unreviewed');
});
test('a site is a sourced organic listing, never automatically a paid offer',()=>{
 const row={id:'livwell-colorado',name:'LivWell',store:'Colorado Boulevard',state:'CO',city:'Denver',
  source_url:'https://livwell.com/locations',source_domain:'livwell.com',source_name:'LivWell official locations',
  record_status:'listed',paid_sponsor:0,verified_at:'2026-11-01',license_status:'unverified'};
 assert.equal(eligibleStore(row,true).sponsored,false);
 assert.equal(eligibleStore(row,false),null);
 assert.equal(eligibleStore({...row,source_url:'https://evil.example.com/'},true),null);
 assert.equal(eligibleStore({...row,record_status:'review'},true),null);
 assert.equal(eligibleStore({...row,paid_sponsor:1},true),null);
});
test('quality signals use source evidence, never health or potency guesses',()=>{
 assert.equal(qualitySignal({official_source:1,license_verified:1,address_confirmed:1,rights_cleared:1}),4);
 assert.equal(qualitySignal({official_source:1,license_verified:0,address_confirmed:1,rights_cleared:0}),2);
 assert.equal(qualitySignal({official_source:1,healthy_claim:1,potency:35}),1);
});
test('new public Worker exposes counts and queues, never age-restricted stores without deliberate acknowledgement',async()=>{
 const env={DIRECTORY:{prepare(sql){return {bind(){return {all:async()=>({results:[]}),first:async()=>null}},all:async()=>({results:[]})}}}};
 const no=await worker.fetch(new Request('https://quantaphi.org/api/21-directory/stores?state=CO'),env);
 assert.equal(no.status,403);
 const yes=await worker.fetch(new Request('https://quantaphi.org/api/21-directory/stores?state=CO',{headers:{'X-Visitor-21-Acknowledged':'true'}}),env);
 assert.equal(yes.status,200);
 const stats=await worker.fetch(new Request('https://quantaphi.org/api/21-directory/coverage'),env);
 assert.equal(stats.status,200);
});
