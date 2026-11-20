import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const css=readFileSync(new URL('../home-mobile-cards-first.css',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('mobile Infinity carousel is not hidden behind a sticky primary search',()=>{
 assert.match(html,/body\.classList\.add\('oracle-card-deck-active'\)/);
 assert.match(css,/@media\(max-width:650px\)\{\s*body\.oracle-quanta\.oracle-card-deck-active \.search\{/);
 assert.match(css,/position:static!important;top:auto!important;z-index:auto!important/);
 assert.match(css,/scroll-margin-top:12px/);
 assert.match(css,/body\.oracle-quanta \.search #q\{min-height:48px!important/);
});
