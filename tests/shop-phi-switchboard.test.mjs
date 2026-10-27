import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {contextFor,chooseCompanions,normalizeCandidate,approvedQuickCards,shopItems,SLOT_COUNT,httpsUrl} from '../shop-phi-switchboard.mjs';
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const mockAd=(id,topic,sponsor='Merchant '+id)=>({
 id:'ad-'+id,title:topic+' selection',url:'https://seller'+id+'.example/shop',
 type:'sponsored',sponsor,contextTopic:topic,image:'https://images.example/items/'+id+'.jpg'
});
test('one Morgan dollar receives six distinct complementary candidates, not six copies of its own card',()=>{
 const hero={id:'morgan-1881',title:'1881 Morgan silver dollar',category:'Coins'};
 const topics=contextFor(hero).topics;
 assert.equal(topics.length,SLOT_COUNT);
 const pool=topics.map((topic,i)=>mockAd(i+1,topic)).concat([{
  id:'irrelevant',title:'Heavy construction equipment',url:'https://unrelated.example/item',
  type:'sponsored',sponsor:'Construction',contextTopic:'bulldozer'
 }]);
 const selected=chooseCompanions(hero,pool);
 assert.equal(selected.length,6);assert.equal(new Set(selected.map(x=>x.url)).size,6);
 assert.ok(selected.every(x=>x.type==='sponsored'));
 assert.ok(selected.every(x=>x.id!=='irrelevant'));
 assert.ok(selected.some(x=>x.contextTopic==='coin grading pcgs'));
 assert.ok(selected.some(x=>x.contextTopic==='jeweler loupe'));
});
test('jeans switches companion topics to related clothing, not the coin graph',()=>{
 const denim=contextFor({title:"Levi's 501 blue jeans"});
 assert.equal(denim.id,'denim');assert.ok(denim.topics.includes('denim jackets'));
 assert.ok(denim.topics.includes('belts'));assert.ok(!denim.topics.includes('gold coins'));
 const pool=denim.topics.map((topic,i)=>mockAd(i+1,topic));
 assert.equal(chooseCompanions({id:'jeans',title:'blue jeans'},pool).length,6);
 assert.equal(chooseCompanions({title:'jeans'},[mockAd(99,'coin albums')]).length,0);
});
test('sensitive topics do not trigger contextual advertiser queries',()=>{
 for(const word of ['religion','election','medical','ethnic']){
  const x=contextFor({title:'A '+word+' website'});
  assert.equal(x.sensitive,true);assert.deepEqual(x.topics,[]);
 }
});
test('private and unlisted Quick Cards never enter public companion inventory',()=>{
 const cards=approvedQuickCards({cards:[
  {slug:'private-card',title:'Silver dollar secret',cardUrl:'https://quantaphi.org/cards/private-card',status:'unlisted'},
  {slug:'public-card',title:'Coin albums and supplies',cardUrl:'https://quantaphi.org/cards/public-card',
   website:'https://coins.example',status:'approved',image:'https://coins.example/album.jpg'},
  {slug:'removed-card',title:'Removed coin card',cardUrl:'https://quantaphi.org/cards/removed-card',status:'removed'}
 ]});
 assert.equal(cards.length,1);assert.equal(cards[0].id,'quick-public-card');
 assert.equal(cards[0].type,'published-card');
 assert.equal(cards[0].image,'https://coins.example/album.jpg');
});
test('only public shop items and real original merchant links compete',()=>{
 const cards=shopItems({items:[
  {item_id:'a',title:'Coin supplies',source_url:'https://store.example/a',state:'published'},
  {item_id:'b',title:'My private coin',source_url:'https://store.example/b',state:'draft'},
  {item_id:'c',title:'Bad coin URL',source_url:'javascript:alert(1)',state:'published'}
 ]});
 assert.equal(cards.length,1);assert.equal(cards[0].sourceId,'a');
 assert.equal(httpsUrl('http://example.com'), '');
 assert.equal(httpsUrl('https://127.0.0.1/internal'), '');
 assert.equal(httpsUrl('https://store.example/item'),'https://store.example/item');
 assert.equal(normalizeCandidate({id:'test',title:'Coin',url:'https://shop.example',type:'published-card',status:'unlisted'}),null);
});
test('Quant score cannot force unrelated content into a highly visible flank',()=>{
 const hero={id:'morgan',title:'Morgan silver dollar'};
 const helpful=mockAd(1,'silver dollars');
 const unrelated=mockAd(2,'office chairs');
 const selected=chooseCompanions(hero,[helpful,unrelated],{quantScores:{'ad-2':100000}});
 assert.deepEqual(selected.map(x=>x.id),['ad-1']);
});
test('competitors must have distinct destinations and sponsored merchants',()=>{
 const hero={id:'morgan',title:'Morgan dollar'};
 const a=mockAd('a','silver dollar','SameMerchant'),b=mockAd('b','gold coins','SameMerchant');
 const dup={...mockAd('c','coin albums'),url:a.url};
 const selected=chooseCompanions(hero,[a,b,dup]);
 assert.equal(selected.length,1);assert.ok([a.url,b.url].includes(selected[0].url));
});
test('recorded anonymous exposure reduces repeated winning, not creates StarCoin payouts',()=>{
 const hero={id:'coins',title:'Morgan silver dollar'};
 const a=mockAd('a','silver dollar'),b=mockAd('b','silver dollar');
 const first=chooseCompanions(hero,[a,b]);
 assert.equal(first.length,2);
 const next=chooseCompanions(hero,[a,b],{exposures:{[first[0].id]:100},rotation:1});
 assert.equal(next[0].id,first[1].id);
 const code=src('shop-phi-switchboard.mjs');
 assert.doesNotMatch(code,/QuantaStarCredit|wallet\.credit|mintStarCoin/);
});
test('six responsive positions preserve original viewer and scripts, with real provenance labels',()=>{
 const deck=src('oracle-card-deck.js'),page=src('index.html'),
  shop=src('shop-ad-phi.js'),css=src('shop-phi-switchboard.css'),engine=src('shop-phi-switchboard.mjs');
 assert.match(page,/shop-phi-switchboard\.mjs\?v=20261027-readability2/);
 assert.match(page,/shop-phi-switchboard\.css\?v=20261027-readability2/);
 assert.match(deck,/quantaphi:switchboard-change/);
 assert.match(shop,/quantaphi:switchboard-change/);
 assert.match(engine,/stage\.parentNode\.insertBefore\(grid,stage\)/);
 assert.match(engine,/grid\.append\(before,stage,after\)/);
 assert.match(engine,/INDEPENDENT SOURCE CARD/);
 assert.match(engine,/SPONSORED/);
 assert.match(css,/@media\(max-width:480px\)/);
 assert.match(css,/repeat\(3,minmax\(0,1fr\)\)/);
});

test('readable mobile cards paginate two at a time and avoid blank ad placeholders',()=>{
 const css=src('shop-phi-switchboard.css'),module=src('shop-phi-switchboard.mjs');
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/shopphi-flank-visual\{height:clamp\(120px,39vw,165px\)/);
 assert.match(css,/shopphi-flank-cta\{min-height:48px\}/);
 assert.match(module,/next\.addEventListener\('click'/);
 assert.match(module,/prev\.addEventListener\('click'/);
 assert.match(module,/card\.hidden=index<start\|\|index>=start\+2/);
 assert.match(module,/if\(!visible\.length\)/);
 assert.doesNotMatch(module,/Awaiting a verified offer/);
 assert.match(module,/link\.target=internal\?'_self':'_blank'/);
 assert.match(module,/actualImage=httpsUrl\(new URL\(image,location\.href\)\.href\)/);
 assert.match(module,/window\.addEventListener\('load'/);
 assert.match(module,/window\.addEventListener\('quantaphi:source-cards-ready'/);
});
test('missing image shows an honest source identity instead of invented product photography',()=>{
 const module=src('shop-phi-switchboard.mjs'),css=src('shop-phi-switchboard.css');
 assert.match(module,/shopphi-flank-no-photo/);
 assert.match(module,/Source image unavailable/);
 assert.match(module,/Open interactive Quick Card/);
 assert.match(css,/\.shopphi-flank-brand/);
 assert.match(css,/height:165px/);
 assert.match(css,/\.shopphi-flank\[hidden\]\{display:flex!important\}/);
});
