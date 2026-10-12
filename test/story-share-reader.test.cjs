const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const load=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
test('Story Writer and live Reads & Realms sharing open a complete story reader, never a new search',()=>{
 const writer=load('phi-story-writer.js'),book=load('infinite-book.js'),html=load('story/index.html');
 assert.match(writer,/PhiStoryShare\.create\(\{kind:'fiction',title:active\.title,body:active\.body/);
 assert.match(book,/PhiStoryShare\.create\(\{kind:'research',title:story\.title,body:story\.full/);
 assert.match(html,/PhiStoryShare\.read\(location\.hash\)/);
 assert.doesNotMatch(writer.slice(writer.indexOf('async function share(){'),writer.indexOf('async function copy(){')),/searchParams\.set\('q'/);
});
test('portable story URLs roundtrip full paragraph bodies and do not upload user drafts',async()=>{
 const state={};
 const globals={window:state,URL,location:{origin:'https://quantaphi.org'},TextEncoder,TextDecoder,
  Blob,Response,btoa,atob,CompressionStream,DecompressionStream};
 vm.runInNewContext(load('phi-story-share.js'),globals);
 const body=('First chapter.\n\nSecond chapter stays complete.\n\n').repeat(120);
 const link=await state.PhiStoryShare.create({kind:'fiction',title:'My complete story',body});
 assert.match(link,/^https:\/\/quantaphi\.org\/story\/#s=[jg]\./);
 const decoded=await state.PhiStoryShare.read(new URL(link).hash);
 assert.equal(decoded.title,'My complete story');
 assert.equal(decoded.body,body);
 assert.equal(decoded.kind,'fiction');
});
test('Asteroid search is entity-first and rejects stories not supported by its subject',()=>{
 const code=load('infinite-book-discovery.js');
 assert.match(code,/researchedTopic\+' documented history original source'/);
 assert.match(code,/storyKind==='asteroid' && roll\.quantFocus/);
 assert.match(code,/!matched\.some\(source=>mention\(source\.title/);
 assert.match(code,/Asteroid is a metaphor for investigating the current search/);
});
test('reader static route has its own canonical path',()=>{
 const router=load('workers/quantaphi-site/worker.js');
 assert.match(router,/path === '\/story\/'/);
 assert.match(router,/sourcePath: '\/story\/index\.html'/);
});

test('Business intent presents RadioShack official store first without claiming search listings are paid advertising',()=>{
 const code=load('phi-business-search.js'),html=load('index.html');
 assert.match(code,/radioshack:\{name:'RadioShack',domain:'radioshack\\.com'/);
 assert.match(code,/result\.parentNode\.insertBefore\(panel,result\)/);
 assert.match(code,/not a paid advertisement/);
 assert.match(code,/matchOfficial\(x\.url,brand\)/);
 assert.match(html,/phi-business-search\.js/);
});
test('Site viewer always offers the actual page when iframe embedding is rejected',()=>{
 const html=load('index.html');
 assert.match(html,/id="siteViewerExternal"/);
 assert.match(html,/fallback\.href=url\.href/);
});
