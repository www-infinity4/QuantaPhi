import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const deck=readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
const app=readFileSync(new URL('../product-directory-card.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../product-directory-card.css',import.meta.url),'utf8');
const count=(hay,part)=>hay.split(part).length-1;
test('one mounted original catalog card in actual homepage and Oracle choices',()=>{
 assert.equal(count(html,'id="productDirectoryCard"'),1);
 assert.equal(count(deck,"['productDirectoryCard','Brand & Product Directory"),1);
 assert.match(deck,/productDirectoryCard:\['product-directory','Shopping'/);
 assert.match(html,/\/product-directory-card\.mjs\?v=/);
 assert.match(html,/\/product-directory-card\.css\?v=/);
});
test('original card remains hydrated before Oracle deck and no iframe clone',()=>{
 assert.ok(html.indexOf('id="productDirectoryCard"')<html.indexOf('/oracle-card-deck.js'));
 assert.ok(html.indexOf('/product-directory-card.mjs')<html.indexOf('/oracle-card-deck.js'));
 assert.doesNotMatch(app,/<iframe|innerHTML|cloneNode/);
});
test('source-only feed has no wallet, purchases or unverified offer presentation',()=>{
 assert.match(app,/credentials:'omit'/);
 assert.match(app,/readBrands\(payload,department\)/);
 assert.doesNotMatch(app,/localStorage|STAR_COIN|wallet\.spend|checkout|buyNow/);
 assert.match(app,/no placeholder inventory is shown/);
});
test('mobile card controls remain readable without sideways overflow',()=>{
 assert.match(css,/min-height:44px/);
 assert.match(css,/max-width:100%/);
 assert.match(css,/@media\(max-width:390px\)/);
});