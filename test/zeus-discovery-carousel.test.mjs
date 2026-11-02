import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DISCOVERY_CARDS,approveCreatorEntry,cardsForTab,advanceIndex,shouldAdvance} from '../zeus-discovery-core.mjs';
import {APPROVED_PUBLIC_GPT_LINKS} from '../zeus-community-verified.mjs';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
test('Infinity edition cards reuse existing four Coliseum editions with truthful readiness',()=>{
 const editions=DISCOVERY_CARDS.filter(card=>card.kind==='infinity');
 assert.deepEqual(editions.map(c=>c.id),['zeus','hermes','athena','hephaestus']);
 assert.equal(editions[0].status,'prototype');
 for(const c of editions){
  assert.equal(c.provider,'Infinity / QuantaPhi');
  assert.match(c.url,/^\/coliseum\/index\.html#/);
  assert.equal(c.isOfficialOpenAIModel,false);
  assert.ok(c.cta.length>4);
 }
 assert.ok(editions.filter(x=>x.status!=='prototype').every(x=>x.cta==='Preview concept'));
});
test('public directory cards open truthful provider destinations; no fake GPT IDs or prices',()=>{
 const dirs=DISCOVERY_CARDS.filter(x=>x.kind==='directory');
 assert.deepEqual(dirs.map(x=>x.id),['existing-gpts','creator-plugins']);
 const verified=DISCOVERY_CARDS.filter(x=>x.kind==='verified-plugin');
 assert.deepEqual(verified.map(x=>x.id),['consensus-plugin','data-analytics-plugin']);
 assert.ok(verified.every(x=>x.status==='verified-link'&&x.url.startsWith('https://chatgpt.com/plugins/')));
 assert.equal(dirs[0].url,'https://chatgpt.com/gpts');
 assert.equal(dirs[1].url,'https://chatgpt.com/plugins');
 assert.ok(DISCOVERY_CARDS.every(x=>!x.members&&x.priceCharged===undefined));
});
test('creator GPT listings only enter the carousel with verified source, rights and HTTPS links',()=>{
 const proposal={id:'writer-helper',kind:'gpt',name:'Writer helper',creator:'Example publisher',description:'A short description',url:'https://chatgpt.com/g/g-abc123-writer',reviewedAt:'2026-11-01T20:00:00Z',sourceStatus:'verified',permission:'public-link'};
 assert.equal(approveCreatorEntry(proposal)?.id,'writer-helper');
 for(const patch of [{url:'javascript:alert(1)'},{url:'https://evil.example/g/g-foo'},{url:'https://chatgpt.com.evil.example/g/g-foo'},{url:'https://chatgpt.com/gpts'},{sourceStatus:'pending'},{permission:'unknown'},{creator:''},{name:''},{reviewedAt:'not-a-date'},{id:'../evil'}]){
  assert.equal(approveCreatorEntry({...proposal,...patch}),null,JSON.stringify(patch));
 }
});
test('tabs and movement are deterministic and never invent unpublished creators',()=>{
 assert.equal(APPROVED_PUBLIC_GPT_LINKS.length,2);
 assert.equal(cardsForTab('creator').length,6);
 assert.ok(cardsForTab('creator').some(x=>x.kind==='creator-gpt'&&x.name==='Mr. Lump the code tutor'));
 assert.ok(cardsForTab('creator').some(x=>x.kind==='creator-gpt'&&x.name==='Data Analyst Career Guide'));
 assert.equal(cardsForTab('infinity').length,4);
 assert.equal(cardsForTab('all').length,10);
 assert.equal(advanceIndex(0,6,-1),5);
 assert.equal(advanceIndex(5,6,1),0);
 assert.equal(advanceIndex(9,0,1),0);
});
test('watch mode stops offscreen, on hidden pages, and for reduced motion',()=>{
 const base={playing:true,visible:true,hidden:false,reducedMotion:false};
 assert.equal(shouldAdvance(base),true);
 for(const patch of [{playing:false},{visible:false},{hidden:true},{reducedMotion:true}])assert.equal(shouldAdvance({...base,...patch}),false);
});
test('homepage has a distinct Zeus section after Oracle, not cloned from the original widget',async()=>{
 const html=await read('../index.html');
 const a=html.indexOf('id="oracleCardDeck"'),b=html.indexOf('id="zeusDiscoveryCarousel"');
 assert.ok(a>0&&b>a);
 assert.match(html,/<script type="module" src="\/zeus-discovery-carousel\.mjs\?v=/);
 assert.match(html,/<link rel="stylesheet" href="\/zeus-discovery-carousel\.css\?v=/);
 assert.match(html,/id="zeusDiscoverStage"/);
 assert.match(html,/id="zeusDiscoverFullscreen"/);
 assert.equal((html.match(/id="zeusDiscoveryCarousel"/g)||[]).length,1);
});
test('carousel styling supports touch snap, presentation mode, focus and motion preferences',async()=>{
 const style=await read('../zeus-discovery-carousel.css');
 assert.match(style,/scroll-snap-type:\s*x mandatory/);
 assert.match(style,/:fullscreen/);
 assert.match(style,/prefers-reduced-motion:\s*reduce/);
 assert.match(style,/:focus-visible/);
 const legacy=await read('../quick-card-modernize.css');
 assert.match(legacy,/#oracleCardStage/);
 assert.match(legacy,/\.qca-toolbar/);
 assert.doesNotMatch(legacy,/#oracleCardStage\s+video\s*\{/);
});
