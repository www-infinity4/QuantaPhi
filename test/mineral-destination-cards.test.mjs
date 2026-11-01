import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MINERAL_DESTINATIONS,validMineralDestination,officialMapsUrl,imageAltForMineralDestination} from '../mineral-destination-cards.mjs';

test('six individually registered mining and mineral Quick Cards use real official sites',()=>{
 const ids=['crater-of-diamonds','national-mining-hall-of-fame','gem-mountain-montana','western-mining-museum','last-chance-mine','mines-museum-earth-science'];
 assert.deepEqual(MINERAL_DESTINATIONS.map(x=>x.id),ids);
 assert.equal(new Set(ids).size,6);
 for(const card of MINERAL_DESTINATIONS){
  assert.equal(validMineralDestination(card),true,card.id);
  assert.match(card.name,/./);
  assert.match(card.summary,/./);
  assert.match(card.visitorNote,/./);
  assert.match(card.location,/./);
  assert.match(officialMapsUrl(card),/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
 }
 assert.match(MINERAL_DESTINATIONS[2].official,/gemmountainmt\.com/);
 assert.doesNotMatch(MINERAL_DESTINATIONS[2].official,/gemmountain\.com\//);
});

test('mine tours are not promised during winter, nor are prices hardcoded as live',()=>{
 const gem=MINERAL_DESTINATIONS.find(x=>x.id==='gem-mountain-montana');
 const chance=MINERAL_DESTINATIONS.find(x=>x.id==='last-chance-mine');
 assert.match(gem.visitorNote,/seasonal/i);
 assert.match(chance.visitorNote,/seasonal/i);
 assert.match(gem.actions[1].url,/gemmountainmt\.com\/plan-your-trip/);
 for(const card of MINERAL_DESTINATIONS){
  assert.doesNotMatch(card.visitorNote,/guaranteed availability|open now/i);
  assert.ok(card.actions.every(a=>a.label&&a.url.startsWith('https://')));
 }
});

test('all displayed external photos have Commons credit and a public license; missing art falls back truthfully',()=>{
 for(const card of MINERAL_DESTINATIONS){
  if(!card.image)continue;
  assert.match(card.image.file,/\.jpg$/);
  assert.match(card.image.credit,/./);
  assert.match(card.image.license,/^(?:Public domain|CC BY(?:-SA)? [234]\.0)$/);
  assert.match(card.image.source,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
 }
 assert.equal(MINERAL_DESTINATIONS.find(x=>x.id==='gem-mountain-montana').image,null);
});

test('existing single-card carousel, shared tools and protected wallet remain intact',()=>{
 const code=readFileSync(new URL('../mineral-destination-cards.mjs',import.meta.url),'utf8');
 const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(code,/mountCardActions\(/);
 assert.match(code,/getElementById\('premiumSourceCards'\)/);
 assert.match(code,/quantaphi:source-cards-ready/);
 assert.match(home,/mineral-destination-cards\.mjs\?v=20261101-1/);
 assert.match(home,/mineral-destination-cards\.css\?v=20261101-1/);
 assert.doesNotMatch(code,/wallet|mint|quants\/collect|localStorage|sessionStorage|fetch\(/i);
});

test('illustrative mineral photos do not claim unverified mine provenance',()=>{
 const chance=MINERAL_DESTINATIONS.find(x=>x.id==='last-chance-mine');
 assert.equal(chance.image.file,'Quartz-258682.jpg');
 assert.equal(imageAltForMineralDestination(chance),'Quartz specimen photograph; not verified as originating at Last Chance Mine');
});
