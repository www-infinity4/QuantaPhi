const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{DatabaseSync}=require('node:sqlite'),{webcrypto}=require('node:crypto');
global.crypto=webcrypto;
function database(){const db=new DatabaseSync(':memory:');db.exec("CREATE TABLE quant_wallets(wallet_id TEXT PRIMARY KEY,user_id TEXT UNIQUE,status TEXT DEFAULT 'active');CREATE TABLE quant_ledger_entries(wallet_id TEXT,delta INTEGER);CREATE TABLE quant_legacy_migrations(wallet_id TEXT,legacy_amount INTEGER)");return {prepare(sql){let args=[];const stmt={bind(...values){args=values;return stmt},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}}}};return stmt},async batch(stmts){return Promise.all(stmts.map(s=>s.run()))}}}
test('only saved research belonging to the authenticated user earns a receipt; replay cannot mint twice',async()=>{
 const worker=(await import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync('workers/quanta-phi-ledger/worker.js','utf8')).toString('base64'))).default;
 const db=database();let user='owner-a';const env={DB:db,IDENTITY_DB:{prepare:()=>({bind:()=>({first:async()=>({user_id:user})})})}};
 async function request(path,body){return worker.fetch(new Request('https://ledger.example'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer sq_'+'a'.repeat(32),'content-type':'application/json'},body:body?JSON.stringify(body):undefined}),env,{})}
 const terms=['hydrogen','iron','carbon','oxygen'],id='crusher_test_1234',spin={spin_id:id,terms,query:terms.join(' ')};
 assert.equal((await request('/v1/quants/crusher-spins',spin)).status,409);
 const packet={article_id:id,article:{title:'Saved research',terms},directions:Array.from({length:12},(_,i)=>({title:'Direction '+i}))};
 assert.equal((await request('/v1/quants/crusher-research',packet)).status,201);
 user='owner-b';assert.equal((await request('/v1/quants/crusher-spins',spin)).status,409);assert.deepEqual((await (await request('/v1/quants/crusher-research')).json()).articles,[]);
 user='owner-a';let r=await (await request('/v1/quants/crusher-spins',spin)).json();assert.equal(r.accepted,true);assert.equal(r.credited_tenths,1);assert.equal(r.history[0].research.title,'Saved research');
 r=await (await request('/v1/quants/crusher-spins',spin)).json();assert.equal(r.accepted,false);assert.equal(r.credits_tenths,1);
 const history=await (await request('/v1/quants/crusher-research')).json();assert.ok(history.articles[0].credit_id);
});
