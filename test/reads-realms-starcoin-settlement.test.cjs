const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{DatabaseSync}=require('node:sqlite');
const TOKEN='sq_'+'a'.repeat(40);
async function setup(){
 const ledger=new DatabaseSync(':memory:');
 ledger.exec(fs.readFileSync('quant-transfer-schema.sql','utf8'));
 ledger.exec("CREATE VIEW quant_wallet_balances AS SELECT w.wallet_id,0 AS balance FROM quant_wallets w;CREATE TABLE unified_wallet_state(user_id TEXT PRIMARY KEY,infinity_balance INTEGER NOT NULL DEFAULT 0);INSERT INTO quant_wallets(wallet_id,user_id) VALUES('qw_test','user_test');");
 const identity=new DatabaseSync(':memory:');
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(TOKEN))).toString('hex');
 identity.exec(`CREATE TABLE accounts(id TEXT PRIMARY KEY,star_coins INTEGER NOT NULL DEFAULT 0,pending_share_credits INTEGER NOT NULL DEFAULT 0,share_count INTEGER NOT NULL DEFAULT 0,updated_at INTEGER);
CREATE TABLE account_devices(account_id TEXT,token_hash TEXT);
CREATE TABLE share_receipts(idempotency_key TEXT PRIMARY KEY,account_id TEXT,content_id TEXT,method TEXT,receipt_hash TEXT,show_title TEXT,episode_id TEXT,company_id TEXT,actors_json TEXT,fully_watched INTEGER,attribution_status TEXT,payout_status TEXT,created_at INTEGER,credited_at INTEGER);
CREATE TABLE ledger_events(id TEXT PRIMARY KEY,account_id TEXT,event_type TEXT,amount INTEGER,balance INTEGER,progress_to_next_coin INTEGER,shares_per_coin INTEGER,reference_id TEXT,content_id TEXT,company_id TEXT,actors_json TEXT,attribution_status TEXT,payout_status TEXT,created_at INTEGER);
INSERT INTO accounts(id) VALUES('user_test');
INSERT INTO account_devices VALUES('user_test','${hash}');`);
 const d1=db=>({prepare(sql){return {sql,args:[],bind(...args){this.args=args;return this},async run(){return {meta:{changes:Number(db.prepare(sql).run(...this.args).changes)}}},async first(){return db.prepare(sql).get(...this.args)||null},async all(){return {results:db.prepare(sql).all(...this.args)}}}},async batch(items){const result=[];db.exec('BEGIN');try{for(const item of items)result.push({meta:{changes:Number(db.prepare(item.sql).run(...item.args).changes)}});db.exec('COMMIT');return result}catch(error){db.exec('ROLLBACK');throw error}}});
 const context={crypto,TextEncoder,Response,URL,console};
 vm.createContext(context);
 const workerSource=fs.readFileSync('workers/quanta-phi-ledger/worker.js','utf8');
 vm.runInContext(workerSource.replace('export default {','const worker = {')+'\nglobalThis.worker=worker;',context);
 const env={DB:d1(ledger),IDENTITY_DB:d1(identity)};
 const call=(credits)=>context.worker.fetch(new Request('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/star-coins',{method:'POST',headers:{origin:'https://quantaphi.org',authorization:'Bearer '+TOKEN,'content-type':'application/json'},body:JSON.stringify({credits})}),env,{});
 return {identity,ledger,call};
}
const action=(kind,ref,serverSettlement=true)=>({kind,reference:ref,reference_id:'quantaphi:'+kind+':'+ref,serverSettlement,data:{id:ref,title:'Reads & Realms story',sourceUrl:'https://example.org/story',action:kind}});
test('Reads and Realms Collect Star Share pay the real StarQuest account once',async()=>{
 const {identity,call}=await setup();
 const credits=[action('collect','infinite-book|mystery-one'),action('star','infinite-book:mystery-one'),action('share','infinite-book:mystery-one:unique-one')];
 let r=await call(credits);assert.equal(r.status,201);let j=await r.json();
 assert.equal(j.wallet_state.starCoins,0);assert.equal(j.wallet_state.pendingShareCredits,3);
 assert.equal(j.settled.filter(x=>x.credited).length,3);
 assert.equal(identity.prepare('SELECT COUNT(*) AS n FROM share_receipts WHERE credited_at IS NOT NULL').get().n,3);
 r=await call(credits);assert.equal(r.status,201);j=await r.json();
 assert.equal(j.settled.filter(x=>x.credited).length,0);
 assert.equal(j.wallet_state.pendingShareCredits,3,'refresh/retries cannot double pay');
});
test('Ten distinct eligible actions pay one StarCoin and preserve 10 ledger entries',async()=>{
 const {identity,call}=await setup();
 const kinds=['collect','star','share','build_image','fix_image','extract','compare','collect','star','share'];
 let r=await call(kinds.map((kind,i)=>action(kind,'reads-realms:example:'+i)));
 assert.equal(r.status,201);const result=await r.json();
 assert.equal(result.wallet_state.starCoins,1);
 assert.equal(result.wallet_state.pendingShareCredits,0);
 assert.equal(result.settled.filter(x=>x.credited).length,10);
 assert.equal(identity.prepare('SELECT COUNT(*) AS n FROM ledger_events WHERE event_type=?').get('share_reward').n,1);
});
test('Legacy client receipts still use their existing payout path to avoid duplicate StarQuest minting',async()=>{
 const {identity,call}=await setup();
 const result=await(await call([action('star','legacy-story',false)])).json();
 assert.equal(result.settled.length,0);
 assert.equal(identity.prepare('SELECT COUNT(*) AS n FROM share_receipts').get().n,0);
});
test('Reads and Realms action handlers connect Star Collect and successful Share to Cloudflare',()=>{
 const js=fs.readFileSync('infinite-book.js','utf8');
 assert.match(js,/QuantaStarCredit\?\.\('star','infinite-book:'/);
 assert.match(js,/QuantaStarCredit\?\.\('collect',key/);
 assert.match(js,/QuantaStarCredit\?\.\('share', 'infinite-book:'/);
 assert.match(js,/Already collected · checking the original/);
 const cloud=fs.readFileSync('star-coin-cloud.js','utf8');
 assert.match(cloud,/serverSettlement:true/);
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/__quantaStarServerSettlement=true/);
});
