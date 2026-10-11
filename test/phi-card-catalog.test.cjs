'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path'),prefix='card-catalog/';
const get=name=>fs.readFileSync(path.join(prefix,name),'utf8');
const cards=JSON.parse(get('catalog.json')).cards;
test('catalog has stable named components and distinguishes working templates',()=>{
 assert.ok(cards.length>=12);
 const ids=cards.map(c=>c.id);assert.equal(new Set(ids).size,ids.length);
 for(const required of ['search-engine','search-viewer','scholastic-reader','asteroid','reads-realms','story-writer','image-builder','radio','code-workshop','website-builder','bubbles-ai'])
  assert.ok(ids.includes(required),required+' must be indexed');
 const ready=cards.filter(c=>c.status==='previewable').map(c=>c.id).sort();
 assert.deepEqual(ready,['search-engine','search-viewer']);
 assert.equal(cards.find(c=>c.id==='reads-realms').tenantData,true);
});
test('all browser card scripts have valid JavaScript and preserve standalone viewer',()=>{
 for(const file of ['catalog.js','search.js','embed.js'])assert.doesNotThrow(()=>new vm.Script(get(file)),file);
 const page=get('index.html'),search=get('search.html');
 assert.match(page,/id="catalogSearch"/);
 assert.match(page,/id="siteOrigin"/);
 assert.match(page,/id="previewBody"/);
 assert.match(search,/id="reader"/);
 assert.match(search,/id="frame"/);
 assert.match(get('search.js'),/categories:cat/);
 assert.match(get('search.js'),/mode==='links-only'/);
 assert.match(get('search.js'),/mode==='image-first'/);
 assert.match(get('search.js'),/No results have been invented/);
});
test('embedding publishes only working cards and returns guarded research clicks',()=>{
 const code=get('embed.js'),studio=get('catalog.js');
 assert.match(code,/new Set\(\['search-engine','search-viewer'\]\)/);
 assert.match(code,/event\.origin!==SRC\|\|event\.source!==frame\.contentWindow/);
 assert.match(code,/holder\.dispatchEvent\(e\)/);
 assert.match(code,/allow-scripts allow-same-origin allow-forms/);
 assert.match(studio,/good=list\.filter\(x=>working\.has\(x\.id\)\)/);
 assert.match(studio,/encodeURIComponent\(JSON\.stringify\(manifest\)\)/);
 assert.doesNotMatch(code,/Authorization|starquest|owner_token|mintQuant/);
});
test('site routing serves /card-catalog/ from QuantaPhi, not the Omni cards route',async()=>{
 const source=fs.readFileSync('workers/quantaphi-site/worker.js','utf8');
 const browser=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const urls=[],prior=global.fetch;
 global.fetch=async req=>{urls.push(String(req.url||req));return new Response('<!doctype html><title>Phi Catalog</title>',{headers:{'Content-Type':'text/html'}})};
 try{
  const response=await browser.default.fetch(new Request('https://quantaphi.org/card-catalog/'),{});
  assert.equal(response.status,200);
  assert.ok(urls.some(x=>x.includes('QuantaPhi')&&x.includes('/card-catalog/index.html')));
 }finally{global.fetch=prior}
});
