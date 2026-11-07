import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ESSENTIALS_SEED,prepareEssentialsBatch,validateEssentialCard} from '../essentials-card-batch.mjs';

test('Blue Star 2 oz uses the exact owner-supplied Walmart product with a matching jar photograph',()=>{
 const c=ESSENTIALS_SEED.find(c=>c.id==='blue-star-ointment');
 assert.equal(c?.productUrl,'https://www.walmart.com/ip/10316529');
 assert.equal(c?.size,'2 oz');
 assert.match(c.imageUrl,/^https:\/\/i5\.walmartimages\.com\/seo\/Blue-Star/);
 assert.equal(c.category,'Skin relief');
 assert.equal(c.sponsored,false);
 assert.equal(validateEssentialCard(c,{today:'2026-11-07'}),true);
});
test('Neosporin Original 1 oz is its own first-aid card, not incorrectly sold as itch cream',()=>{
 const c=ESSENTIALS_SEED.find(c=>c.id==='neosporin-original-1oz');
 assert.equal(c?.productUrl,'https://www.walmart.com/ip/10294303');
 assert.equal(c?.size,'1 oz');
 assert.equal(c.category,'First aid');
 assert.match(c.imageUrl,/^https:\/\/i5\.walmartimages\.com\/asr\//);
 assert.match(c.description,/minor cuts/i);
 assert.match(c.drugFacts,/bacitracin/i);
 assert.equal(validateEssentialCard(c,{today:'2026-11-07'}),true);
});
test('both products and companion OTC essentials are eligible for reviewed card creation',()=>{
 const {cards,held}=prepareEssentialsBatch(ESSENTIALS_SEED,{today:'2026-11-07'});
 assert.equal(cards.length,5);
 assert.deepEqual(held,[]);
 assert.equal(new Set(cards.map(c=>c.id)).size,5);
 assert.ok(cards.every(c=>!c.price&&!c.stock&&!c.trendingScore&&!c.sponsorClaim));
});
test('up to 120 reviewed records can be prepared without guessing any extra products',()=>{
 const base=ESSENTIALS_SEED[0];
 const fixture=Array.from({length:125},(_,i)=>({...base,id:'sample-'+i,name:'Verified fixture '+i}));
 const {cards,held}=prepareEssentialsBatch(fixture,{today:'2026-11-07'});
 assert.equal(cards.length,120);
 assert.equal(held.length,5);
 assert.ok(held.every(c=>c.reason==='batch_limit'));
});
test('review holds invalid, expired, duplicate and sponsored offers',()=>{
 const c=ESSENTIALS_SEED[0];
 const {cards,held}=prepareEssentialsBatch([c,{...c},
  {...c,id:'stale',checkedAt:'2020-01-01'},
  {...c,id:'unreviewed',reviewState:'pending'},
  {...c,id:'insecure',imageUrl:'http://example.com/fake.jpg'},
  {...c,id:'unsanctioned-ad',sponsored:true}],{today:'2026-11-07'});
 assert.equal(cards.length,1);assert.equal(held.length,5);
});
test('homepage directly spotlights both ORIGINAL cards inside Oracle and never launches a duplicate carousel',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const deck=readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../essentials-quick-cards.mjs',import.meta.url),'utf8');
 assert.match(html,/<section id="essentialsQuickCards"[^>]+hidden/);
 assert.match(html,/data-oracle-spotlight="source-blue-star-ointment"/);
 assert.match(html,/data-oracle-spotlight="source-neosporin-original-1oz"/);
 assert.match(deck,/#essentialsQuickCards \.iqc-card\[data-source-id\]/);
 assert.match(ui,/mountCardActions/);
 assert.match(ui,/quantaphi:source-cards-ready/);
 assert.match(ui,/dataset\.sourceReady='true'/);
 assert.match(ui,/dataset\.personalization='disabled'/);
});
