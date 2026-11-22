import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('standalone color window demonstration clearly labels synthetic, not authenticated wallet data',()=>{
 const html=read('wallet-color-passage-lab.html');
 assert.match(html,/Color Passage Window/i);
 assert.match(html,/Synthetic test data only/i);
 assert.match(html,/No wallet access granted/i);
 assert.match(html,/id="passageWindow"/);
 assert.match(html,/id="passageStatus"/);
 assert.match(html,/wallet-color-passage-lab\.mjs/);
 assert.match(html,/min-height:\s*44px/);
});
test('color window demonstration imports the verified pure helpers, uses no phone files or network',()=>{
 const js=read('wallet-color-passage-lab.mjs');
 assert.match(js,/colorPassageStatus/);
 assert.match(js,/buildWalletColorWindow/);
 assert.match(js,/issueNumericDeviceId/);
 assert.match(js,/crypto/);
 assert.match(js,/aria/);
 assert.doesNotMatch(js,/fetch\(|navigator\.contacts|navigator\.mediaDevices|localStorage|indexedDB|starquest|sendMessage\(/i);
});
