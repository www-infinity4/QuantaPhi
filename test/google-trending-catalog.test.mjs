import test from 'node:test';import assert from 'node:assert/strict';
import {findCard,cardIntent} from '../bubbles-card-catalog.mjs';
const cases=[
 ['Google Trends','trending-now'],
 ['trending nba games','trending-nba'],
 ['world series','trending-mlb'],
 ['avengers doomsday','trending-media']
];
test('Bubbles recognizes all new trend cards',()=>{
 for(const [alias,id] of cases){
  const card=findCard(alias);
  assert.equal(card?.id,id,alias);
  assert.equal(card?.repository,'www-infinity4/QuantaPhi');
  const intent=cardIntent('open '+alias);
  assert.equal(intent?.card?.id,id,alias);
  assert.equal(intent?.action,'open',alias);
 }
});
