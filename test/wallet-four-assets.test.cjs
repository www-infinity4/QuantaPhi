'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {execFileSync}=require('node:child_process');
const ui=fs.readFileSync('bubbles-cloud-wallet.js','utf8');
const worker=fs.readFileSync('workers/unified-wallet/worker.js','utf8');
const app=fs.readFileSync('bubbles.html','utf8');
const asset=fs.readFileSync('workers/unified-wallet/work-asset-ledger.mjs','utf8');
const schema=fs.readFileSync('workers/unified-wallet/work-asset-schema.sql','utf8');
test('wallet always shows four distinct assets with verified receipts or explicitly unavailable balances',()=>{
 for(const name of ['GIT Coin','Bubble Bits','GPT Coin','Cash Wallet'])assert.ok(ui.includes(name),name);
 assert.match(ui,/workAssets/);
 assert.match(ui,/No verified balance/);
 assert.match(ui,/disconnectedBalances\(\)/);
 assert.match(ui,/balances.hidden=false/);
 assert.match(ui,/value===null\|\|value===undefined/);
 assert.match(ui,/infinity:wallet-state/);
 assert.match(app,/bubblesWalletBalances/);
 assert.match(app,/max-width:390px/);
 assert.doesNotMatch(ui,/Math\.random\(/);
 assert.doesNotMatch(ui,/localStorage\.setItem/);
});
test('wallet state is scoped to real signed StarQuest identity, not page-supplied owner/wallet ID',()=>{
 assert.match(worker,/const account=await identity\(request,env\)/);
 assert.match(worker,/readVerifiedWorkAssets\(env,account\.id\)/);
 assert.match(worker,/readBubbleBits\(env,account\.id\)/);
 assert.match(worker,/workAssets,cashWallet/);
 assert.match(worker,/CASH_WALLET.*not_connected/);
 assert.doesNotMatch(worker,/\/internal\/work-asset-credit/);
});
test('GIT Coin reads existing canonical Gitcoin D1 only when verified executor binding matches signed owner',async()=>{
 const {readVerifiedWorkAssets}=await import('../workers/unified-wallet/work-asset-ledger.mjs');
 const off=await readVerifiedWorkAssets({},'owner_a');
 assert.equal(off.GIT_COIN.available,false);
 assert.equal(off.GPT_COIN.available,false);
 assert.equal(off.GIT_COIN.credited,null);
 let bound=[],statements=[];
 const gitDb={prepare(sql){statements.push(sql);return{bind(value){bound.push(value);return{async first(){
  if(sql.includes('gitcoin_bubbles_executor'))return value==='owner_a'?{wallet_id:'verified-wallet'}:null;
  if(sql.includes('gitcoin_awards'))return{n:4};
  if(sql.includes('gitcoin_line_claims'))return{n:2};
  throw Error('invalid_query');
 }}}}}};
 const yes=await readVerifiedWorkAssets({GITCOIN_DB:gitDb,GITCOIN_OWNER_BINDING_ENABLED:'1'},'owner_a');
 assert.equal(yes.GIT_COIN.credited,4);
 assert.equal(yes.GIT_COIN.pending,2);
 assert.equal(yes.GIT_COIN.source,'canonical_gitcoin_d1');
 assert.equal(bound[0],'owner_a');
 assert.match(statements[0],/owner_subject=\?1 AND active=1 AND owner_verified=1/);
 assert.match(statements[1],/gitcoin_awards/);
 assert.equal((await readVerifiedWorkAssets({GITCOIN_DB:gitDb,GITCOIN_OWNER_BINDING_ENABLED:'1'},'another')).GIT_COIN.available,false);
 assert.match(asset,/quantaphi-gitcoin-ledger/);
 assert.doesNotMatch(schema,/CREATE TABLE IF NOT EXISTS gitcoin_awards/);
 assert.doesNotMatch(schema,/CREATE TABLE IF NOT EXISTS verified_work_asset_receipts/);
});
test('GPT Coin requires a separate enabled D1 ledger and never infers ChatGPT replies as earnings',async()=>{
 const {readVerifiedWorkAssets}=await import('../workers/unified-wallet/work-asset-ledger.mjs');
 let seen;
 const db={prepare(sql){return{bind(userId){seen={sql,userId};return{async first(){return{credited:3,pending:1}}}}}}};
 const ok=await readVerifiedWorkAssets({DB:db,GPT_COIN_LEDGER_ENABLED:'1'},'signed_account');
 assert.equal(ok.GPT_COIN.credited,3);assert.equal(ok.GPT_COIN.pending,1);
 assert.equal(seen.userId,'signed_account');assert.match(seen.sql,/WHERE user_id=\?1/);
 assert.equal((await readVerifiedWorkAssets({GPT_COIN_LEDGER_ENABLED:'1',DB:{prepare(){throw Error('not_migrated')}}},'signed_account')).GPT_COIN.available,false);
 assert.doesNotMatch(worker,/\/v1\/gpt\/mint/);
 assert.match(schema,/CREATE TABLE IF NOT EXISTS verified_gpt_coin_receipts/);
});
test('SQLite one GPT Coin per unique signed invocation is immutable, deduplicated and user-scoped',()=>{
 const py=`import sqlite3,sys,json
d=sqlite3.connect(':memory:');d.executescript(sys.stdin.read())
for receipt,owner,status in [('gpt1','owner_a','credited'),('gpt2','owner_a','pending'),('gpt3','owner_b','credited')]:
 d.execute("INSERT INTO verified_gpt_coin_receipts(receipt_id,user_id,source_receipt_id,source_system,model_reference,evidence_hash,amount,settlement_status,created_at) VALUES(?,?,?,?,?, ?,1,?,1)",(receipt,owner,receipt,'verified_model_runner','gpt','a'*64,status))
try:
 d.execute("INSERT INTO verified_gpt_coin_receipts(receipt_id,user_id,source_receipt_id,source_system,model_reference,evidence_hash,settlement_status,created_at) VALUES('gptDup','owner_b','gpt1','verified_model_runner','gpt','x','credited',1)")
 raise AssertionError('Duplicate invocation accepted')
except sqlite3.IntegrityError:pass
try:
 d.execute("UPDATE verified_gpt_coin_receipts SET settlement_status='credited' WHERE receipt_id='gpt2'")
 raise AssertionError('Immutable credit rewritten')
except sqlite3.IntegrityError:pass
try:
 d.execute("INSERT INTO verified_gpt_coin_receipts(receipt_id,user_id,source_receipt_id,source_system,model_reference,evidence_hash,amount,created_at) VALUES('gptMore','owner_a','gptMore','verified_model_runner','gpt','x',2,1)")
 raise AssertionError('Two coins from one invocation accepted')
except sqlite3.IntegrityError:pass
print(json.dumps(d.execute("SELECT user_id,settlement_status,SUM(amount) FROM verified_gpt_coin_receipts GROUP BY user_id,settlement_status ORDER BY user_id,settlement_status").fetchall()))
`;
 const rows=JSON.parse(execFileSync('python3',['-c',py],{input:schema,encoding:'utf8'}));
 assert.deepEqual(rows,[['owner_a','credited',1],['owner_a','pending',1],['owner_b','credited',1]]);
});
