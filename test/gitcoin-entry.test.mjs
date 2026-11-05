import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('GIT Coin entry page gives a real Termux command and explicit pending credit status',()=>{
 const html=read('gitcoin.html');
 assert.match(html,/<title>GIT Coin/);
 assert.match(html,/termux-ledger\.py/);
 assert.match(html,/receipts\.sqlite3/);
 assert.match(html,/not (?:spendable|cash)/i);
 assert.match(html,/personal.*GitHub.*repository/i);
 assert.match(html,/copySetup/);
 assert.doesNotMatch(html,/\bIBM accepts GIT\b/);
});