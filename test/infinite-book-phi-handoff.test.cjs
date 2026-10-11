const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
const source=read('infinite-book.js');
const begin=source.indexOf('  function indexedSearchTerms(story) {');
const finish=source.indexOf('  async function researchSuggestions(story, ticket)',begin);
if(begin<0||finish<0)throw new Error('Story handoff helpers missing');
// Exercise the real production URL functions, without a browser or network.
const helpers=new Function('catalog','location',source.slice(begin,finish)+';return {indexedSearchTerms,buildUrl};')(
  {sectors:[{id:'music',name:'Music and bands'}]},
  {origin:'https://quantaphi.org'}
);
test('Phi story handoff keeps exact story title before index words',()=>{
  const story={id:'the-who-story',title:'The Who',sector:'music',summary:'British rock band performing live music'};
  const keywords=helpers.indexedSearchTerms(story);
  assert.match(keywords,/^The Who(?: |$)/);
  assert.match(keywords,/Music|bands|British|rock/i);
  assert.ok(keywords.length<=110);
  assert.equal(keywords.split(/\\s+/).filter(x=>x==='The').length,1);
});
test('each Phi destination receives the same keywords and a safe story identifier',()=>{
  const story={id:'real-history-1',title:'The Doors',sector:'music',summary:'American rock music keyboard band'};
  const keywords=helpers.indexedSearchTerms(story);
  for(const [app,route] of [['infinity','/infinity-phi/'],['omni','/omni-phi/overview/'],['quanta','/']]){
    const url=new URL(helpers.buildUrl(app,story));
    assert.equal(url.origin,'https://quantaphi.org');
    assert.equal(url.pathname,route);
    assert.equal(url.searchParams.get('q'),keywords);
    assert.equal(url.searchParams.get('story'),story.id);
  }
  const untrusted={...story,id:'../../evil?target=x'};
  assert.equal(new URL(helpers.buildUrl('infinity',untrusted)).searchParams.has('story'),false);
});
test('story Build buttons preserve existing in-page site handoff and Quanta explicit search',()=>{
  assert.match(source,/if\(action==='build'&&current\)/);
  assert.match(source,/tool==='quanta'/);
  assert.match(source,/go\.click\(\)/);
  assert.match(source,/window\.QuantaOpenSite\(target\)/);
  assert.match(source,/window\.PhiAssimilation\?\.signal\?/);
});
