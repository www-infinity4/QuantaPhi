import test from 'node:test';
import assert from 'node:assert/strict';
import {PREMIUM_CARDS,sourceURL,normalizeResults,attachArticleImages} from '../premium-source-cards.mjs';
test('every added collector/source card has a unique fixed official HTTPS destination',()=>{
 assert.equal(PREMIUM_CARDS.filter(x=>!x.id.startsWith('denver-')).length,17);
 assert.equal(PREMIUM_CARDS.filter(x=>x.id.startsWith('denver-')).length,8);
 assert.equal(new Set(PREMIUM_CARDS.map(x=>x.id)).size,PREMIUM_CARDS.length);
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

test('Coin World opens on numismatic news rather than only a Morgan-dollar search',()=>{
 const card=PREMIUM_CARDS.find(x=>x.id==='coinworld');
 assert.match(card.query,/news/i);
});
test('Coin World source results preserve genuine story pictures from image_url',()=>{
 const card=PREMIUM_CARDS.find(x=>x.id==='coinworld');
 const rows=normalizeResults({results:[
  {title:'Coin World original headline',url:'https://www.coinworld.com/news/us-coins/real-story',image_url:'https://assets.coinworld.com/news/real-story.jpg',description:'Original article excerpt',publishedDate:'2026-11-07'},
  {title:'Unrelated site',url:'https://coinworld.com.attacker.test/news/fake',image_url:'https://attacker.test/coin.jpg'}
 ]},card);
 assert.equal(rows.length,1);
 assert.equal(rows[0].image,'https://assets.coinworld.com/news/real-story.jpg');
 assert.equal(rows[0].date,'2026-11-07');
 assert.equal(rows[0].description,'Original article excerpt');
});

test('Coin World images attach only to matching publisher stories despite tracking parameters',()=>{
 const stories=[
  {url:'https://www.coinworld.com/news/us-coins/real-story?utm_source=search',title:'Real story',image:null},
  {url:'https://www.coinworld.com/news/us-coins/different-story',title:'Different story',image:null}
 ];
 const verifiedImage=[{url:'https://www.coinworld.com/news/us-coins/real-story',image:'https://assets.coinworld.com/news/real-story.jpg'}];
 const merged=attachArticleImages(stories,verifiedImage);
 assert.equal(merged[0].image,'https://assets.coinworld.com/news/real-story.jpg');
 assert.equal(merged[1].image,null,'Do not attribute a photo to the wrong news story');
 assert.equal(stories[0].image,null,'Do not mutate publisher search records');
});
