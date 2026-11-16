import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const premium=readFileSync(new URL('../premium-source-cards.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../premium-source-cards.css',import.meta.url),'utf8');
const deck=readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
test('premium sources keep original publisher and avoid empty image pane when hotlinks fail',()=>{
 assert.match(premium,/Publisher photograph unavailable here/);
 assert.match(premium,/photoLink\.href=row\.url/);
 assert.match(premium,/image\.addEventListener\('load'/);
 assert.match(premium,/image\.addEventListener\('error'/);
 assert.match(premium,/image\.hidden=true/);
 assert.match(css,/premium-photo-fallback/);
 assert.match(css,/premium-photo\[hidden\]/);
 assert.doesNotMatch(premium,/image\.addEventListener\('error',\(\)=>\{image\.remove\(\)\}/);
});
test('Infinity Concepts mini cover uses real existing source artwork and has image error fallback',()=>{
 assert.match(deck,/infinityConcepts:\['Infinity Concepts',[^\n]*julius-balloon-001\.jpg/);
 assert.match(deck,/oracle-cover-no-art/);
 assert.match(deck,/image\.addEventListener\('error'/);
});
