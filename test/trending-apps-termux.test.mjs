import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APPS,selectTrendingApps,trendForApp,terminalDraftResult,sanitizeDraft} from '../trending-apps-core.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const NOW=Date.parse('2026-11-07T12:00:00Z');
const feed={schema_version:1,source:'Google Trends Trending Now RSS',
 source_url:'https://trends.google.com/trending/rss?geo=US',
 region:'US',checked_at:'2026-11-07T11:40:00Z',
 topics:[
  {query:'Termux app',published_at:'2026-11-07T10:15:00Z',approx_searches:'20K+'},
  {query:'Firefox mobile',published_at:'2026-11-07T11:00:00Z',approx_searches:'5K+'},
  {query:'signal movie',published_at:'2026-11-07T11:00:00Z',approx_searches:'10K+'}
 ]};

test('app catalog uses real official HTTPS providers, not unverified ranking',()=>{
 assert.ok(APPS.length>=5);
 assert.ok(APPS.some(x=>x.id==='termux'&&x.terminal));
 for(const app of APPS){
  assert.match(app.id,/^[a-z0-9-]+$/);
  assert.equal(new URL(app.url).protocol,'https:');
  assert.ok(app.name.length>2&&app.feature.length>8);
 }
});
test('show only actual source-matched apps as trending; keep others named Featured',()=>{
 const rows=selectTrendingApps(feed,NOW);
 assert.equal(rows.length,APPS.length);
 assert.equal(rows[0].id,'termux');
 assert.equal(rows[0].trend,'verified');
 assert.equal(rows.find(x=>x.id==='firefox').trend,'verified');
 assert.equal(rows.find(x=>x.id==='signal').trend,'featured');
 assert.equal(trendForApp('termux',feed.topics)?.query,'Termux app');
});
test('stale, future, malformed or fake Google counts never count as trending',()=>{
 const badDate={...feed,checked_at:'2026-09-01T00:00:00Z'};
 assert.ok(selectTrendingApps(badDate,NOW).every(x=>x.trend==='featured'));
 const spoof={...feed,topics:[{query:'Termux app',published_at:'2026-11-07T10:15:00Z',approx_searches:'Not actually measured'}]};
 assert.ok(selectTrendingApps(spoof,NOW).every(x=>x.trend==='featured'));
 const fakeSource={...feed,source_url:'https://evil.example/rss'};
 assert.ok(selectTrendingApps(fakeSource,NOW).every(x=>x.trend==='featured'));
});
test('terminal never claims execution without a native completion receipt',()=>{
 assert.deepEqual(terminalDraftResult('python -V'),{state:'not_executed',label:'Not executed in Termux'});
 assert.equal(sanitizeDraft('print(2+2)\r\n'), 'print(2+2)');
 assert.equal(sanitizeDraft('x'.repeat(9000)).length,7000);
 assert.equal(sanitizeDraft('\u0000hi\u0007'),'hi');
});
test('Termux Quick Card visibly accepts code but does not silently dispatch shell',()=>{
 const ui=read('trending-apps-quick-cards.mjs'),home=read('index.html');
 const css=read('trending-apps-quick-cards.css'),deck=read('oracle-card-deck.js');
 assert.match(home,/id="trendingAppCards"/);
 assert.match(home,/trending-apps-quick-cards\.mjs/);
 assert.match(ui,/textarea/);
 assert.match(ui,/termux-prompt-cursor/);
 assert.match(css,/blink/);
 assert.match(ui,/navigator\.clipboard/);
 assert.match(ui,/not_executed/);
 assert.match(ui,/quantaphi:trending-app-cards-ready/);
 assert.match(deck,/registerTrendingAppCards/);
 assert.match(deck,/trending-app-/);
 assert.doesNotMatch(ui,/fetch\(['"]\/api\/termux|eval\(|new Function\(|window\.open\(/);
});
