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

test('Card arrows update the main viewer without moving the Android page',()=>{
 // Replacing a tall live card changes layout; the arrow handler preserves the
 // viewport rather than snapping the visitor back to the deck.
 assert.match(deck,/function moveCardWithoutViewportJump\(direction\)\s*\{/);
 assert.match(deck,/const startY=window\.scrollY;/);
 assert.match(deck,/advance\(direction\);/);
 assert.match(deck,/const revision=selectionVersion;/);
 assert.match(deck,/if\(revision!==selectionVersion\|\|document\.hidden\|\|!host\.isConnected\)return;/);
 assert.match(deck,/if\(Math\.abs\(window\.scrollY-startY\)>6\)window\.scrollTo\(\{top:startY,left:window\.scrollX,behavior:'instant'\}\);/);
 assert.match(deck,/requestAnimationFrame\(\(\)=>requestAnimationFrame\(restore\)\);/);
 assert.match(deck,/next\.addEventListener\('click',\(\)=>moveCardWithoutViewportJump\(1\)\)/);
 assert.match(deck,/prev\.addEventListener\('click',\(\)=>moveCardWithoutViewportJump\(-1\)\)/);
 assert.match(deck,/moveCardWithoutViewportJump\(dx<0\?1:-1\);/);
 assert.doesNotMatch(deck,/settleCardViewport|settleTopGesture/);
 assert.doesNotMatch(deck,/host\.querySelector\('\.oracle-card-deck-nav'\)\?\.scrollIntoView/);
});

test('Scroll repair does not take ownership of wallet, sign-in, media, or card focus',()=>{
 assert.doesNotMatch(css,/scroll-snap-stop:\s*always/);
 assert.match(html,/id="oracleCardStage"/);
 assert.match(deck,/stage\.append\(entry\.node\)/);
 assert.match(deck,/scrollIntoView\?\.\(\{block:'start',behavior:/);
});

test('header stays a reachable first snap position and search does not interrupt the jump to cards',()=>{
 assert.match(css,/main\.app>\.qtop\{scroll-snap-align:start;scroll-snap-stop:normal;scroll-margin-top:0\}/);
 assert.doesNotMatch(css,/main\.app>\.search,\s*body\.oracle-quanta #oracleCardDeck/);
});
