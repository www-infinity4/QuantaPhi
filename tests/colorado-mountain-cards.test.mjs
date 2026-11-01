import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REQUESTED_PUBLIC_CARDS,validBrandSportsCard} from '../verified-brand-sports-catalog.mjs';
const colorado=REQUESTED_PUBLIC_CARDS.filter(card=>card.collection==='colorado-mountain-adventures');
const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Colorado mountain adventure guide registers exactly six distinct public Quick Cards',()=>{
 const ids=['colorado-rocky-mountain','colorado-numbers-rafting','colorado-breckenridge-trails','colorado-glenwood-hot-springs','colorado-ouray-ice-park','colorado-ice-lakes-basin'];
 assert.deepEqual(colorado.map(x=>x.id),ids);
 assert.ok(colorado.every(validBrandSportsCard));
 assert.ok(colorado.every(x=>x.kind==='travel'&&x.actions.length===3));
 assert.equal(new Set(colorado.map(x=>x.official)).size,6);
});
test('every destination has an authentic source image, linked image credit and season/safety guidance',()=>{
 for(const item of colorado){
  assert.match(item.visual,/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//);
  assert.ok(item.photoCredit?.url.startsWith('https://commons.wikimedia.org/wiki/File:'));
  assert.ok(item.photoCredit?.label.length>5);
  assert.ok(item.difficulty.length>2&&item.season.length>4&&item.safety.length>12);
  assert.ok(item.actions.every(action=>action.url.startsWith('https://')));
  assert.ok(!('price' in item), 'do not freeze variable guide prices on the card');
 }
});
test('travel cards share working Oracle source controls and photo-attribution view',()=>{
 const view=src('verified-brand-sports-cards.mjs'),css=src('verified-brand-sports-cards.css');
 assert.match(view,/card\.photoCredit/);
 assert.match(view,/vbs-travel-meta/);
 assert.match(view,/mountCardActions\(shared/);
 assert.match(css,/\.vbs-kind-travel \.vbs-identity/);
 const deck=src('oracle-card-deck.js');
 assert.match(deck,/#verifiedBrandSportsCards \.iqc-card/);
});
