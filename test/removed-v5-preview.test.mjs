import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('remove V5 preview and unrelated homepage link without removing actual Oracle or radio',()=>{
 const home=read('index.html');
 assert.ok(!existsSync(new URL('../homepage-v5.html',import.meta.url)));
 assert.doesNotMatch(home,/homepage-v5\.html|qp-v5-trial-link/);
 for(const item of ['id="oracleCardDeck"','oracle-card-deck.js','infinity','id="oracleCardNext"'])assert.ok(home.includes(item),item);
});
