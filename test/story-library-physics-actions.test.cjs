'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=path=>fs.readFileSync(require('node:path').join(__dirname,'..',path),'utf8');

test('View Stories is a first-class reader of already saved full-text drafts',()=>{
 const js=source('phi-story-writer.js'),css=source('phi-story-writer.css');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/viewStories=make\('button','sw-view-stories','View Stories'\)/);
 assert.match(js,/history\.id='sw-saved-library';history\.hidden=true/);
 assert.match(js,/function openSavedStory\(id\)/);
 assert.match(js,/renderStory\(\);\s*\$\('#sw-output'\)\.scrollIntoView/);
 assert.match(js,/const open=make\('button','sw-library-open','Read full story'\)/);
 assert.match(js,/for\(const paragraph of active\.body\.split/);
 assert.match(js,/tx\.objectStore\('drafts'\)\.put\(story\)/);
 assert.match(js,/stories=\[story,\.\.\.stories\.filter\(x=>x\.id!==story\.id\)\];/);
 assert.doesNotMatch(js,/sort\(\(a,b\)=>Date\.parse\(b\.createdAt\|\|0\)-Date\.parse\(a\.createdAt\|\|0\)\)\.slice\(0,25\)/);
 assert.match(css,/#phiStoryWriter \.sw-history\[hidden\]\{display:none\}/);
 assert.match(js,/Cloud backup is not connected/);
});

test('physics card has distinct Star Collect Share actions with Cloud receipt connection',()=>{
 const js=source('infinity-concepts.js'),css=source('infinity-concepts.css');
 assert.doesNotThrow(()=>new vm.Script(js));
 for(const action of ['star','collect','share'])assert.match(js,new RegExp("window\\.QuantaStarCredit\\?\\.\\('"+action+"'"));
 assert.match(js,/save\(FAVORITES,\[\.\.\.entries,key\]\)/);
 assert.match(js,/save\(COLLECTED,\[\.\.\.entries,item\]\.slice\(-1000\)\)/);
 assert.match(js,/quantaphi:collected/);
 assert.match(js,/if\(navigator\.share\)await navigator\.share\(details\)/);
 assert.match(js,/shareButton\.disabled=true/);
 assert.match(js,/infinity-concept-\'+slug\(e\.id\)/);
 assert.match(js,/wallet payout is unconfirmed/);
 assert.match(css,/#infinityConcepts \.icp-actions\{display:grid/);
 assert.match(css,/#infinityConcepts \.icp-shell\{/);
});

test('entrypoint loads updated story/physics styles and scripts',()=>{
 const html=source('index.html');
 for(const path of ['phi-story-writer.css','phi-story-writer.js','infinity-concepts.css','infinity-concepts.js'])
  assert.match(html,new RegExp(path.replaceAll('.','\\.')+'\\?v=20261011-'));
});
