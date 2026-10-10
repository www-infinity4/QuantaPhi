const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{DatabaseSync}=require('node:sqlite');
const TOKEN='sq_'+'a'.repeat(40);
async function ledger(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(fs.readFileSync('quant-transfer-schema.sql','utf8'));
 sqlite.exec(`CREATE VIEW quant_wallet_balances AS SELECT w.wallet_id,COALESCE((SELECT SUM(delta) FROM quant_ledger_entries WHERE wallet_id=w.wallet_id),0) balance FROM quant_wallets w;
 CREATE TABLE unified_wallet_state(user_id TEXT PRIMARY KEY,infinity_balance INTEGER NOT NULL DEFAULT 0,created_at INTEGER,updated_at INTEGER);
 INSERT INTO quant_wallets(wallet_id,user_id) VALUES('qw_test','user_test');`);
 const d1=db=>({prepare(sql){return{args:[],sql,bind(...args){this.args=args;return this},async run(){return {meta:{changes:Number(db.prepare(sql).run(...this.args).changes)}}},async first(){return db.prepare(sql).get(...this.args)||null},async all(){return {results:db.prepare(sql).all(...this.args)}}}},async batch(items){db.exec('BEGIN');try{for(const i of items)db.prepare(i.sql).run(...i.args);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}});
 const identity=new DatabaseSync(':memory:');
 const hash=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(TOKEN))).toString('hex');
 identity.exec(`CREATE TABLE accounts(id TEXT PRIMARY KEY);CREATE TABLE account_devices(account_id TEXT,token_hash TEXT);INSERT INTO accounts VALUES('user_test');INSERT INTO account_devices VALUES('user_test','${hash}');`);
 const context={crypto,TextEncoder,Response,URL,console};vm.createContext(context);
 vm.runInContext(fs.readFileSync('workers/quanta-phi-ledger/worker.js','utf8').replace('export default {','const worker = {')+'\nglobalThis.worker=worker;',context);
 const env={DB:d1(sqlite),IDENTITY_DB:d1(identity)};
 const call=(method,body)=>context.worker.fetch(new Request('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/star-coins',{method,headers:{origin:'https://quantaphi.org',authorization:'Bearer '+TOKEN,'content-type':'application/json'},body:body&&JSON.stringify(body)}),env,{});
 return {sqlite,call};
}
test('Collect and Share credits are kept once in Cloudflare D1 with the collected card',async()=>{
 const {sqlite,call}=await ledger();
 const credits=[{reference_id:'quantaphi:collect:Image|Ruthenium|https://x/a.jpg',kind:'collect',reference:'Image|Ruthenium|https://x/a.jpg',card:{key:'Image|Ruthenium|https://x/a.jpg',type:'Image',title:'Ruthenium',media:'https://x/a.jpg'}},{reference_id:'quantaphi:share:card:Ruthenium:1',kind:'share',reference:'card:Ruthenium:1'}];
 let r=await call('POST',{credits});assert.equal(r.status,201);let j=await r.json();
 assert.deepEqual([j.credits_tenths,j.collects,j.shares,j.accepted.length],[2,1,1,2]);
 r=await call('POST',{credits});j=await r.json();assert.equal(j.credits_tenths,2,'a retried receipt is not credited twice');
 for(let i=2;i<=9;i++)await call('POST',{credits:[{reference_id:'quantaphi:share:s'+i,kind:'share',reference:'s'+i}]});
 j=await (await call('GET')).json();
 assert.deepEqual([j.credits_tenths,j.star_coins,j.progress,j.history.length],[10,1,0,10]);
 assert.equal(sqlite.prepare("SELECT title FROM quant_collects WHERE wallet_id='qw_test'").get().title,'Ruthenium');
 r=await call('POST',{credits:[{reference_id:'other:share:x',kind:'share'},{reference_id:'quantaphi:collect:y',kind:'mint'}]});
 assert.equal(r.status,400,'only QuantaPhi collect/share receipts are accepted');
});
function browser(connection){
 const values=new Map(),listeners={};
 const localStorage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};
 const window={localStorage,QuantaCloudConnection:connection,addEventListener:(e,f)=>(listeners[e]=listeners[e]||[]).push(f),dispatchEvent(){}};
 const context={window,CustomEvent:class{constructor(t,o){this.type=t;this.detail=o?.detail}},setTimeout:()=>0,clearTimeout(){},console:{warn(){}}};
 vm.runInNewContext(fs.readFileSync('star-coin-cloud.js','utf8'),context);
 return {cloud:window.QuantaStarCoinCloud,values,window};
}
test('credits stay queued while Cloudflare is unreachable and flush once it confirms',async()=>{
 let online=false;const sent=[];
 const connection={hasCredential:()=>true,async authenticatedFetch(url,opt){if(!online)throw new Error('offline');sent.push(...opt.body.credits);return new Response(JSON.stringify({ok:true,accepted:opt.body.credits.map(x=>x.reference_id),credits_tenths:sent.length}),{status:201})}};
 const {cloud,values}=browser(connection);
 cloud.record('collect','Image|Iron|u',{key:'Image|Iron|u',title:'Iron',type:'Image'});cloud.record('share','overview:iron:1');cloud.record('share','overview:iron:1');
 const settle=()=>new Promise(r=>setImmediate(r));
 await settle();await cloud.flush();
 assert.equal(cloud.pending().length,2);assert.equal(JSON.parse(values.get(cloud.KEY)).length,2,'outbox survives reload');
 online=true;await settle();const result=await cloud.flush();
 assert.deepEqual({...result},{ok:true,pending:0});assert.deepEqual(sent.map(x=>x.reference_id),['quantaphi:collect:Image|Iron|u','quantaphi:share:overview:iron:1']);
 assert.equal(sent[0].card.title,'Iron');
});
test('earlier browser-only QuantaPhi credits are backfilled once per account',()=>{
 const {cloud,values}=browser({hasCredential:()=>false,authenticatedFetch(){throw new Error('unused')}});
 values.set('starquest_session',JSON.stringify({key:'kris'}));
 values.set('starquest_users',JSON.stringify({kris:{ledger:[{referenceId:'quantaphi:share:page:1',createdAt:1},{referenceId:'quantaphi:collect:Image|A|m',createdAt:2},{referenceId:'tx-other'}]}}));
 values.set('quantaPhiCollected',JSON.stringify([{key:'Image|A|m',title:'A',type:'Image'},{key:'Video|B|v',title:'B',type:'Video'}]));
 assert.equal(cloud.backfill(),3);assert.equal(cloud.backfill(),0);
 assert.deepEqual(JSON.parse(JSON.stringify(cloud.pending().map(x=>x.reference_id).sort())),['quantaphi:collect:Image|A|m','quantaphi:collect:Video|B|v','quantaphi:share:page:1']);
});
test('Collect and Share buttons credit through Control Phi and record to the Cloudflare ledger',()=>{
 const html=fs.readFileSync('index.html','utf8');
 assert.match(html,/<script src="star-coin-cloud\.js\?v=[^"]+"><\/script>/);
 assert.match(html,/cp\.ensureActionCredit\(ref,kind\)/);
 assert.match(html,/QuantaStarCoinCloud\?\.record\(kind,ref,card\)/);
 assert.match(html,/QuantaStarCredit\?\.\('collect',key,existing\)/);
 assert.equal((html.match(/QuantaStarCredit\?\.\('share',/g)||[]).length,3);
 assert.doesNotMatch(html,/ControlPhi\.ensureShareCredit\.bind/);
});
test('QuantaStarCredit routes through Control Phi, falls back to the local wallet, and skips duplicate receipts',()=>{
 const html=fs.readFileSync('index.html','utf8'),end=html.indexOf('window.QuantaStarCredit=function'),start=html.lastIndexOf('<script>',end)+8,code=html.slice(start,html.indexOf('</script>',end));
 const values=new Map(),calls=[],recorded=[];
 const window={addEventListener(){},dispatchEvent(){},QuantaStarCoinCloud:{record:(...a)=>recorded.push(a)}};
 const context={window,localStorage:{getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,String(v))},document:{cookie:'',querySelectorAll:()=>[],getElementById:()=>null},crypto:{randomUUID:()=>'uuid'},CustomEvent:class{},Date,Math,JSON,Number,String,Array,RegExp,console};
 vm.runInNewContext(code,context);
 window.QuantaStarCredit('collect','Image|Iron|u',{title:'Iron'});
 assert.equal(JSON.parse(values.get('starquest_guest_profile_v1')).pendingShareCredits,1,'local wallet credits without Control Phi');
 window.ControlPhi={ensureActionCredit:(ref,kind)=>{calls.push([kind,ref]);return {awarded:0}},ensureShareCredit:ref=>{calls.push(['share',ref]);return {alreadyRecorded:true}}};
 window.QuantaStarCredit('collect','Image|Gold|g');window.QuantaStarCredit('share','page:1');
 assert.deepEqual(JSON.parse(JSON.stringify(calls)),[['collect','Image|Gold|g'],['share','page:1']]);
 assert.deepEqual(JSON.parse(JSON.stringify(recorded.map(x=>x.slice(0,2)))),[['collect','Image|Iron|u'],['collect','Image|Gold|g']],'a duplicate share is not sent to Cloudflare');
});
test('backfill waits for a signed-in account record instead of marking it done empty',()=>{
 const {cloud,values}=browser({hasCredential:()=>false,authenticatedFetch(){throw new Error('unused')}});
 values.set('starquest_session',JSON.stringify({key:'kris'}));
 assert.equal(cloud.backfill(),0);assert.equal(values.has('quantaPhi:starCoinCloudBackfill:v1:kris'),false);
 values.set('starquest_users',JSON.stringify({kris:{ledger:[{referenceId:'quantaphi:share:page:9',createdAt:1}]}}));
 assert.equal(cloud.backfill(),1);
});

test('all completed research actions pay one tenth with exact data and harmless retries',async()=>{
 const {sqlite,call}=await ledger();
 const kinds=['star','build_image','fix_image','extract','compare'];
 const credits=kinds.map(kind=>({kind,reference_id:'quantaphi:'+kind+':exact-quant',reference:'exact-quant',data:{quantId:'q-44',terms:['ruthenium','iron'],output:{text:'Exact comparison',source:'https://example.org/evidence'}}}));
 let response=await call('POST',{credits});assert.equal(response.status,201);
 assert.equal((await response.json()).credits_tenths,5);
 response=await call('POST',{credits});const state=await response.json();assert.equal(state.credits_tenths,5);
 assert.equal(state.history.length,5);assert.deepEqual(state.history[0].data,credits[0].data);
 assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM quanta_action_catalog').get().n,5);
 const bad=await call('POST',{credits:[{kind:'star',reference_id:'quantaphi:star:empty'}]});assert.equal(bad.status,400);
});
test('share receipts retain exact story and source data through the offline outbox',()=>{
 const {cloud}=browser({hasCredential:()=>false,authenticatedFetch(){throw Error('offline')}});
 const data={quantId:'q-44',story:'Full original story',sources:[{url:'https://example.org/evidence'}],selected:['ruthenium']};
 assert.equal(cloud.record('share','story-44',data),true);
 assert.deepEqual(JSON.parse(JSON.stringify(cloud.pending()[0].data)),data);
 assert.equal(cloud.record('star','story-44',data),true);
 assert.equal(cloud.pending().length,2);
});
