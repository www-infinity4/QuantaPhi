import test from 'node:test';
import assert from 'node:assert/strict';
import {cards,findCard,cardIntent} from '../bubbles-card-catalog.mjs';

test('Cardone property is a registered same-origin Bubbles card',()=>{
 const item=findCard('Cardone Capital');
 assert.ok(item);
 assert.equal(item.id,'cardone-capital');
 assert.equal(item.url,'/cardone-capital.html');
 assert.equal(item.repository,'www-infinity4/QuantaPhi');
 assert.equal(cards.filter(x=>x.id==='cardone-capital').length,1);
});

test('Bubbles can bring Cardone offer into chat without guessing a new page',()=>{
 for(const phrase of ['open Cardone Capital card','bring Cardone Capital into chat','show 10x westshore']){
  const intent=cardIntent(phrase);
  assert.equal(intent?.action,'open',phrase);
  assert.equal(intent?.card?.id,'cardone-capital',phrase);
 }
});
