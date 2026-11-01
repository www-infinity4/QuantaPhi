import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('index.html');
const css=read('home-mobile-cards-first.css');
const deck=read('oracle-card-deck.js');

test('Android home softly settles at section boundaries without scroll trapping',()=>{
 assert.match(html,/id="oracleCardDeck"/);
 assert.match(css,/html:has\(body\.oracle-quanta\)/);
 assert.match(css,/scroll-snap-type:\s*y proximity/);
 assert.match(css,/scroll-snap-align:\s*start/);
 assert.match(css,/\.oracle-shelf-open main\.app> :is\(section\.card,/);
 assert.match(css,/#phiChannelCards/);
 assert.match(css,/#infiniteBook/);
 assert.match(css,/\.oracle-card-deck-nav\{\s*scroll-snap-align:start/);
 assert.doesNotMatch(css,/scroll-snap-type:\s*y mandatory/);
});

test('Card arrows move to the beginning only after a real card change',()=>{
 assert.match(deck,/function settleCardViewport\(/);
 assert.match(deck,/function moveAndSettle\(direction\)/);
 assert.match(deck,/if\(active&&active!==before\)settleCardViewport\(\)/);
 assert.match(deck,/next\.addEventListener\('click',\(\)=>moveAndSettle\(1\)\)/);
 assert.match(deck,/prev\.addEventListener\('click',\(\)=>moveAndSettle\(-1\)\)/);
 assert.match(deck,/if\(active\?\.id!==cardId\|\|expanded\)return/);
 assert.match(deck,/prefers-reduced-motion: reduce/);
 assert.ok(deck.includes("(max-width: 650px) and (pointer: coarse)"));
 assert.ok(deck.includes("host.querySelector('.oracle-card-deck-nav')?.scrollIntoView"));
});

test('Scroll repair does not take ownership of wallet, sign-in, media, or card focus',()=>{
 assert.doesNotMatch(css,/scroll-snap-stop:\s*always/);
 assert.match(html,/id="oracleCardStage"/);
 assert.match(deck,/stage\.append\(entry\.node\)/);
 assert.match(deck,/scrollIntoView\?\.\(\{block:'start',behavior:/);
});
