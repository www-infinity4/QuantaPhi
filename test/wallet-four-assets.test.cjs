'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const ui=fs.readFileSync('bubbles-cloud-wallet.js','utf8');
const worker=fs.readFileSync('workers/unified-wallet/worker.js','utf8');
const app=fs.readFileSync('bubbles.html','utf8');
const asset=fs.readFileSync('workers/unified-wallet/work-asset-ledger.mjs','utf8');
test('all four owner-requested assets are always visibly distinguished in authenticated wallet',()=>{
 for(const name of ['GIT Coin','Bubble Bits','GPT Coin','Cash Wallet'])assert.ok(ui.includes(name),name);
 assert.match(ui,/workAssets/);
 assert.match(ui,/status.*not_connected/);
 assert.match(ui,/No verified balance/);
 assert.match(app,/bubblesWalletBalances/);
});
test('unsigned or unavailable receipts cannot mint GIT/GPT or imply real USD',()=>{
 assert.match(asset,/CREATE TABLE IF NOT EXISTS verified_work_asset_receipts/);
 assert.match(asset,/source_receipt_id TEXT NOT NULL/);
 assert.match(asset,/UNIQUE\(asset_code,source_receipt_id\)/);
 assert.match(asset,/CHECK\(asset_code IN \('GIT_COIN','GPT_COIN'\)\)/);
 assert.match(asset,/readVerifiedWorkAssets/);
 assert.doesNotMatch(ui,/Math\.random\(/);
 assert.doesNotMatch(ui,/localStorage\.setItem/);
});
test('unified wallet reads work assets only after StarQuest token authentication',()=>{
 assert.match(worker,/const account=await identity\(request,env\)/);
 assert.match(worker,/readVerifiedWorkAssets\(env,account\.id\)/);
 assert.match(worker,/workAssets/);
 assert.match(worker,/readBubbleBits\(env,account\.id\)/);
 assert.match(worker,/CASH_WALLET.*not_connected/);
});
