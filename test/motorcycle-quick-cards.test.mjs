import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MOTORCYCLE_SOURCES,findMotorcycleSource,motorcycleModel} from '../motorcycle-quick-cards.mjs';
import {QUICK_CARD_SOURCES,PUBLIC_SOURCE_IDS,findSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS,feedCard} from '../quanta-feed.mjs';

const source=readFileSync(new URL('../source-quick-cards.mjs',import.meta.url),'utf8');
const tools=readFileSync(new URL('../quanta-card-experience.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../quanta-card-experience.css',import.meta.url),'utf8');
const specs={
 'harley-davidson':'www.harley-davidson.com',
 'indian-motorcycle':'www.indianmotorcycle.com'
};

test('each motorcycle has its own public original-source card in the existing swipe deck',()=>{
 assert.deepEqual(MOTORCYCLE_SOURCES.map(card=>card.id),['harley-davidson','indian-motorcycle']);
 assert.equal(new Set(MOTORCYCLE_SOURCES.map(card=>card.id)).size,2);
 for(const card of MOTORCYCLE_SOURCES){
  assert.equal(card.kind,'Motorcycles');
  assert.equal(findSourceCard(card.id)?.id,card.id);
  assert.ok(QUICK_CARD_SOURCES.some(source=>source.id===card.id));
  assert.ok(PUBLIC_SOURCE_IDS.includes(card.id));
  assert.equal(feedCard(card.id)?.origin,'source');
  assert.ok(ALL_FEED_CARDS.some(c=>c.id===card.id));
  assert.match(card.focus,/motorcycle/i);
 }
 assert.match(source,/MOTORCYCLE_SOURCES/);
 assert.match(source,/mountCardTools\(tools,card\)/);
});

test('each motorcycle uses its actual maker 2026 image and official model destinations',()=>{
 for(const card of MOTORCYCLE_SOURCES){
  assert.equal(new URL(card.official).hostname,specs[card.id]);
  assert.equal(new URL(card.featureUrl).hostname,specs[card.id]);
  assert.ok(card.image,'must include real motorcycle photo');
  assert.ok(['www.harley-davidson.com','cdn1.polaris.com'].includes(new URL(card.image).hostname));
  assert.equal(card.images[0],card.image);
  assert.ok(card.models.length>=3,'three or more model choices');
  assert.equal(new Set(card.models.map(model=>model.id)).size,card.models.length);
  for(const model of card.models){
   assert.equal(new URL(model.url).hostname,specs[card.id]);
   assert.equal(motorcycleModel(card,model.id),model);
  }
  assert.equal(motorcycleModel(card,'__proto__'),null);
  assert.ok(!JSON.stringify(card).includes('dealerStock'));
  assert.ok(!JSON.stringify(card).includes('offerPrice'));
 }
 assert.equal(findMotorcycleSource('invalid'),null);
});

test('an actual in-card selector leads to official model pages without claim of checkout or login',()=>{
 assert.match(tools,/mountMotorcycleQuickCard\(root,card\)/);
 assert.match(css,/\.qcx-motorcycle-select/);
 const module=readFileSync(new URL('../motorcycle-quick-cards.mjs',import.meta.url),'utf8');
 assert.match(module,/createElement\('select'\)/);
 assert.match(module,/aria-label/);
 assert.match(module,/selectedModel\.href/);
 assert.match(module,/noopener noreferrer/);
 assert.doesNotMatch(module,/localStorage|cookies|wallet|checkout|price:|fetch\(/i);
});
