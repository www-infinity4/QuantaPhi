import {test} from 'node:test';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {rewardSchema,creditStatements,siteRewardSchema,siteCreditStatements} from '../workers/unified-wallet/bot-work-credit.mjs';
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
db.executescript('CREATE TABLE accounts(id TEXT PRIMARY KEY,star_coins INTEGER,updated_at INTEGER,pending_share_credits INTEGER);INSERT INTO accounts VALUES("owner",10,0,0);CREATE TABLE ledger_events(id TEXT PRIMARY KEY,account_id TEXT,event_type TEXT,amount INTEGER,balance INTEGER,progress_to_next_coin INTEGER,reference_id TEXT,content_id TEXT,payout_status TEXT,created_at INTEGER);CREATE TABLE quant_wallets(wallet_id TEXT PRIMARY KEY,user_id TEXT UNIQUE,status TEXT DEFAULT "active");CREATE TABLE quant_mints(mint_id TEXT PRIMARY KEY,wallet_id TEXT,provenance_hash TEXT UNIQUE,source_key TEXT UNIQUE,query_text TEXT NOT NULL,amount INTEGER NOT NULL);CREATE TABLE quant_ledger_entries(entry_id TEXT PRIMARY KEY,reference_id TEXT,entry_type TEXT,wallet_id TEXT,delta INTEGER);CREATE VIEW quant_wallet_balances AS SELECT wallet_id,COALESCE((SELECT SUM(delta) FROM quant_ledger_entries l WHERE l.wallet_id=w.wallet_id),0) balance FROM quant_wallets w;CREATE TABLE unified_token_records(token_id TEXT PRIMARY KEY,user_id TEXT,token_type TEXT,source TEXT,data_json TEXT,provenance_hash TEXT UNIQUE,created_at INTEGER);CREATE TABLE unified_wallet_events(event_id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE,user_id TEXT,asset_code TEXT,event_type TEXT,amount INTEGER,balance_after INTEGER,reference_id TEXT,metadata_json TEXT,created_at INTEGER);')
db.execute(p['schema'])
for _ in range(3):
 with db:
  for s in p['plan']:db.execute(s['sql'],s['params'])
print(json.dumps(dict(stars=db.execute('SELECT star_coins FROM accounts').fetchone()[0],quants=db.execute('SELECT COALESCE(SUM(delta),0) FROM quant_ledger_entries').fetchone()[0],rewards=db.execute('SELECT COUNT(*) FROM bot_work_rewards').fetchone()[0])))`;
 const r=JSON.parse(execFileSync('python3',['-c',python],{input:JSON.stringify({schema:rewardSchema,plan}),encoding:'utf8'}));assert.equal(r.rewards,1);assert.equal(r.stars,asset==='STARCOIN'?11:10);assert.equal(r.quants,asset==='QUANT'?1:0);
 }
});
test('blocked work cannot earn; an ordinary code repair earns a StarCoin while a site build awaits verified deployment',()=>{
 const sha='a'.repeat(40),q={id:'job-quant:test',repository:'www-infinity4/QuantaPhi',attempts:[{status:'committed_unverified',testsPassed:true,commitSha:sha}]};
 assert.equal(earnedWork(q,{sha,files:[{filename:'app.js',status:'modified',additions:3}]}).asset,'STARCOIN');
 assert.equal(earnedWork(q,{sha,files:[{filename:'new/index.html',status:'added',additions:50,patch:'+<html><title>New page</title><body>Real content</body></html>'}]}),null);
 assert.equal(earnedWork(q,{sha,files:[{filename:'new/index.html',status:'added',additions:50,patch:'+placeholder'}]}).asset,'STARCOIN');
 assert.equal(earnedWork({...q,attempts:[{status:'blocked',testsPassed:false}]},{sha,files:[{}]}),null);
});

test('real D1 mint provenance trigger pays only one Quant for a verified work receipt',()=>{
 const plan=creditStatements({id:'botwork_trigger_receipt',userId:'owner',asset:'QUANT',metadata:'{"quantId":"job-quant:verified","repository":"www-infinity4/QuantaPhi"}',now:123,walletId:'fallback-wallet'});
 const python=`import sqlite3,json,sys
p=json.loads(sys.stdin.read())
db=sqlite3.connect(':memory:')
db.executescript(p['quantSchema'])
db.executescript("""CREATE VIEW quant_wallet_balances AS SELECT wallet_id,COALESCE((SELECT SUM(delta) FROM quant_ledger_entries l WHERE l.wallet_id=w.wallet_id),0) balance FROM quant_wallets w;
CREATE TABLE unified_token_records(token_id TEXT PRIMARY KEY,user_id TEXT,token_type TEXT,source TEXT,data_json TEXT,provenance_hash TEXT UNIQUE,created_at INTEGER);
CREATE TABLE unified_wallet_events(event_id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE,user_id TEXT,asset_code TEXT,event_type TEXT,amount INTEGER,balance_after INTEGER,reference_id TEXT,metadata_json TEXT,created_at INTEGER);""")
db.execute(p['rewardSchema'])
db.execute('INSERT INTO quant_wallets(wallet_id,user_id) VALUES(?,?)',('existing-wallet','owner'))
for _ in range(3):
 with db:
  for statement in p['plan']:db.execute(statement['sql'],statement['params'])
mints=db.execute('SELECT mint_id,wallet_id FROM quant_mints').fetchall()
ledger=db.execute("SELECT reference_id,wallet_id,delta FROM quant_ledger_entries WHERE entry_type='mint'").fetchall()
print(json.dumps(dict(mints=len(mints),ledgers=len(ledger),rewards=db.execute('SELECT COUNT(*) FROM bot_work_rewards WHERE paid=1').fetchone()[0],wallet=ledger[0][1],linked=ledger[0][0]==mints[0][0] and ledger[0][1]==mints[0][1],balance=db.execute("SELECT balance FROM quant_wallet_balances WHERE wallet_id='existing-wallet'").fetchone()[0])))
`;
 const result=JSON.parse(execFileSync('python3',['-c',python],{input:JSON.stringify({quantSchema:readFileSync('quant-transfer-schema.sql','utf8'),rewardSchema,plan}),encoding:'utf8'}));
 assert.deepEqual(result,{mints:1,ledgers:1,rewards:1,wallet:'existing-wallet',linked:true,balance:1});
});


test('verified deployed site mints an Infinity proposal with a search and immutable HTML reference',()=>{
 const sha='b'.repeat(40),file='sites/haunted/index.html',commit={sha,files:[{filename:file,status:'added',additions:77,patch:'+<html><title>Haunted Arcade</title><body>Full site</body></html>'}]};
 const job={id:'job-quant:site-build',repository:'www-infinity4/QuantaPhi',attempts:[{status:'deployed_verified',testsPassed:true,commitSha:sha}],
  site:{url:'https://quantaphi.org/sites/haunted/',publishedVerified:true,searchQuery:'haunted arcade original website',
   searchReceipt:{verified:true,id:'search-receipt-20'},htmlSha256:'c'.repeat(64),htmlPath:file}};
 const verified=earnedWork(job,commit);
 assert.equal(verified.asset,'INFINITY');
 assert.equal(verified.kind,'full-site-build');
 assert.equal(verified.searchQuery,job.site.searchQuery);
 assert.match(verified.htmlSourceUrl,/github.com\/www-infinity4\/QuantaPhi\/blob\/b{40}\/sites\/haunted\/index.html/);
 assert.equal(earnedWork({...job,site:{...job.site,searchReceipt:{verified:false}}},commit),null);
 assert.equal(earnedWork({...job,attempts:[{status:'committed_unverified',testsPassed:true,commitSha:sha}]},commit),null);
});
test('Infinity website credit is idempotent in the existing D1 wallet schema',()=>{
 const id='botwork_verified_site',userId='owner',plan=siteCreditStatements({id,userId,metadata:JSON.stringify({
  repository:'www-infinity4/QuantaPhi',commitSha:'a'.repeat(40),websiteUrl:'https://quantaphi.org/sites/haunted/',
  htmlSha256:'b'.repeat(64),searchQuery:'haunted arcade'}),now:123});
 const python=`import sqlite3,json,sys
p=json.loads(sys.stdin.read());db=sqlite3.connect(':memory:')
db.executescript("CREATE TABLE unified_wallet_state(user_id TEXT PRIMARY KEY,infinity_balance INTEGER NOT NULL DEFAULT 0,created_at INTEGER,updated_at INTEGER);CREATE TABLE unified_token_records(token_id TEXT PRIMARY KEY,user_id TEXT,token_type TEXT,source TEXT,data_json TEXT,provenance_hash TEXT UNIQUE,created_at INTEGER);CREATE TABLE unified_wallet_events(event_id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE,user_id TEXT,asset_code TEXT,event_type TEXT,amount INTEGER,balance_after INTEGER,reference_id TEXT,metadata_json TEXT,created_at INTEGER);")
db.execute(p['schema'])
for _ in range(3):
 with db:
  for s in p['plan']:db.execute(s['sql'],s['params'])
print(json.dumps(dict(balance=db.execute("SELECT infinity_balance FROM unified_wallet_state WHERE user_id='owner'").fetchone()[0],
 rewards=db.execute('SELECT COUNT(*) FROM bot_site_rewards WHERE paid=1').fetchone()[0],
 tokens=db.execute("SELECT COUNT(*) FROM unified_token_records WHERE token_type='INFINITY_SEARCH'").fetchone()[0],
 events=db.execute("SELECT COUNT(*) FROM unified_wallet_events WHERE asset_code='INFINITY'").fetchone()[0])) )
`;
 const got=JSON.parse(execFileSync('python3',['-c',python],{input:JSON.stringify({schema:siteRewardSchema,plan}),encoding:'utf8'}));
 assert.deepEqual(got,{balance:1,rewards:1,tokens:1,events:1});
});
