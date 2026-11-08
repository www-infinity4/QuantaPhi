import test from 'node:test';
import assert from 'node:assert/strict';
import {PREMIUM_CARDS,sourceURL,normalizeResults,attachArticleImages} from '../premium-source-cards.mjs';
import {COIN_MARKETS,normalizeCoinSaleResults,referenceCoinImage,attachLicensedCoinImages} from '../coin-sale-listings.mjs';
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

test('certified VAM marketplace results keep actual lot provenance, not old sales masquerading as for-sale',()=>{
 const seller=COIN_MARKETS.find(x=>x.id==='icollector');
 const rows=normalizeCoinSaleResults({results:[
  {title:'1889-O MORGAN DOLLAR, PCGS AU-53 VAM 2 OVAL O',url:'https://www.icollector.com/1889-O-MORGAN-DOLLAR-PCGS-AU-53-VAM-2-OVAL-O_i37331753',status:'sold',thumbnail:'https://www.icollector.com/photos/example.jpg'},
  {title:'Invented PCGS VAM lot',url:'https://www.icollector.com.attacker.invalid/lot',status:'open'},
  {title:'Uncertified Morgan dollar',url:'https://www.icollector.com/Morgan-Dollar_i123456',status:'active'},
  {title:'Coin index',url:'https://www.icollector.com/coins',status:'active'}
 ]},seller);
 assert.equal(rows.length,1);
 assert.equal(rows[0].seller,'iCollector');
 assert.equal(rows[0].saleStatus,'sold');
 assert.equal(rows[0].forSale,false);
 assert.equal(rows[0].image,null,'Image scraping is not image-use authorization');
 assert.match(rows[0].url,/_i37331753$/);
});
test('GreatCollections VAM lots require actual certified listing URLs and no invented price',()=>{
 const seller=COIN_MARKETS.find(x=>x.id==='greatcollections');
 const rows=normalizeCoinSaleResults({results:[
  {title:'1888-O Hot Lips VAM-4 Top 100 PCGS AU53',url:'https://www.greatcollections.com/Coin/2299600/1888-O-Morgan-Silver-Dollar-Hot-Lips-VAM-4-PCGS-AU-53',description:'Current Bid $410'},
  {title:'A non-PCGS advertising landing page',url:'https://www.greatcollections.com/vams'},
  {title:'Unrelated',url:'https://greatcollections.com.evil.test/Coin/1/Fake-PCGS-VAM'}
 ]},seller);
 assert.equal(rows.length,1);
 assert.equal(rows[0].saleStatus,'unverified');
 assert.equal(rows[0].price,null,'A search snippet is not a verified bid');
 assert.equal(rows[0].forSale,false);
});
test('licensed real PCGS holder illustration is labelled as reference, never a sale lot',()=>{
 const image=referenceCoinImage('pcgs');
 assert.equal(image.license,'CC0-1.0');
 assert.match(image.source,/commons\.wikimedia\.org\/wiki\/File:/);
 assert.match(image.label,/reference/i);
 assert.equal(image.isListingPhoto,false);
 assert.equal(referenceCoinImage('coinworld'),null);
});

test('seller photographs require an independent, exact-lot authorized media record',()=>{
 const market=COIN_MARKETS.find(x=>x.id==='icollector');
 const lot='https://www.icollector.com/1889-O-MORGAN-DOLLAR-PCGS-AU-53-VAM-2-OVAL-O_i37331753';
 const other='https://www.icollector.com/1889-O-MORGAN-DOLLAR-PCGS-AU-53-VAM-2-OVAL-O_i37331754';
 const rows=normalizeCoinSaleResults({results:[{title:'1889-O MORGAN DOLLAR PCGS AU-53 VAM 2 OVAL O',url:lot,thumbnail:'https://www.icollector.com/images/test.jpg',status:'sold'}]},market);
 const approval={schema_version:1,grants:[{
  market:'icollector',lot_url:lot,image_url:'https://www.icollector.com/photos/original-holder.jpg',
  image_credit:'iCollector auction catalog, rights-holder authorized',
  license:'seller-permitted',proof_url:'https://www.icollector.com/terms',
  approved_by:'reviewed-commercial-media',approved_at:'2026-11-07',expires_at:'2027-01-01'
 }]};
 const approved=attachLicensedCoinImages(rows,market,approval,'2026-11-07');
 assert.equal(approved.length,1);
 assert.equal(approved[0].image,'https://www.icollector.com/photos/original-holder.jpg');
 assert.match(approved[0].imageCredit,/rights-holder authorized/);
 assert.equal(approved[0].imageSource,lot);
 assert.equal(rows[0].image,null,'Do not mutate unapproved search results');
 assert.equal(attachLicensedCoinImages(rows,market,approval,'2027-11-07')[0].image,null,'Expired grants must not render');
 assert.equal(attachLicensedCoinImages([{...rows[0],url:other}],market,approval,'2026-11-07')[0].image,null,'A different coin cannot borrow a photo');
 assert.equal(attachLicensedCoinImages(rows,market,{...approval,grants:[{...approval.grants[0],image_url:'https://attacker.invalid/fake.jpg'}]},'2026-11-07')[0].image,null,'Media host must match approved seller domain');
 assert.equal(attachLicensedCoinImages(rows,market,{...approval,grants:[{...approval.grants[0],proof_url:''}]},'2026-11-07')[0].image,null,'Rights evidence URL is required');
});

test('each core collector source has its own rights-verified real coin or slab reference',()=>{
 const ids=['vamworld','pcgs','ngc','heritage'];
 const refs=ids.map(referenceCoinImage);
 assert.equal(new Set(refs.map(x=>x.source)).size,ids.length,'avoid the same generic image on every collector card');
 for(const r of refs){
  assert.match(r.source,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
  assert.match(r.image,/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//);
  assert.equal(r.license,'CC0-1.0');
  assert.equal(r.isListingPhoto,false);
  assert.match(r.label,/Reference:/);
 }
 assert.match(referenceCoinImage('ngc').label,/NGC/i);
 assert.match(referenceCoinImage('vamworld').label,/Morgan/i);
});

test('withdrawn and closed lots must not be reported as successfully sold',()=>{
 const seller=COIN_MARKETS.find(x=>x.id==='icollector');
 const base='https://www.icollector.com/';
 const titles=[
  {url:base+'PCGS-VAM-4_i37331753',title:'1888-O PCGS VAM 4 Hot Lips',status:'withdrawn'},
  {url:base+'PCGS-VAM-3_i37331754',title:'1891-CC PCGS VAM 3 Spitting Eagle',status:'ended'},
  {url:base+'PCGS-VAM-2_i37331755',title:'1889-O PCGS VAM 2 Oval O',status:'sold'}
 ];
 const rows=normalizeCoinSaleResults({results:titles},seller);
 assert.deepEqual(rows.map(x=>x.saleStatus),['withdrawn','closed','sold']);
 assert.ok(rows.every(x=>x.forSale===false));
});
