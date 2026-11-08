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

test('unknown cash and work balances are not displayed as zero',()=>{
 assert.match(ui,/value===null\|\|value===undefined/);
 assert.match(ui,/disconnectedBalances\(\)/);
 assert.match(ui,/No verified balance/);
 assert.match(ui,/balances.hidden=false/);
 assert.match(ui,/infinity:wallet-state/);
 assert.match(app,/max-width:390px/);
});
test('work credit source cannot be created by public wallet routes',()=>{
 assert.doesNotMatch(worker,/WORK_ASSET_LEDGER_ENABLED='1'/); // the public Worker never toggles activation
 assert.doesNotMatch(worker,/url.pathname==='\/v1\/wallet\/credit-git'/);
 assert.doesNotMatch(worker,/url.pathname==='\/v1\/wallet\/credit-gpt'/);
 assert.doesNotMatch(worker,/\/internal\/work-asset-credit/);
});
test('D1 work assets are 1 unit per immutable source receipt and per-line GIT evidence',()=>{
 const sql=fs.readFileSync('workers/unified-wallet/work-asset-schema.sql','utf8');
 assert.match(sql,/CHECK\(amount=1\)/);
 assert.match(sql,/evidence_path/);
 assert.match(sql,/evidence_line>0/);
 assert.match(sql,/verified_work_asset_no_delete/);
 const {execFileSync}=require('node:child_process');
 const py=`import sqlite3,sys,json
d=sqlite3.connect(':memory:');d.executescript(sys.stdin.read())
for receipt,owner,asset,line in [('r1','owner_a','GIT_COIN',1),('r2','owner_a','GIT_COIN',2),('gpt1','owner_b','GPT_COIN',None)]:
 d.execute("INSERT INTO verified_work_asset_receipts (receipt_id,user_id,asset_code,source_receipt_id,source_system,repository,commit_sha,evidence_path,evidence_line,evidence_hash,amount,settlement_status,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,1,'credited',1)",(receipt,owner,asset,receipt,'verified_executor','www-infinity4/QuantaPhi' if asset=='GIT_COIN' else None,'a'*40 if asset=='GIT_COIN' else None,'src/index.js' if asset=='GIT_COIN' else None,line,'b'*64))
try:
 d.execute("INSERT INTO verified_work_asset_receipts (receipt_id,user_id,asset_code,source_receipt_id,source_system,repository,commit_sha,evidence_path,evidence_line,evidence_hash,amount,created_at) VALUES('dupe','owner_a','GIT_COIN','r1','verified_executor','www-infinity4/QuantaPhi',?,'src/index.js',1,?,1,1)",('a'*40,'b'*64))
 raise AssertionError('Duplicate source receipt accepted')
except sqlite3.IntegrityError:pass
try:
 d.execute("UPDATE verified_work_asset_receipts SET settlement_status='pending' WHERE receipt_id='r1'")
 raise AssertionError('Immutable payout row edited')
except sqlite3.IntegrityError:pass
try:
 d.execute("INSERT INTO verified_work_asset_receipts (receipt_id,user_id,asset_code,source_receipt_id,source_system,evidence_hash,amount,created_at) VALUES('fake','owner_a','GIT_COIN','fake','web','c',1,1)")
 raise AssertionError('Missing Git evidence accepted')
except sqlite3.IntegrityError:pass
print(json.dumps(d.execute("SELECT user_id,asset_code,SUM(amount) FROM verified_work_asset_receipts GROUP BY user_id,asset_code ORDER BY user_id").fetchall()))
`;
 const result=JSON.parse(execFileSync('python3',['-c',py],{input:sql,encoding:'utf8'}));
 assert.deepEqual(result,[['owner_a','GIT_COIN',2],['owner_b','GPT_COIN',1]]);
});
test('D1 state reader only uses a signed account ID and fails closed without an activated ledger',async()=>{
 const {readVerifiedWorkAssets}=await import('../workers/unified-wallet/work-asset-ledger.mjs');
 const unavailable=await readVerifiedWorkAssets({WORK_ASSET_LEDGER_ENABLED:'0'},'owner_a');
 assert.equal(unavailable.GIT_COIN.available,false);
 assert.equal(unavailable.GIT_COIN.credited,null);
 let bound,statement;
 const db={prepare(sql){statement=sql;return{bind(user){bound=user;return{async all(){return{results:[
  {asset_code:'GIT_COIN',credited:3,pending:4},
  {asset_code:'GPT_COIN',credited:1,pending:0}
 ]}}}}}}};
 const result=await readVerifiedWorkAssets({WORK_ASSET_LEDGER_ENABLED:'1',DB:db},'owner_b');
 assert.equal(bound,'owner_b');
 assert.match(statement,/WHERE user_id=\?1/);
 assert.equal(result.GIT_COIN.credited,3);
 assert.equal(result.GIT_COIN.pending,4);
 assert.equal(result.GPT_COIN.credited,1);
 assert.equal((await readVerifiedWorkAssets({WORK_ASSET_LEDGER_ENABLED:'1',DB:{prepare(){throw Error('not migrated')}}},'owner_a')).GPT_COIN.available,false);
});
