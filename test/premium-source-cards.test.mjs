import test from 'node:test';
import assert from 'node:assert/strict';
import {PREMIUM_CARDS,RESTAURANT_SPOTLIGHTS,sourceURL,normalizeResults} from '../premium-source-cards.mjs';
test('every added collector/source card has a unique fixed official HTTPS destination',()=>{
 assert.equal(PREMIUM_CARDS.length,17);assert.equal(new Set(PREMIUM_CARDS.map(x=>x.id)).size,17);
 for(const c of PREMIUM_CARDS){assert.ok(sourceURL(c.official));assert.ok(c.topics.length>=3);assert.ok(c.query);}
});
test('source result filtering rejects lookalike domains, unsafe links and unrelated publishers',()=>{
 const card=PREMIUM_CARDS.find(x=>x.id==='pcgs');
 const data={results:[{title:'Real PCGS record',url:'https://www.pcgs.com/coinfacts/coin/1',thumbnail:'https://images.example.org/coin.jpg'}, {title:'Wrong',url:'https://pcgs.com.attacker.example/coin'}, {title:'Wrong',url:'javascript:alert(1)'}, {title:'Credentials',url:'https://user:pass@pcgs.com/coin'}, {title:'Unrelated',url:'https://example.org/coin'}]};
 const rows=normalizeResults(data,card);assert.equal(rows.length,1);assert.equal(rows[0].title,'Real PCGS record');
 assert.equal(sourceURL('data:image/png;base64,AAA'),null);assert.equal(sourceURL('https://pcgs.com.evil.test/x','pcgs.com'),null);
});
test('Heritage searches include real source subdomains and image results retain attribution',()=>{
 const card=PREMIUM_CARDS.find(x=>x.id==='heritage');
 const rows=normalizeResults({results:[{title:'An auction record',url:'https://coins.ha.com/itm/example',img_src:'https://images.ha.com/coin.jpg',content:'Source description'}]},card);
 assert.equal(rows.length,1);assert.equal(rows[0].credit,'coins.ha.com');assert.equal(rows[0].image,'https://images.ha.com/coin.jpg');
});
test('NASA records retain actual source ID, credits, dates and images',()=>{
 const card=PREMIUM_CARDS.find(x=>x.id==='nasa-library');
 const rows=normalizeResults({collection:{items:[{data:[{title:'Carina',nasa_id:'PIA123',secondary_creator:'NASA / ESA',description:'Actual caption',date_created:'2022-07-12'}],links:[{rel:'preview',href:'https://images-assets.nasa.gov/image/PIA123/PIA123~thumb.jpg'}]}]}},card);
 assert.equal(rows[0].url,'https://images.nasa.gov/details/PIA123');assert.equal(rows[0].credit,'NASA / ESA');assert.equal(rows[0].date,'2022-07-12');
});

test('McDonald’s and Burger King use source photographs and link real menu pages without pretending to sell',()=>{
 for(const id of ['mcdonalds','burger-king']){
  const spotlight=RESTAURANT_SPOTLIGHTS[id];
  assert.ok(spotlight,id);
  for(const key of ['photo','menu','source'])assert.ok(sourceURL(spotlight[key]),id+' '+key);
  assert.ok(spotlight.description.includes('availability')||spotlight.description.includes('discount'));
 }
 assert.match(RESTAURANT_SPOTLIGHTS.mcdonalds.photo,/scene7\.com\/is\/image\/mcdonalds/);
 assert.match(RESTAURANT_SPOTLIGHTS['burger-king'].source,/news\.bk\.com/);
});
