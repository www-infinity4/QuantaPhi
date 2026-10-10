import {test} from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {rewardSchema,creditStatements} from '../workers/unified-wallet/bot-work-credit.mjs';
import {earnedWork} from '../workers/infinity-brain-clock/bot-work-policy.mjs';
import walletWorker from '../workers/unified-wallet/worker.js';
test('public callers cannot invoke internal bot credits',async()=>{
 const r=await walletWorker.fetch(new Request('https://wallet/internal/bot-work-credit',{method:'POST',body:'{}'}),{BOT_WORK_SECRET:'fixture-secret'});
 assert.equal(r.status,401);assert.equal((await r.json()).error,'bot_work_authorization_required');
});
test('repeating one work receipt credits exactly once in the real SQLite ledger model',()=>{
 for(const asset of ['STARCOIN','QUANT']){
 const plan=creditStatements({id:'work1',userId:'owner',asset,metadata:'{}',now:1,walletId:'wallet1'});
 const python=`import sqlite3,json,sys
p=json.loads(sys.stdin.read());db=sqlite3.connect(':memory:')
db.executescript('CREATE TABLE accounts(id TEXT PRIMARY KEY,star_coins INTEGER,updated_at INTEGER,pending_share_credits INTEGER);INSERT INTO accounts VALUES("owner",10,0,0);CREATE TABLE ledger_events(id TEXT PRIMARY KEY,account_id TEXT,event_type TEXT,amount INTEGER,balance INTEGER,progress_to_next_coin INTEGER,reference_id TEXT,content_id TEXT,payout_status TEXT,created_at INTEGER);CREATE TABLE quant_wallets(wallet_id TEXT PRIMARY KEY,user_id TEXT UNIQUE,status TEXT DEFAULT "active");CREATE TABLE quant_ledger_entries(entry_id TEXT PRIMARY KEY,reference_id TEXT,entry_type TEXT,wallet_id TEXT,delta INTEGER);CREATE VIEW quant_wallet_balances AS SELECT wallet_id,COALESCE((SELECT SUM(delta) FROM quant_ledger_entries l WHERE l.wallet_id=w.wallet_id),0) balance FROM quant_wallets w;CREATE TABLE unified_token_records(token_id TEXT PRIMARY KEY,user_id TEXT,token_type TEXT,source TEXT,data_json TEXT,provenance_hash TEXT UNIQUE,created_at INTEGER);CREATE TABLE unified_wallet_events(event_id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE,user_id TEXT,asset_code TEXT,event_type TEXT,amount INTEGER,balance_after INTEGER,reference_id TEXT,metadata_json TEXT,created_at INTEGER);')
db.execute(p['schema'])
for _ in range(3):
 with db:
  for s in p['plan']:db.execute(s['sql'],s['params'])
print(json.dumps(dict(stars=db.execute('SELECT star_coins FROM accounts').fetchone()[0],quants=db.execute('SELECT COALESCE(SUM(delta),0) FROM quant_ledger_entries').fetchone()[0],rewards=db.execute('SELECT COUNT(*) FROM bot_work_rewards').fetchone()[0])))`;
 const r=JSON.parse(execFileSync('python3',['-c',python],{input:JSON.stringify({schema:rewardSchema,plan}),encoding:'utf8'}));assert.equal(r.rewards,1);assert.equal(r.stars,asset==='STARCOIN'?11:10);assert.equal(r.quants,asset==='QUANT'?1:0);
 }
});
test('blocked work cannot earn; one added full index earns one StarCoin',()=>{
 const sha='a'.repeat(40),q={id:'job-quant:test',repository:'www-infinity4/QuantaPhi',attempts:[{status:'committed_unverified',testsPassed:true,commitSha:sha}]};
 assert.equal(earnedWork(q,{sha,files:[{filename:'app.js',status:'modified',additions:3}]}).asset,'QUANT');
 assert.equal(earnedWork(q,{sha,files:[{filename:'new/index.html',status:'added',additions:50,patch:'+<html><title>New page</title><body>Real content</body></html>'}]}).asset,'STARCOIN');
 assert.equal(earnedWork(q,{sha,files:[{filename:'new/index.html',status:'added',additions:50,patch:'+placeholder'}]}).asset,'QUANT');
 assert.equal(earnedWork({...q,attempts:[{status:'blocked',testsPassed:false}]},{sha,files:[{}]}),null);
});
