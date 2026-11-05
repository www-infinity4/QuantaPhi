import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const page=readFileSync('bubbles.html','utf8');
const src=readFileSync('bubbles-star-coin-audit.js','utf8');
const original=readFileSync('star-coin-cloud.js','utf8');
test('Bubbles wallet exposes original reward audit without creating another balance',()=>{
 assert.match(page,/bubbles-star-coin-audit\.js/);
 assert.match(src,/Original card StarCoin rewards/);
 assert.match(src,/StarCoin click or replay intent|Media Star click or replay intent/);
 assert.doesNotMatch(src,/mintToken|INSERT INTO|localStorage\.setItem/);
});
test('original reward reconciliation calls existing authenticated server route only',()=>{
 assert.match(src,/quanta-phi-ledger\.marvaseater\.workers\.dev\/v1\/quants\/star-coins/);
 assert.match(src,/authenticatedFetch/);
 assert.match(src,/reconcile/);
 assert.match(original,/async function reconcile\(\)/);
 assert.match(original,/alreadyPaid/);
});
test('audit distinguishes existing earned records from confirmed spendable wallet',()=>{
 assert.match(src,/not necessarily current spendable balance/);
 assert.match(src,/no unpaid amount has been established/);
 assert.match(src,/Reconciliation checked/);
});
