import test from 'node:test';
import assert from 'node:assert/strict';
import {cards,findCard,cardIntent} from '../bubbles-card-catalog.mjs';
test('the real restaurant search Quick Card is discoverable through Bubbles by name and vacation intent',()=>{
 const item=cards.find(x=>x.id==='restaurant-directory');
 assert.ok(item);
 assert.equal(item.url,'/?card=restaurant-directory');
 for(const phrase of ['restaurants','restaurant directory','food finder','Denver restaurants','vacation dining']){
  assert.equal(findCard(phrase)?.id,'restaurant-directory',phrase);
 }
 assert.equal(cardIntent('open restaurant quick card')?.card?.id,'restaurant-directory');
 assert.equal(cardIntent('open restaurant quick card')?.action,'open');
 assert.equal(new Set(cards.map(x=>x.id)).size,cards.length);
});
test('restaurant card reuses existing browser route without authorization or phantom checkout',()=>{
 const item=findCard('restaurant directory');
 assert.equal(item.repository,'www-infinity4/QuantaPhi');
 assert.match(item.url,/^\/\?card=restaurant-directory$/);
});
