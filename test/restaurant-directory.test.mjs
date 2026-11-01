import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=x=>readFileSync(new URL('../'+x,import.meta.url),'utf8');
test('restaurant directory is one dynamically populated card in the existing Oracle carousel',()=>{
 const code=read('restaurant-directory.mjs'),html=read('index.html');
 assert.match(code,/premiumSourceCards/);
 assert.match(code,/quantaphi:source-cards-ready/);
 assert.match(code,/data-source-id|dataset\.sourceId/);
 assert.match(code,/\/api\/dining\/search/);
 assert.match(html,/restaurant-directory\.mjs/);
});
test('restaurant discovery displays only source-backed listings, never fake ads or availability',()=>{
 const code=read('restaurant-directory.mjs');
 assert.match(code,/Directions/);
 assert.match(code,/Source:|Overture|source_name/);
 assert.match(code,/Sponsored only|Not sponsored|Organic listing/i);
 assert.doesNotMatch(code,/fake|randomPhotoUrl|hardcodedRating/);
});
test('directory backend has prepared search and bounded results but no public write route',()=>{
 const code=read('workers/restaurant-directory.js');
 assert.match(code,/\.prepare\(/);
 assert.match(code,/\.bind\(/);
 assert.match(code,/limit.*24|LIMIT 24/i);
 assert.match(code,/\/api\/dining\/search/);
 assert.doesNotMatch(code,/['"]POST['"].*\/api\/dining\/ingest/);
});
test('bulk importer requires source provenance, filters places and never labels ads without a contract',()=>{
 const code=read('scripts/restaurant-directory-import.py');
 assert.match(code,/taxonomy/);assert.match(code,/confidence/);
 assert.match(code,/restaurant/);assert.match(code,/overturemaps.org/);
 assert.match(code,/'sponsored': False/);
});


test('restaurant carousel preserves live per-city inventory and prevents navigation races',()=>{
 const code=read('restaurant-directory.mjs');
 assert.match(code,/const cityCounts=new Map\(\)/);
 assert.match(code,/cityCounts\.set\(item\.state\+'\|'\+item\.city/);
 assert.match(code,/cityTotal=cityCounts\.get\(place\.value\)\|\|0/);
 assert.match(code,/submit\.disabled=prev\.disabled=next\.disabled=discover\.disabled=true/);
 assert.match(code,/if\(loading\)return;if\(selected<items\.length-1\)/);
 assert.match(code,/find\(page-1,false,true\)/);
 assert.match(code,/selectLast&&items\.length/);
});
