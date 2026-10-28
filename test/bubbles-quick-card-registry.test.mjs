import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveQuickCard,registeredDetailCardCount} from '../bubbles-quick-card-registry.mjs';

test('registered QuantaPhi source cards reuse actual first-party detail viewer',()=>{
 const card=resolveQuickCard('youtube');
 assert.equal(card?.url,'/source-quick-card.html?card=youtube');
 assert.equal(card?.surface,'#sourceQuickCardDetail');
 assert.equal(card?.repository,'www-infinity4/QuantaPhi');
});
test('science and discovery cards have separate registered first-party routes',()=>{
 assert.equal(resolveQuickCard('muse-ai')?.url,'/science-quick-card.html?card=muse-ai');
 assert.equal(resolveQuickCard('radio-zenith-transoceanic')?.url,
  '/quanta-feed-card.html?card=radio-zenith-transoceanic');
 assert.ok(registeredDetailCardCount>=3);
});
test('nonexistent or crafted card ids cannot select arbitrary URLs',()=>{
 for(const id of ['no-such-card','../wallet','//example.com','a?post=1','','a'.repeat(91),null]){
  assert.equal(resolveQuickCard(id),null);
 }
});
