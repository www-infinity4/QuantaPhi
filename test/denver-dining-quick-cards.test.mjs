import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PREMIUM_CARDS} from '../premium-source-cards.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const ids=['denver-sams-no3','denver-work-and-class','denver-major-tom','denver-steubens','denver-hampton-social','denver-rhein-haus','denver-atomic-cowboy','denver-casa-bonita'];
test('eight Denver restaurant quick cards are independently available to the Oracle viewer',()=>{
 const cards=ids.map(id=>PREMIUM_CARDS.find(card=>card.id===id));
 assert.equal(cards.length,8);
 for(let i=0;i<cards.length;i++){
  const card=cards[i];
  assert.ok(card,ids[i]+' not registered');
  assert.equal(card.category,'Restaurants');
  assert.ok(card.dining?.district);
  assert.ok(card.dining?.address);
  assert.ok(card.dining?.highlight);
  assert.equal(new URL(card.official).protocol,'https:');
  assert.equal(new URL(card.dining.menu).protocol,'https:');
 }
 assert.equal(new Set(ids).size,8);
});
test('Denver cards have real on-card menu and directions actions, but no fake reservation capability',()=>{
 const source=read('premium-source-cards.mjs');
 assert.match(source,/denver-dining-details/);
 assert.match(source,/maps\/search\/\?api=1/);
 assert.match(source,/card\.dining\.booking/);
 assert.match(source,/mountRotatingSpotlights/);
 assert.match(source,/mountCardActions/);
 for(const id of ids)assert.match(source,new RegExp(id));
 assert.doesNotMatch(source,/confirmed available.*[0-9]+:[0-9]+/i);
});
test('Denver dining uses the existing card carousel without wallet or auth modifications',()=>{
 const source=read('premium-source-cards.mjs');
 assert.match(source,/data-oracle-widget-bank|premiumSourceCards/);
 assert.match(source,/quantaphi:source-cards-ready/);
 assert.match(read('premium-source-cards.css'),/\.denver-dining-details/);
});
