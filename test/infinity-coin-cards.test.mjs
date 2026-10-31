import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {findCard} from '../bubbles-card-catalog.mjs';
import {lookupQuickCard,searchQuickCards} from '../quick-card-search-core.mjs';

const page=fs.readFileSync(new URL('../infinity-coin-cards.html',import.meta.url),'utf8');
const client=fs.readFileSync(new URL('../infinity-coin-cards.mjs',import.meta.url),'utf8');

test('both Infinity braided coins have distinct but consistent research cards',()=>{
 for(const id of ['cardone-notes','alien-coin']){
  assert.match(page,new RegExp('id="'+id+'"'));
  assert.match(page,new RegExp('data-coin="'+id+'"'));
 }
 assert.match(page,/INFINITY BRAID/);
 assert.match(page,/CARDONE/);
 assert.match(page,/ALIEN/);
 assert.match(page,/Not verified/);
 assert.match(page,/Not established/);
 assert.match(page,/has not approved or issued/);
 assert.doesNotMatch(page,/\b(?:guaranteed returns|fixed \$1 value|SEC approved)\b/i);
});

test('QuantaPhi/Bubbles and typed search resolve to the real internal coin cards',()=>{
 for(const [id,term,fragment] of [
  ['infinity-cardone-notes','cardone capital notes','#cardone-notes'],
  ['infinity-alien-coin','alien coin','#alien-coin']
 ]){
  const card=findCard(id),result=lookupQuickCard(id);
  assert.equal(card.id,id);
  assert.equal(card.repository,'www-infinity4/QuantaPhi');
  assert.ok(card.url.endsWith(fragment));
  assert.equal(result.id,id);
  assert.equal(result.internal,true);
  assert.ok(result.route.endsWith(fragment));
  assert.ok(searchQuickCards(term).some(c=>c.id===id));
 }
});

test('refresh never mints or reads wallet secrets and remains honest about model readiness',()=>{
 assert.match(client,/cache:'no-store'/);
 assert.match(client,/No tokens minted by this check/);
 assert.match(client,/model, account and wallet operations not yet verified/);
 assert.match(client,/mountCardActions/);
 assert.doesNotMatch(client,/localStorage|walletAddress|POST/);
 assert.equal(client.includes('/api/tokens'),false);
});
