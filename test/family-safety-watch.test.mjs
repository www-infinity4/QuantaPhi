import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SOURCES, parseWatchFeed} from '../family-safety-core.mjs';
import {findCard, cardIntent} from '../bubbles-card-catalog.mjs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const base=(status='ok',success='2026-11-13T06:00:00Z')=>({
 schema_version:1,monitor_kind:'official_civilian_safety_sources',last_run_utc:'2026-11-13T06:10:00Z',
 sources:SOURCES.map(s=>({id:s.id,url:s.url,status,last_checked_utc:'2026-11-13T06:10:00Z',last_success_utc:success,last_change_utc:null,content_sha256:'a'.repeat(64)}))
});

test('Bubbles opens a real registered, local Family Safety Quick Card',()=>{
 const card=findCard('Family Safety');
 assert.equal(card?.id,'family-safety');
 assert.equal(card?.mount,'familySafetyQuickCard');
 assert.ok(card.scripts.includes('family-safety-card.mjs'));
 assert.equal(cardIntent('Bubbles, open Family Safety card')?.card?.id,'family-safety');
 assert.equal(cardIntent('Do not open Family Safety card'),null);
});

test('verified public checks never become military warning or emergency threat predictions',()=>{
 const card=read('family-safety-card.mjs'), core=read('family-safety-core.mjs');
 assert.match(card,/No live military aircraft tracking/);
 assert.match(card,/official notice/i);
 assert.match(card,/cache:\s*'no-store'/);
 assert.match(card,/credentials:\s*'omit'/);
 assert.ok(!/localStorage|sessionStorage|Notification\.requestPermission/.test(card));
 assert.ok(!/callsign|tail.?number|flight.?path|air.?refuel/i.test(core));
 const state=JSON.parse(read('data/family-safety-watch.json'));
 assert.equal(state.last_run_utc,null);
 assert.equal(state.monitor_kind,'official_civilian_safety_sources');
});

test('source allowlist and public receipt require exact source identity and address',()=>{
 const feed=base();
 feed.sources[0].url='https://example.org/fake';
 const parsed=parseWatchFeed(feed,Date.parse('2026-11-13T07:00:00Z'));
 assert.equal(parsed.sources[0].status,'unavailable');
 assert.equal(parsed.sources[1].status,'checked');
 feed.sources.push({...feed.sources[1],status:'review_required'});
 const duplicate=parseWatchFeed(feed,Date.parse('2026-11-13T07:00:00Z'));
 assert.equal(duplicate.sources[1].status,'unavailable');
});

test('freshness, source-change notices, empty and offline states are truthful',()=>{
 const changed=base('review_required');
 changed.sources[0].last_change_utc='2026-11-13T06:00:00Z';
 assert.equal(parseWatchFeed(changed,Date.parse('2026-11-13T07:00:00Z')).sources[0].status,'changed');
 assert.equal(parseWatchFeed(changed,Date.parse('2026-11-16T07:00:00Z')).sources[0].status,'stale');
 assert.equal(parseWatchFeed(base('unavailable'),Date.parse('2026-11-13T07:00:00Z')).sources[0].status,'unavailable');
 const pending=base('pending',null);
 pending.last_run_utc=null;
 assert.equal(parseWatchFeed(pending,Date.parse('2026-11-13T07:00:00Z')).sources[0].status,'pending');
 assert.throws(()=>parseWatchFeed({schema_version:1,sources:[]}),/invalid_public_receipt/);
});

test('scheduled watcher and frontend include readable citations, current timestamps and safeguards',()=>{
 const workflow=read('.github/workflows/family-safety-public-monitor.yml');
 const card=read('family-safety-card.mjs');
 assert.match(workflow,/schedule:/);
 assert.match(workflow,/node --test test\/family-safety-watch\.test\.mjs/);
 assert.match(workflow,/python3 -m unittest/);
 assert.match(card,/America\/Chicago/);
 assert.match(card,/qa\.usembassy\.gov/);
 assert.match(card,/caa\.gov\.qa/);
 assert.match(card,/aria-live/);
 assert.match(card,/setInterval/);
 assert.match(card,/visibilityState/);
});
