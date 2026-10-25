import test from 'node:test';
import assert from 'node:assert/strict';
import {PROVIDERS,providerSearchUrl} from '../bubbles-provider-card.mjs';
import {cardIntent} from '../bubbles-card-catalog.mjs';
test('seven public service cards support the same floating chat workspace',()=>{
 for(const id of ['google','facebook','instagram','tiktok','x','guess','pepe-jeans'])assert.ok(PROVIDERS[id]);
 for(const title of ['Google','Facebook','Instagram','TikTok','X','GUESS','Pepe Jeans'])assert.equal(cardIntent('Bubbles pull up '+title+' in the chat')?.action,'open',title);
});
test('provider search encodes official-domain scope rather than guessed products',()=>{
 const url=providerSearchUrl('guess',"men's size 33 dark blue jeans");
 assert.equal(new URLSearchParams(url.split('?')[1]).get('q'),"site:guess.com men's size 33 dark blue jeans");
 assert.equal(providerSearchUrl('unknown','x'),null);
 assert.equal(providerSearchUrl('google','what is matter?').includes('what+is+matter%3F'),true);
});