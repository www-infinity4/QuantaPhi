const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {DatabaseSync}=require('node:sqlite');
const source=fs.readFileSync('workers/quanta-phi-ledger/worker.js','utf8').split('async function ensurePublishedPages')[0];
function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec(`CREATE TABLE unified_wallet_state(user_id TEXT PRIMARY KEY,created_at INTEGER,updated_at INTEGER,music_quant_balance INTEGER DEFAULT 0);
 CREATE TABLE unified_wallet_events(event_id TEXT PRIMARY KEY,idempotency_key TEXT UNIQUE,user_id TEXT,asset_code TEXT,event_type TEXT,amount INTEGER,balance_after INTEGER,reference_id TEXT,metadata_json TEXT,created_at INTEGER);
 CREATE TABLE music_quants(quant_id TEXT PRIMARY KEY,owner_wallet_id TEXT,payload_json TEXT,status TEXT DEFAULT 'active',created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
 const prepare=sql=>({bind(...args){return {run:async()=>db.prepare(sql).run(...args),first:async()=>db.prepare(sql).get(...args),all:async()=>({results:db.prepare(sql).all(...args)}),sql,args}}});
 const env={DB:{prepare,batch:async statements=>{db.exec('BEGIN');try{for(const s of statements)db.prepare(s.sql).run(...s.args);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}}};
 const ctx={crypto:require('node:crypto').webcrypto,Date};vm.createContext(ctx);vm.runInContext(source+'globalThis.reconcile=reconcileMusicCredits',ctx);
 const add=(id,kind,at,owner='wallet')=>db.prepare('INSERT INTO music_quants(quant_id,owner_wallet_id,payload_json) VALUES(?,?,?)').run(id,owner,JSON.stringify({kind,createdAt:new Date(at).toISOString()}));
 return {db,env,run:()=>ctx.reconcile(env,'user','wallet'),add};
}
test('credits new piano and listening receipts once while preserving legacy floor and account isolation',async()=>{
 const f=fixture();f.db.exec("INSERT INTO unified_wallet_state VALUES('user',0,0,2327)");
 f.db.prepare('INSERT INTO unified_wallet_events VALUES(?,?,?,?,?,?,?,?,?,?)').run('floor','floor','user','MUSIC_QUANT','IMPORT',2327,2327,'floor','{}',1000);
 f.db.prepare('INSERT INTO unified_wallet_events VALUES(?,?,?,?,?,?,?,?,?,?)').run('repeat','repeat','user','MUSIC_QUANT','IMPORT',0,2327,'repeat','{}',9000);
 f.add('old','listening',500);f.add('piano','playable',2000);f.add('listen','listening',3000);f.add('other','listening',4000,'other-wallet');
 await f.run();await f.run();
 assert.equal(f.db.prepare('SELECT music_quant_balance FROM unified_wallet_state').get().music_quant_balance,2329);
 assert.equal(f.db.prepare("SELECT COUNT(*) n FROM unified_wallet_events WHERE event_type='MINT'").get().n,3);
 assert.equal(f.db.prepare("SELECT SUM(amount) n FROM unified_wallet_events WHERE event_type='MINT'").get().n,2);
});
test('new account receives its receipts and concurrent retries do not double credit',async()=>{
 const f=fixture();f.add('one','playable',2000);f.add('two','listening',3000);
 await Promise.all([f.run(),f.run()]);
 assert.equal(f.db.prepare('SELECT music_quant_balance FROM unified_wallet_state').get().music_quant_balance,2);
});
