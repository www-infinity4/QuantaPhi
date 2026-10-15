'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const path=require('node:path');
const core=require('../platinum/core.js');
const source=path=>fs.readFileSync(path,'utf8');
function storage(){const state=new Map();return {getItem:k=>state.get(k)||null,setItem:(k,v)=>state.set(k,String(v)),removeItem:k=>state.delete(k)}}
test('Platinum accepts actual HTTP(S) destinations and never coerces JS/data/file schemes into links',()=>{
 for(const [input,expected] of [
  ['example.com','https://example.com/'],['https://example.org/page?q=test','https://example.org/page?q=test'],
  ['http://example.org/a','http://example.org/a']])assert.equal(core.validUrl(input),expected);
 for(const unsafe of ['javascript:alert(1)','data:text/html,evil','file:///etc/passwd','intent://evil',
  'https://victim.example@evil.example/', 'https://test.example/\nmalicious','about:blank','foo:bar'])
   assert.equal(core.validUrl(unsafe),'',unsafe);
 assert.equal(core.destination('pink floyd guitars').type,'search');
 assert.match(core.destination('pink floyd guitars').url,/^https:\/\/quantaphi\.org\/\?q=pink%20floyd%20guitars$/);
 assert.equal(core.destination('javascript:alert(1)'),null);
});
test('Platinum tiles are persisted, editable, deduplicated, and removable without public account calls',()=>{
 const store=storage();
 const initial=core.save({url:'www.example.com',title:'Example',note:'My notes'},store);
 assert.equal(initial.ok,true);assert.equal(core.read(store).length,1);
 assert.equal(core.read(store)[0].title,'Example');
 assert.equal(core.save({url:'https://www.example.com/',title:'Duplicate'},store).ok,false);
 assert.equal(core.save({...initial.item,title:'Renamed',note:'Remember this'},store).ok,true);
 assert.equal(core.read(store).length,1);assert.equal(core.read(store)[0].title,'Renamed');
 assert.equal(core.remove(initial.item.id,store),true);
 assert.equal(core.read(store).length,0);
});
test('Platinum resume remembers exactly the last navigated URL and rejects unsafe restoration',()=>{
 const store=storage();
 assert.equal(core.remember('https://example.org/entry#part','Article',store),true);
 assert.equal(core.last(store).url,'https://example.org/entry#part');
 assert.equal(core.remember('javascript:alert(1)','X',store),false);
 assert.equal(core.last(store).url,'https://example.org/entry#part');
 store.setItem(core.RESUME,JSON.stringify({url:'file:///etc/passwd'}));
 assert.equal(core.last(store),null);
});
test('Preview images are user provided; no guessed screenshot, remote scraping or hidden wallet mint',()=>{
 const tile=core.sanitize({url:'https://example.com/',title:'hello',preview:'data:image/svg+xml,<svg/>'});
 assert.ok(tile);
 assert.equal(tile.preview,'');
 const ui=source('platinum/platinum.js');
 assert.match(ui,/URL\.createObjectURL\(file\)/);
 assert.match(ui,/canvas\.toDataURL\('image\/jpeg'/);
 assert.match(ui,/new URL\(tile\.url\)/);
 assert.doesNotMatch(ui,/html2canvas|document\.cookie|navigator\.credentials|mintToken/);
});
test('Collect is wired to existing PhiProjectPackage.capture and Build seeds actual Code Phi project',()=>{
 const ui=source('platinum/platinum.js');
 const pkg=source('phi-project-package.js');
 assert.match(ui,/packageApi\.capture\(\{kind:'source'/);
 assert.match(ui,/packageApi\.seed\('code'\)/);
 assert.match(ui,/location\.assign\(link\)/);
 assert.match(ui,/if\(!result\?\.ok\)/);
 assert.match(pkg,/function capture\(item,projectId\)/);
 assert.match(pkg,/function seed\(mode='code'\)/);
 assert.match(pkg,/omniPhi:codeSeed:v1/);
});
test('Platinum is linked in QuantaPhi, and route serves current repo path',async()=>{
 const html=source('index.html');
 assert.match(html,/href="\/platinum\/index\.html"[^>]*>Infinity Platinum/);
 const worker=source('workers/quantaphi-site/worker.js');
 assert.match(worker,/path === '\/platinum\/' \|\| path === '\/platinum\/index.html'/);
 const urls=[];
 const context={URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,
  fetch:async target=>{
   const url=typeof target==='string'?target:target.url;
   urls.push(url);return new Response('platinum ok',{status:200,headers:{'Content-Type':'text/html'}});
  }};
 const standalone=worker.replace(/^import \{videoAPI\} from '.\/video-api\.mjs';\s*/,'').replace('export default','globalThis.worker=');
 vm.runInNewContext(standalone,context);
 const page=await context.worker.fetch(new Request('https://quantaphi.org/platinum/'),{});
 assert.equal(page.status,200);
 assert.ok(urls.some(u=>u.includes('platinum/index.html')));
});
