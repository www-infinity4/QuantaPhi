import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('GIT Coin entry page gives Termux and AI copy actions with a user-owned GitHub repo field',()=>{
 const html=read('gitcoin.html');
 assert.match(html,/data-gitcoin-root/);
 assert.match(html,/data-gitcoin-repo/);
 assert.match(html,/data-gitcoin-copy="termux"/);
 assert.match(html,/data-gitcoin-copy="ai"/);
 assert.match(html,/gitcoin-quick-card\.mjs/);
 assert.match(html,/optional provider-issued/);
 assert.doesNotMatch(html,/GPT Coin.*automatically.*minted/i);
});
test('copy helper uses clipboard only with no wallet or remote writes',()=>{
 const code=read('gitcoin-quick-card.mjs');
 assert.match(code,/makeTermuxSetup/);
 assert.match(code,/makeAiInstructions/);
 assert.match(code,/clipboard\.writeText/);
 assert.doesNotMatch(code,/fetch\(|XMLHttpRequest|wallet\.|mint\(|postMessage/);
});
