import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('homepage carousel includes real GIT code setup card',()=>{
 const html=read('index.html');
 const deck=read('oracle-card-deck.js');
 assert.match(html,/<article id="gitcoinQuickCard"/);
 assert.match(html,/data-gitcoin-repo/);
 assert.match(html,/data-gitcoin-copy="termux"/);
 assert.match(html,/data-gitcoin-copy="ai"/);
 assert.match(html,/gitcoin-quick-card\.mjs/);
 assert.match(html,/gitcoin-quick-card\.css/);
 assert.match(deck,/\['gitcoinQuickCard','GIT Coin/);
 assert.match(deck,/gitcoinQuickCard:\['gitcoin-code/);
 assert.match(deck,/gitcoin:'gitcoinQuickCard'/);
 assert.match(read('gitcoin-quick-card.css'),/#gitcoinQuickCard/);
 assert.match(read('gitcoin-quick-card.css'),/oracle-card-deck-active:not/);
});
