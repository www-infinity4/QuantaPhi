import test from 'node:test';
import assert from 'node:assert/strict';
import { ESSENTIALS_SEED, prepareEssentialsBatch, validateEssentialCard } from '../essentials-card-batch.mjs';

test('Blue Star is a source-backed original 2oz ointment, with no fabricated sale or sponsorship', () => {
 const item = ESSENTIALS_SEED.find(card => card.id === 'blue-star-ointment');
 assert.equal(item.productUrl,'https://www.walmart.com/ip/10316529');
 assert.match(item.imageUrl, /^https:\/\/i5\.walmartimages\.com\//);
 assert.equal(item.size, '2 oz');
 assert.match(item.drugFacts, /camphor 1\.24%/i);
 assert.equal(item.sponsored, false);
 assert.equal(item.price, undefined);
 assert.equal(validateEssentialCard(item,{today:'2026-11-07'}), true);
});

test('pilot includes multiple publishers so a deliberate related follow can rotate publishers', () => {
 const {cards, held} = prepareEssentialsBatch(ESSENTIALS_SEED, {today:'2026-11-07'});
 assert.equal(cards.length,4);
 assert.deepEqual(held, []);
 assert.equal(new Set(cards.map(c=>new URL(c.productUrl).hostname)).size,3);
 assert.ok(cards.every(c=>c.category === 'Skin relief'));
});

test('a verified batch can accept 120 distinct records, never quietly inventing extras', () => {
 const base=ESSENTIALS_SEED[0];
 const raw=Array.from({length:125},(_,i)=>({...base,id:`verified-item-${i}`,name:`Reviewed item ${i}`}));
 const r=prepareEssentialsBatch(raw,{today:'2026-11-07'});
 assert.equal(r.cards.length,120);
 assert.equal(r.held.length,5);
 assert.ok(r.held.every(x=>x.reason==='batch_limit'));
});

test('holds duplicates, pending reviews, missing images, insecure and expired records', () => {
 const base=ESSENTIALS_SEED[0];
 const data=[base,{...base}, {...base,id:'not-ready',reviewState:'pending'},
  {...base,id:'no-photo',imageUrl:''},
  {...base,id:'fake-ssl',productUrl:'http://www.walmart.com/ip/10316529'},
  {...base,id:'private-lookup',imageUrl:'https://localhost/secret'},
  {...base,id:'expired',checkedAt:'2025-01-01'},
  {...base,id:'paid-without-consent',sponsored:true}];
 const {cards,held}=prepareEssentialsBatch(data,{today:'2026-11-07'});
 assert.equal(cards.length,1);
 assert.equal(held.length,7);
});

test('catalog avoids ranking medication as trending based only on an editorial listing', () => {
 const {cards}=prepareEssentialsBatch(ESSENTIALS_SEED,{today:'2026-11-07'});
 assert.ok(cards.every(c=>!('trendingScore' in c)));
 assert.ok(cards.every(c=>c.reviewState==='editorial-reviewed'));
});