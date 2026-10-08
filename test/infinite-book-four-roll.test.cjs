const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'..','infinite-book-catalog.json'),'utf8'));
const discovery=fs.readFileSync(path.join(__dirname,'..','infinite-book-discovery.js'),'utf8');
function api(){
 const window={};
 const context={window,localStorage:{getItem:()=>null},fetch:async()=>{throw Error('No live fetch allowed')},
  URL,URLSearchParams,setTimeout,clearTimeout,AbortController,console,crypto:{getRandomValues:a=>{a[0]=0;return a}}};
 vm.createContext(context);vm.runInContext(discovery,context,{timeout:2000});
 return window.PhiInfiniteBookDiscover;
}
test('four extensible word banks have distinct roles and stable IDs',()=>{
 assert.equal(catalog.discoveryBrackets.length,4);
 assert.equal(catalog.baseSectorCount,30);
 assert.ok(catalog.wordIndex.length>100);
 assert.ok(catalog.storyDirections.length>=30);
 assert.ok(catalog.storyDirections.some(x=>x.name==='Inventors & discoveries'));
 assert.ok(catalog.storyDirections.some(x=>x.name==='Mathematics behind the mystery'));
 for(const key of ['wordIndex','researchRefinements','storyDirections']){
  assert.equal(new Set(catalog[key].map(x=>x.id)).size,catalog[key].length,key+' has duplicate IDs');
 }
 const solar=catalog.wordIndex.find(x=>x.word==='Solar panels');
 assert.ok(solar.sectors.includes(1));
});
test('four draws preserve specific solar topic and varied investigation labels',()=>{
 const d=api();
 const solar=catalog.wordIndex.find(x=>x.word==='Solar panels');
 const draw=d.indexedDraw({catalog,query:'Investigate solar panels inventions and origins',rng:()=>0});
 assert.equal(draw.sector,1);
 assert.equal(draw.wordNumber,solar.id);
 assert.ok(draw.refinementNumber>0&&draw.directionNumber>0);
 assert.equal(draw.bracketKey.split(':').length,4);
 const plan=d.sourcePlan(draw,catalog);
 assert.ok(plan.queries.some(q=>q.includes('Solar panels')&&q.includes(draw.storyDirection)));
 assert.ok(plan.queries.length>=3);
});
test('word banks can add a 113th subject without breaking roll drawing',()=>{
 const extended=JSON.parse(JSON.stringify(catalog));
 extended.wordIndex.push({id:113,word:'Solar airships',sector:1,sectors:[1]});
 const draw=api().indexedDraw({catalog:extended,query:'Solar airships',rng:()=>0});
 assert.equal(draw.indexWord,'Solar airships');
 assert.equal(draw.wordNumber,113);
});
test('one subject can belong to more than one sector without duplicating it',()=>{
 const d=api();
 const helium=d.indexedDraw({catalog,query:'Helium',profileSector:14,rng:()=>0});
 assert.ok(catalog.wordIndex.find(x=>x.id===helium.wordNumber).sectors.includes(14));
 assert.equal(helium.sector,14);
});
test('source direction is part of AI story guidance, never a fabricated claim',()=>{
 assert.match(discovery,/The final direction is/);
 assert.match(discovery,/Future possibilities must be labeled as possibilities/);
 assert.match(discovery,/worked example with explicit assumptions/);
 assert.match(discovery,/fewer_than_two_source_hosts|two or more excerpts|two distinct source websites/);
});
test('D1 library has four word tables, a story-to-path index and editorial gates',()=>{
 const worker=fs.readFileSync(path.join(__dirname,'..','workers/infinite-book-library/worker.js'),'utf8');
 for(const table of ['book_sectors','book_subjects','book_angles','book_directions','book_stories','book_story_paths','book_story_jobs'])
  assert.ok(worker.includes('CREATE TABLE IF NOT EXISTS '+table),table);
 assert.match(worker,/BOOK_ADMIN_TOKEN/);
 assert.match(worker,/editorial_review_required/);
 assert.match(worker,/publish_status='published'/);
 assert.match(worker,/MAX_FEED=100/);
 assert.match(worker,/async scheduled/);
});
