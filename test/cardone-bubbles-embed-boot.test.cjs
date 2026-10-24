'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ai=fs.readFileSync('bubbles-ai.js','utf8');
const bubblePage=fs.readFileSync('bubbles.html','utf8');
const embed=fs.readFileSync('bubbles-embed.js','utf8');
const cardone=fs.readFileSync('cardone-capital.html','utf8');

test('embedded Bubbles uses its message container as scroll owner and never inserts that container into itself',()=>{
 assert.match(ai,/const chatScroll=!embedded\?create\('div','ba-thread'\):conversation/);
 assert.match(ai,/if\(chatScroll!==conversation\)chatScroll\.insertBefore\(chatsPanel,conversation\)/);
 assert.doesNotMatch(ai,/^chatScroll\.insertBefore\(chatsPanel,conversation\);/m);
 assert.match(ai,/launcher\.addEventListener\('click'/);
 assert.match(ai,/window\.parent\.postMessage\(\{type:'quantaphi:bubbles:size'/);
});

test('Cardone loads its own specialist bubble, uses the canonical embed and fresh chat runtime',()=>{
 assert.match(cardone,/src="\/bubbles-embed\.js"/);
 assert.match(cardone,/data-bubble-id="cardone-westshore-research"/);
 assert.match(cardone,/data-bubble-role="specialist"/);
 assert.match(embed,/iframe\.src=ORIGIN\+'\/bubbles\.html\?'/);
 assert.match(embed,/quantaphi:bubbles:size/);
 assert.match(bubblePage,/bubbles-ai\.js\?v=20261023-fresh-chat1/);
});
