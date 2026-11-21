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
 assert.ok(state.last_run_utc===null || Number.isFinite(Date.parse(state.last_run_utc)));
});


test('official protection providers are explicit external handoffs, never claimed connected', async()=>{
 const {shieldProviders,safeShieldProviderUrl}=await import('../identity-shield-providers.mjs');
 const ids=new Set(shieldProviders.map(provider=>provider.id));
 for(const id of ['equifax','experian','transunion','credit-reports','irs-ip-pin','ssa-account','ftc-recovery'])
  assert.ok(ids.has(id),'missing official provider: '+id);
 assert.equal(ids.size,shieldProviders.length);
 for(const provider of shieldProviders){
  assert.equal(provider.connection,'external_only');
  assert.equal(provider.partner_contract,false);
  assert.equal(safeShieldProviderUrl(provider.id,provider.url),provider.url);
  assert.ok(provider.url.startsWith('https://'));
  assert.equal(safeShieldProviderUrl(provider.id,provider.url+'?redirect=evil'),null);
  assert.equal(safeShieldProviderUrl(provider.id,provider.url.replace('https://','http://')),null);
 }
 assert.equal(safeShieldProviderUrl('equifax','https://www.equifax.com.evil.test/'),null);
 assert.equal(safeShieldProviderUrl('unknown','https://www.irs.gov/'),null);
});

test('Shield UI uses provider-specific safe handoffs and does not collect identity data',()=>{
 const card=get('identity-shield-card.mjs');
 assert.ok(card.includes("from './identity-shield-providers.mjs'"));
 assert.ok(card.includes('safeShieldProviderUrl('));
 assert.ok(card.includes('Official protection services'));
 assert.ok(card.includes('not connected'));
 assert.ok(card.includes('min-height:44px'));
 assert.ok(!card.includes('document.cookie'));
 assert.ok(!card.includes('localStorage'));
 assert.ok(!card.includes('<input'));
});
