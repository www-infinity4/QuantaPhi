import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cards} from '../bubbles-card-catalog.mjs';
import {classifyReference,createRule,validateBackup,toCSV,SEED_RULES} from '../isha-rulebook-core.mjs';

const title='ISHA Rulebook · Standards & Evidence';

test('Bubbles recognizes the ISHA Quick Card without inventing a Tor-browser capability',()=>{
  const card=cards.find(c=>c.id==='isha-rulebook');
  assert.equal(card?.title,title);
  assert.equal(card?.url,'/isha-rulebook.html');
  assert.ok(card.aliases.includes('isha book'));
});

test('address classification separates onion services from gateway domains without contacting them',()=>{
  const label='a'.repeat(56);
  assert.equal(classifyReference(label+'.onion').scope,'onion_service');
  assert.equal(classifyReference(label+'.onion.ly').scope,'gateway');
  assert.equal(classifyReference('https://example.org/').scope,'public_site');
  assert.equal(classifyReference('example.ky').scope,'public_site');
  for(const bad of ['http://example.org/private','javascript:alert(1)','localhost','127.0.0.1','http://user:pass@example.org/']){
    assert.throws(()=>classifyReference(bad));
  }
});

test('new rules begin as draft proposals; no policy is silently enacted',()=>{
  const r=createRule({id:'ISHA-010',area:'source verification',observation:'A public reference exists',measure:'Ask for a dated official source',evidenceUrl:'https://example.org/public-report',reviewer:'',status:'adopted',updatedAt:'2026-11-19T22:00:00Z'});
  assert.equal(r.status,'draft');
  assert.equal(r.id,'ISHA-010');
  assert.equal(r.evidenceUrl,'https://example.org/public-report');
  assert.ok(!('mediaUrl' in r));
  assert.throws(()=>createRule({id:'ISHA-011',area:'x',observation:'x',measure:'x',evidenceUrl:'https://a.onion.ly',updatedAt:'2026-11-19T22:00:00Z'}));
  assert.throws(()=>createRule({id:'ISHA-011',area:'x',observation:'x',measure:'x',evidenceUrl:'http://example.com/report',updatedAt:'2026-11-19T22:00:00Z'}));
});

test('backups reject malicious extra fields and preserve version 1 records only',()=>{
  const r=createRule({id:'ISHA-050',area:'provenance',observation:'Example',measure:'Review source',evidenceUrl:'',updatedAt:'2026-11-19T22:00:00Z'});
  assert.equal(validateBackup(JSON.stringify({version:1,rules:[r]})).rules.length,1);
  assert.throws(()=>validateBackup('{"version":1,"rules":[{"mediaUrl":"https://example.org/a.mp4"}]}'));
  assert.throws(()=>validateBackup('{"version":2,"rules":[]}'));
  assert.throws(()=>validateBackup('{"__proto__":{},"version":1,"rules":[]}'));
  assert.throws(()=>validateBackup('{bad'));
});

test('CSV export preserves columns and escapes spreadsheet formulas in notes',()=>{
  const r=createRule({id:'ISHA-051',area:'documentation',observation:'=HYPERLINK("https://evil.example")',measure:'Review',evidenceUrl:'',updatedAt:'2026-11-19T22:00:00Z'});
  const csv=toCSV([r]);
  assert.match(csv,/rule_id,area,observation,measure,evidence_url,status,reviewer,updated_at/);
  assert.match(csv,/'=HYPERLINK/);
});

test('static page never fetches onion media, auto-embeds sites, or executes untrusted source material',()=>{
  const page=readFileSync(new URL('../isha-rulebook.html',import.meta.url),'utf8');
  assert.match(page,/id="rule-form"/);
  assert.match(page,/id="classify-form"/);
  assert.match(page,/id="export-csv"/);
  assert.doesNotMatch(page,/<iframe|<video|\bfetch\s*\(|\.innerHTML\s*=|eval\s*\(/i);
  assert.ok(SEED_RULES.some(rule=>rule.id==='ISHA-001'));
});
