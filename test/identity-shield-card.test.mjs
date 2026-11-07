import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Identity Shield appears in existing Oracle Quick Card carousel on homepage',()=>{
 const home=get('index.html'),deck=get('oracle-card-deck.js');
 assert.ok(home.includes('id="identityShieldQuickCard"'));
 assert.ok(home.includes('/identity-shield-card.mjs'));
 assert.ok(deck.includes("['identityShieldQuickCard','Infinity Identity Shield"));
 assert.ok(deck.includes("identityShieldQuickCard:['identity-shield'"));
});

test('card describes public monitoring and future protected stages without taking SSNs',()=>{
 const card=get('identity-shield-card.mjs');
 for(const label of ['Public-source research','Credit and account alerts','SSA account protection','Security review'])assert.ok(card.includes(label),label);
 assert.ok(card.includes('/data/identity-shield-research.json'));
 assert.ok(card.includes('not connected'));
 assert.ok(card.includes('www.ssa.gov/myaccount'));
 assert.ok(card.includes('www.identitytheft.gov'));
 assert.ok(!card.includes('<input'));
 assert.ok(!card.includes('localStorage'));
 assert.ok(!card.includes('sessionStorage'));
 assert.ok(card.includes('no-store'));
});

test('public monitor is scheduled and only writes public source digests to a read-only card feed',()=>{
 const workflow=get('.github/workflows/identity-shield-public-monitor.yml');
 const monitor=get('scripts/identity-shield-public-monitor.py');
 const state=JSON.parse(get('data/identity-shield-research.json'));
 assert.ok(workflow.includes('schedule:'));
 assert.ok(workflow.includes('identity-shield-public-monitor.py'));
 assert.ok(workflow.includes('permissions:'));
 assert.ok(monitor.includes('www.ssa.gov'));
 assert.ok(monitor.includes('www.identitytheft.gov'));
 assert.ok(monitor.includes('content_sha256'));
 assert.equal(state.monitor_kind,'public_policy_sources_only');
 assert.equal(state.last_run_utc,null);
});
