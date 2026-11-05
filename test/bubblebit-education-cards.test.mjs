import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('Bubble Bit education page explains work packets and independent accounting',()=>{
 const html=read('bubblebit-economy.html');
 assert.match(html,/<title>Bubble Bits/);
 assert.match(html,/73 files/);
 assert.match(html,/GIT/);
 assert.match(html,/GPT Coin/);
 assert.match(html,/Quant AI/);
 assert.match(html,/pending/i);
 assert.match(html,/customer.*permission/i);
 assert.doesNotMatch(html,/IBM accepts GIT|guaranteed income|spendable today/i);
});
test('carousel includes separate Bubbles Bit and optional GPT Coin cards',()=>{
 const html=read('index.html');
 const deck=read('oracle-card-deck.js');
 assert.match(html,/id="bubbleBitQuickCard"/);
 assert.match(html,/id="gptCoinConceptCard"/);
 assert.match(html,/data-bubblebit-copy/);
 assert.match(html,/bubblebit-economy\.html/);
 assert.match(html,/bubblebit-coin-cards\.mjs/);
 assert.match(html,/bubblebit-coin-cards\.css/);
 assert.match(deck,/\['bubbleBitQuickCard','Bubble Bits/);
 assert.match(deck,/\['gptCoinConceptCard','GPT Coin/);
 assert.match(deck,/bubbleBitQuickCard:\['bubble-bit-knowledge'/);
 assert.match(deck,/gptCoinConceptCard:\['gpt-coin-optional'/);
});
test('copyable educational packet is always hypothetical and has no private identifiers',async()=>{
 const {getExampleBitText}=await import('../bubblebit-coin-cards.mjs');
 const text=getExampleBitText();
 assert.match(text,/ILLUSTRATIVE/);
 assert.match(text,/73 files/);
 assert.match(text,/No verified owner wallet credit/);
 assert.doesNotMatch(text,/ghp_|sk-|customerId|authToken|walletId/);
 const script=read('bubblebit-coin-cards.mjs');
 assert.match(script,/navigator\.clipboard/);
 assert.doesNotMatch(script,/fetch\(|XMLHttpRequest|localStorage|wallet\.credit|mint\(/);
});
