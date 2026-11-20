import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeCheck,validateUrl,parseBackup,mergeChecks,compareChecks,searchChecks,MAX_BYTES} from './hypestat-observations-core.mjs';

const onion='pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscryd.onion';
const sample=(x={})=>({
  id:'check-1',caseId:'Example public report',checkedAt:'2026-11-19T12:00:00.000Z',
  status:'unverified',verification:'unverified',exactUrl:'https://example.org/report',
  onionAddress:onion,publicMirror:'https://example.org/mirror',
  sourceUrl:'https://example.org/source',redirectUrl:'',
  sourceReported:'Third party reports 80 daily visits (estimate, period unknown).',
  observedData:'Page title was visible in an earlier public screenshot.',analysis:'Does not prove the origin was live.',
  unknowns:'Operator and actual reachability unknown.',nextAction:'Check whether a dated public archive exists.',
  custody:'Screenshot recorded manually; original kept on device.',
  screenshotName:'capture.png',screenshotSha256:'a'.repeat(64),screenshotSize:12345,
  ...x
});
const plain=x=>JSON.parse(JSON.stringify(x));

test('validates exact URLs without contacting the source or using unsafe schemes',()=>{
  assert.equal(validateUrl('https://example.org/page?q=public','public'),'https://example.org/page?q=public');
  assert.equal(validateUrl('http://'+onion+'/','exact'),'http://'+onion+'/');
  for(const bad of ['javascript:alert(1)','data:text/html,a','file:///etc/passwd','http://127.0.0.1/a','https://localhost/','https://192.168.1.1/','https://user:pass@example.org/','https://example.local/','http://example.org']){
    assert.throws(()=>validateUrl(bad,'public'));
  }
  assert.throws(()=>validateUrl('https://'+onion,'public'));
  assert.throws(()=>validateUrl('https://abcd.onion','exact'));
});

test('keeps onion, mirror and exact URL independent and accepts only v3 onion identifiers',()=>{
  assert.equal(normalizeCheck(sample()).onionAddress,onion);
  assert.throws(()=>normalizeCheck(sample({onionAddress:'abcdef.onion'})),/onion/i);
  assert.throws(()=>normalizeCheck(sample({publicMirror:'https://'+onion})),/address|url|public/i);
});

test('all observation states and verification statuses have explicit bounded values',()=>{
  for(const status of ['live','unavailable','changed','unverified']) assert.equal(normalizeCheck(sample({status})).status,status);
  for(const status of ['offline','found_operator','visitor_known']) assert.throws(()=>normalizeCheck(sample({status})));
  assert.throws(()=>normalizeCheck(sample({verification:'confirmed_operator'})));
  assert.throws(()=>normalizeCheck(sample({verification:'corroborated',corroboratingSource:''})),/corroborating/i);
  assert.equal(normalizeCheck(sample({verification:'corroborated',corroboratingSource:'https://example.net/report'})).verification,'corroborated');
});

test('timestamps and screenshot evidence metadata are checked rather than guessed',()=>{
  assert.throws(()=>normalizeCheck(sample({checkedAt:'2026-02-30T12:00:00.000Z'})));
  assert.throws(()=>normalizeCheck(sample({checkedAt:'not a date'})));
  assert.throws(()=>normalizeCheck(sample({screenshotSha256:'not-a-hash'})));
  assert.throws(()=>normalizeCheck(sample({screenshotSize:-2})));
});

test('chain-of-custody fields and strict schema survive a JSON export round trip',()=>{
  const item=normalizeCheck(sample());
  const decoded=parseBackup(JSON.stringify({version:1,checks:[item]}));
  assert.deepEqual(plain(decoded.checks[0]),plain(item));
  assert.equal(decoded.checks[0].custody,item.custody);
  assert.throws(()=>parseBackup(JSON.stringify({version:1,checks:[{...item,secretIp:'1.2.3.4'}]})),/unknown/i);
  assert.throws(()=>parseBackup(JSON.stringify({version:2,checks:[]})));
  assert.throws(()=>parseBackup('x'.repeat(MAX_BYTES+1)));
  assert.throws(()=>parseBackup('{"__proto__":{},"version":1,"checks":[]}'));
});

test('repeated checks preserve both dates, compare deltas and distinguish missing checks from unavailable',()=>{
  const old=normalizeCheck(sample());
  const newer=normalizeCheck(sample({id:'check-2',checkedAt:'2026-11-20T12:00:00.000Z',status:'changed',redirectUrl:'https://example.net/news',observedData:'Public redirect reported.'}));
  const merged=mergeChecks([old],[newer]);
  assert.equal(merged.length,2);
  const result=compareChecks(merged,'Example public report');
  assert.equal(result.latest.status,'changed');
  assert.equal(result.previous.status,'unverified');
  assert.ok(result.changes.includes('status'));
  assert.ok(result.changes.includes('redirectUrl'));
  assert.equal(compareChecks([old],'Example public report').previous,null);
  assert.equal(compareChecks([],'Example public report').latest,null);
});

test('backups never silently overwrite an existing observation with the same ID',()=>{
  const old=normalizeCheck(sample());
  assert.equal(mergeChecks([old],[old]).length,1);
  assert.throws(()=>mergeChecks([old],[normalizeCheck(sample({observedData:'different'}))]),/conflict/i);
  assert.throws(()=>parseBackup(JSON.stringify({version:1,checks:[old,{...old,observedData:'altered'}]})),/conflict/i);
});

test('search covers source, observations, unknowns and notes while filtering by status',()=>{
  const a=normalizeCheck(sample()), b=normalizeCheck(sample({id:'b',caseId:'Other',status:'live',unknowns:'No issue'}));
  assert.equal(searchChecks([a,b],'operator').length,1);
  assert.equal(searchChecks([a,b],'public report').length,2);
  assert.equal(searchChecks([a,b],'','live').length,1);
});

test('browser files are network-disabled, do not inject HTML and describe source boundaries',()=>{
  const html=readFileSync(new URL('./hypestat-observations.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('./hypestat-observations-ui.mjs',import.meta.url),'utf8');
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/form-action 'none'/);
  assert.match(html,/Source-reported/);
  assert.match(html,/Observed data/);
  assert.match(html,/Chain of custody/);
  assert.match(html,/Timeline/);
  assert.match(html,/Compare/);
  assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|sendBeacon|\.innerHTML\s*=|eval\s*\(/);
  assert.doesNotMatch(html,/<iframe|<script[^>]+src=["']https?:/);
});
