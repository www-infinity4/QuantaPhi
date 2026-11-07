import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ESSENTIALS_SEED,prepareEssentialsBatch,validateEssentialCard} from '../essentials-card-batch.mjs';

const page=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');
const expected=[
 {id:'aquaphor-healing-175oz',brand:'Aquaphor',size:'1.75 oz',category:'Skin relief',url:'https://www.walmart.com/ip/193670269',image:/^https:\/\/i5\.walmartimages\.com\/seo\/Aquaphor-Healing-Ointment/},
 {id:'band-aid-hydro-seal-10ct',brand:'Band-Aid',size:'10 ct',category:'First aid',url:'https://www.kroger.com/p/band-aid-brand-hydro-seal-waterproof-first-aid-hydrocolloid-gel-bandages/0038137117297',image:/^https:\/\/d3pq5rjvq8yvv1\.cloudfront\.net\/catalog\/product\//},
 {id:'cortizone10-sensitive-skin-2oz',brand:'Cortizone-10',size:'2 oz',category:'Skin relief',url:'https://www.walmart.com/ip/1520268394',image:/^https:\/\/i5\.walmartimages\.com\/seo\/Cortizone-10-Maximum-Strength/}
];
test('three new real companion essentials are unique product cards with matching package imagery',()=>{
 for(const item of expected){
  const card=ESSENTIALS_SEED.find(c=>c.id===item.id);
  assert.ok(card,'missing '+item.id);
  assert.equal(card.brand,item.brand);
  assert.equal(card.size,item.size);
  assert.equal(card.category,item.category);
  assert.equal(card.productUrl,item.url);
  assert.match(card.imageUrl,item.image);
  assert.equal(card.sponsored,false);
  assert.equal(card.imageRights,'not-confirmed-for-paid-ads');
  assert.equal(validateEssentialCard(card,{today:'2026-11-07'}),true);
  assert.ok(!card.trendingScore&&!card.price&&!card.stock&&!card.sponsorClaim);
 }
 assert.equal(new Set(ESSENTIALS_SEED.map(x=>x.id)).size,ESSENTIALS_SEED.length);
 assert.equal(prepareEssentialsBatch(ESSENTIALS_SEED,{today:'2026-11-07'}).cards.length,8);
});
test('medicine facts clearly distinguish protectant, antibiotic, hydrocolloid and steroid',()=>{
 const aquaphor=ESSENTIALS_SEED.find(c=>c.id==='aquaphor-healing-175oz');
 const hydro=ESSENTIALS_SEED.find(c=>c.id==='band-aid-hydro-seal-10ct');
 const cort=ESSENTIALS_SEED.find(c=>c.id==='cortizone10-sensitive-skin-2oz');
 assert.match(aquaphor.drugFacts,/petrolatum.*41%/i);
 assert.match(hydro.description,/hydrocolloid/i);
 assert.match(hydro.drugFacts,/clean.*dry/i);
 assert.match(hydro.drugFacts,/without.*ointment/i);
 assert.match(cort.drugFacts,/hydrocortisone.*1%/i);
 assert.match(cort.drugFacts,/ages 2\+/i);
 assert.match(cort.drugFacts,/7 days/i);
});
test('all five featured source jump controls open the same original Oracle carousel, without new shelf or ads',()=>{
 const html=page();
 for(const {id} of expected){
  assert.match(html,new RegExp('data-oracle-spotlight="source-'+id+'"'));
 }
 for(const id of ['blue-star-ointment','neosporin-original-1oz']){
  assert.match(html,new RegExp('data-oracle-spotlight="source-'+id+'"'));
 }
 assert.match(html,/More essentials/);
 assert.match(html,/<section id="essentialsQuickCards"[^>]*hidden/);
 assert.doesNotMatch(html,/data-medicine-targeting="enabled"/);
});
