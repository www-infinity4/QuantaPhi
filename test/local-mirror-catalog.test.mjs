import test from 'node:test';
import assert from 'node:assert/strict';
import {cards,findCard,cardIntent} from '../bubbles-card-catalog.mjs';
test('Local Mirror is registered once as a real same-origin page in Bubbles Quick Cards',()=>{
 const card=findCard('local mirror');
 assert.ok(card);
 assert.equal(card.url,'/local-mirror.html');
 assert.equal(card.repository,'www-infinity4/QuantaPhi');
 assert.equal(cards.filter(x=>x.id===card.id).length,1);
 assert.equal(findCard('shadow web radar').id,card.id);
 assert.equal(cardIntent('open local mirror').card.id,card.id);
});
