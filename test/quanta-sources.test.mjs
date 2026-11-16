import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SOURCES,SOURCE_STATUSES,filterSources,VERIFIED_COOPERATIVE_ADVERTISERS} from '../quanta-sources-data.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('source registry has distinct IDs, trusted evidence, no implied sponsors',()=>{
 assert.ok(SOURCES.length>=20);
 assert.equal(new Set(SOURCES.map(x=>x.id)).size,SOURCES.length);
 assert.equal(VERIFIED_COOPERATIVE_ADVERTISERS.length,0);
 for(const e of SOURCES){
  assert.ok(e.name&&e.detail&&SOURCE_STATUSES[e.status]);
  for(const field of ['evidence','website']){
   const u=new URL(e[field]);
   assert.equal(u.protocol,'https:');
   assert.equal(u.username,'');assert.equal(u.password,'');
  }
  assert.ok(!/[<>{}]/.test(e.name));
  assert.ok(Object.isFrozen(e));
 }
});

test('public status distinguishes fork ancestry from partner contracts and promoted brands',()=>{
 const find=id=>SOURCES.find(x=>x.id===id);
 assert.equal(find('fork-moltnook').status,'parent-verified');
 assert.equal(find('fork-moltnook').website,'https://github.com/www-infinity/Moltnook');
 assert.equal(find('bubbles').status,'catalog-only');
 assert.equal(find('adsense').status,'script-present');
 assert.equal(find('quickads').status,'independent-spotlight');
 assert.equal(find('bubbleyum').status,'concept-only');
 assert.ok(!SOURCES.some(x=>/paid-partner|sponsor-verified|contracted/.test(x.status)));
});

test('directory filters results, preserves independent sources and never logs sensitive history',()=>{
 assert.equal(filterSources({category:'github-fork'}).length,6);
 assert.ok(filterSources({query:'TinyFish'}).some(x=>x.id==='tinyfish'));
 assert.ok(filterSources({category:'advertising'}).some(x=>x.id==='bubbleyum'));
 assert.equal(filterSources({category:'information',query:'nonexistent'}).length,0);
 const html=read('quanta-sources.html'),js=read('quanta-sources-page.mjs');
 assert.match(html,/Sources, tools &amp; cooperatives/);
 assert.match(html,/no paid or signed sponsors are verified/);
 assert.match(html,/sourceSearch/);
 assert.match(js,/document\.createTextNode|textContent=/);
 for(const s of [html,js]){
  assert.ok(!/localStorage|sessionStorage|document\.cookie|postMessage\(/.test(s));
 }
 assert.match(read('index.html'),/href="\/quanta-sources\.html"/);
});
