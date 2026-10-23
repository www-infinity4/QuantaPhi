import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import ledger from '../workers/quanta-phi-ledger/worker.js';
import {handleNativeProjects} from '../workers/quanta-phi-ledger/native-projects.mjs';
function fixture(){
 const sql=new DatabaseSync(':memory:');let failBatch=false;
 const db={prepare(query){return {query,args:[],bind(...args){this.args=args;return this;},async run(){return sql.prepare(query).run(...this.args);},async first(){return sql.prepare(query).get(...this.args)||null;},async all(){return {results:sql.prepare(query).all(...this.args)};}};},async batch(items){sql.exec('BEGIN');try{for(const [i,x]of items.entries()){if(failBatch&&i===1)throw Error('disk failure');sql.prepare(x.query).run(...x.args);}sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const call=async(owner,path='',body)=>{const r=await handleNativeProjects(new Request('https://ledger.test/v1/projects'+path,{method:body?'POST':'GET',...(body?{body:JSON.stringify(body)}:{})}),db,owner);return {status:r.status,...await r.json()};};
 return {sql,call,setFail:v=>failBatch=v,db};
}
test('native create, revisions, historical read and export persist without GitHub',async()=>{
 const {call}=fixture();
 const created=await call('alice','',{title:'Radio cards',requestId:'create_001'}),id=created.project.id;
 assert.equal(created.status,200);
 assert.equal((await call('alice','',{title:'Radio cards',requestId:'create_001'})).project.id,id);
 assert.equal((await call('alice','',{title:'Changed',requestId:'create_001'})).status,409);
 const first={requestId:'revision_001',expectedHead:null,files:{'index.html':'<h1>Radio</h1>','styles.css':'body{color:red}'}};
 const a=await call('alice','/'+id+'/revisions',first);assert.equal(a.status,200);
 assert.equal((await call('alice','/'+id+'/revisions',first)).replayed,true);
 const b=await call('alice','/'+id+'/revisions',{...first,requestId:'revision_002',expectedHead:a.revisionId,files:{'index.html':'Second version'}});
 assert.equal(b.status,200);
 assert.equal((await call('alice','/'+id)).revision.files['index.html'],'Second version');
 assert.equal((await call('alice','/'+id+'?revision='+a.revisionId)).revision.files['index.html'],'<h1>Radio</h1>');
 const exported=await call('alice','/'+id+'/export');assert.equal(exported.format,'quantaphi-project-v1');assert.equal(exported.published,false);
 assert.equal((await call('alice')).projects.length,1);
});
test('owner scoping, input boundaries, stale writers and integrity checks',async()=>{
 const {call,sql}=fixture();const id=(await call('alice','',{title:'Private',requestId:'create_001'})).project.id;
 assert.equal((await call('bob','/'+id)).status,404);assert.deepEqual((await call('bob')).projects,[]);
 assert.equal((await call('','/'+id)).status,401);
 for(const files of [{'../secret':'x'},{'a/../b':'x'},{'.git/config':'x'},{'bad\\path':'x'},{'x':'\0'},{'large':'é'.repeat(33000)}])assert.ok((await call('alice','/'+id+'/revisions',{requestId:'revision_001',expectedHead:null,files})).status>=400);
 const request={requestId:'revision_001',expectedHead:null,files:{'index.html':'one'}};
 const a=await call('alice','/'+id+'/revisions',request);assert.equal(a.status,200);
 assert.equal((await call('alice','/'+id+'/revisions',{...request,files:{'index.html':'changed'}})).status,409);
 assert.equal((await call('alice','/'+id+'/revisions',{...request,requestId:'revision_002'})).status,409);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM phi_native_revisions').get().n,1);
 sql.prepare('UPDATE phi_native_revisions SET files_json=? WHERE id=?').run('{"index.html":"corrupt"}',a.revisionId);
 assert.equal((await call('alice','/'+id)).error,'source_integrity_failed');
});
test('atomic rollback, owner quota and client owner override rejection',async()=>{
 const {call}=fixture();await call('alice','',{title:'Test',requestId:'create_001'});
 assert.equal((await call('alice','',{title:'Spoof',requestId:'create_002',owner:'bob'})).status,400);
 // Fail the head update after the INSERT, verifying the SQL transaction rolls back.
 // Schema calls also use batch; inject only on actual revision INSERT below.
 const db=fixture();const other=(await db.call('alice','',{title:'Test',requestId:'create_001'})).project.id;
 const batch=db.db.batch.bind(db.db);db.db.batch=async items=>{if(items[0].query.startsWith('INSERT'))db.setFail(true);return batch(items);};
 assert.equal((await db.call('alice','/'+other+'/revisions',{requestId:'revision_001',expectedHead:null,files:{'a.txt':'test'}})).status,503);
 assert.equal(db.sql.prepare('SELECT COUNT(*) AS n FROM phi_native_revisions').get().n,0);
 assert.equal(db.sql.prepare('SELECT head FROM phi_native_projects').get().head,null);
 for(let i=1;i<20;i++)assert.equal((await call('alice','',{title:'Test '+i,requestId:'create_'+String(i).padStart(3,'0')+'a'})).status,200);
 assert.equal((await call('alice','',{title:'Over quota',requestId:'create_limit'})).status,409);
});

test('ledger route authenticates device and active wallet before native project access',async()=>{
 const f=fixture();f.sql.exec(readFileSync(new URL('../quant-transfer-schema.sql',import.meta.url),'utf8'));f.sql.exec("INSERT INTO quant_wallets(wallet_id,user_id) VALUES('wallet_a','alice');");
 const token='sq_'+'a'.repeat(40),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 const tokenHash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 const env={DB:f.db,IDENTITY_DB:{prepare(){return {bind(value){return {async first(){return value===tokenHash?{user_id:'alice'}:null;}};}};}}};
 const request=auth=>new Request('https://ledger.test/v1/projects',{method:'POST',headers:{Origin:'https://quantaphi.org',...(auth?{Authorization:'Bearer '+auth}:{})},body:JSON.stringify({title:'Native route',requestId:'create_001'})});
 assert.equal((await ledger.fetch(request(),env)).status,401);
 assert.equal((await ledger.fetch(request('sq_'+'b'.repeat(40)),env)).status,401);
 const response=await ledger.fetch(request(token),env);assert.equal(response.status,200);
 const result=await response.json();assert.equal(result.project.title,'Native route');
 assert.equal(response.headers.get('cache-control'),'no-store');
 f.sql.exec("UPDATE quant_wallets SET status='disabled'");
 assert.equal((await ledger.fetch(request(token),env)).status,403);
});
