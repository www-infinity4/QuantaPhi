'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..');
const worker=fs.readFileSync(path.join(ROOT,'workers/quanta-phi-ledger/collector-cards.mjs'),'utf8');
const home=fs.readFileSync(path.join(ROOT,'index.html'),'utf8');
const client=fs.readFileSync(path.join(ROOT,'collector-cards.js'),'utf8');
test('mobile hamburger has readable words and collector menu link',()=>{
 assert.match(home,/body\.oracle-quanta #qmenu a,body\.oracle-quanta #qmenu button\{font-size:19px!important/);
 assert.match(home,/href="#collectorShelf">My Collector Cards/);
 assert.match(home,/collector-cards\.js\?v=/);
});
test('purchase is server settled, never a browser-only deduction',()=>{
 assert.match(client,/QuantaCloudConnection\.authenticatedFetch/);
 assert.doesNotMatch(client,/localStorage\.setItem\([^,]*balance/i);
 assert.match(worker,/CREATE TRIGGER IF NOT EXISTS qp_collector_charge_v1/);
 assert.match(worker,/star_coins=star_coins-1/);
 assert.match(worker,/UNIQUE\(design_id,serial_number\)/);
 assert.match(worker,/UNIQUE\(account_id,request_id\)/);
 assert.match(worker,/quant_collector_receipts/);
});
test('atomic SQLite purchase gives 1/1, 1/2, 1/3; no duplicate debit on retries',()=>{
 const creates=[...worker.matchAll(/db\.prepare\("(CREATE (?:TABLE|INDEX|TRIGGER)[^"]+)"\)/g)].map(m=>m[1]);
 assert.equal(creates.length,4);
 const sql=worker.match(/const statement=env\.IDENTITY_DB\.prepare\(\s*'([^']+)'\+\s*'([^']+)'\+\s*'([^']+)'/);
 assert.ok(sql,'buy statement must be extracted from the actual implementation');
 const purchaseSQL=sql.slice(1,4).join('');
 const py=[
   'import sqlite3,json,sys',
   'schema,statement=json.loads(sys.stdin.read())',
   "db=sqlite3.connect(':memory:')",
   "db.executescript('CREATE TABLE accounts(id TEXT PRIMARY KEY,star_coins INTEGER,updated_at INTEGER,pending_share_credits INTEGER); CREATE TABLE ledger_events(id TEXT PRIMARY KEY,account_id TEXT NOT NULL,event_type TEXT NOT NULL,amount INTEGER NOT NULL,balance INTEGER NOT NULL,progress_to_next_coin INTEGER NOT NULL,shares_per_coin INTEGER NOT NULL,reference_id TEXT,content_id TEXT,company_id TEXT,actors_json TEXT,attribution_status TEXT,payout_status TEXT,created_at INTEGER NOT NULL);')",
   "db.execute(\"INSERT INTO accounts VALUES('alice',2,0,0),('bob',1,0,0)\")",
   'for s in schema: db.execute(s)',
   "db.execute(\"INSERT INTO qp_collector_designs VALUES('design','alice','Art','art.png','image/png','sha','render','prompt',0,1)\")",
   'def purchase(account,key):',
   "  db.execute(statement,('token-'+key,'receipt-'+key,'design',account,'design',key,42,'design'))",
   "purchase('alice','a');purchase('bob','b');purchase('alice','c')",
   "for account,key in [('alice','a'),('bob','extra')]:",
   "  try: purchase(account,key);raise AssertionError('duplicate or insufficient charge accepted')",
   "  except sqlite3.IntegrityError: pass",
   "assert db.execute('SELECT account_id,serial_number FROM qp_collector_copies ORDER BY serial_number').fetchall()==[('alice',1),('bob',2),('alice',3)]",
   "assert db.execute(\"SELECT id,star_coins FROM accounts ORDER BY id\").fetchall()==[('alice',0),('bob',0)]",
   "assert db.execute('SELECT COUNT(*) FROM ledger_events WHERE event_type=\"collector_purchase\"').fetchone()[0]==3",
   "print('collector_atomic_sql_ok')"
 ].join('\n');
 const out=spawnSync('python3',['-c',py],{input:JSON.stringify([creates,purchaseSQL]),encoding:'utf8'});
 assert.equal(out.status,0,out.stderr);
 assert.match(out.stdout,/collector_atomic_sql_ok/);
});
