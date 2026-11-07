import test from 'node:test';
import assert from 'node:assert/strict';
import {cards,findCard,cardIntent} from '../bubbles-card-catalog.mjs';
test('retired Cardone cards no longer resolve in Bubbles catalog',()=>{
 for(const q of ['Cardone Capital','Gary Cardone','Church of I AM','10x westshore']){
  assert.equal(findCard(q),null,q);
  assert.ok(!cardIntent('open '+q+' card')?.card?.id?.includes('cardone'),q);
 }
 for(const id of ['cardone-capital','church-of-i-am'])assert.ok(!cards.some(c=>c.id===id),id);
 assert.ok(findCard('Pixie Stories'));
});
