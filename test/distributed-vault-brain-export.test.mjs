import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,chmodSync,statSync,existsSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openPortableBrainState} from '../distributed-vault/portable-brain-state.mjs';
import {stageBrainImport} from '../distributed-vault/brain-private-import.mjs';
import {createPrivateBrainStateExport} from '../workers/infinity-brain-clock/private-state-export.mjs';
import {downloadPrivateBrainState,EXPORT_ENDPOINT} from '../distributed-vault/brain-private-export.mjs';

register('../distributed-vault/sqlite-brain-loader.mjs',import.meta.url);
const {default:worker,BrainClock}=await import('../workers/infinity-brain-clock/worker.js');
const token='private-master-fixture-'.padEnd(48,'Q'),sha=value=>createHash('sha256').update(value).digest('hex'),owner=sha(token);
const base={ownerHash:owner,sourceSha:'c'.repeat(40),snapshotId:'synthetic-export-1',workSha256:'a'.repeat(64)};
async function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'brain-export-'));let state;
 t.after(async()=>{await state?.close();rmSync(root,{recursive:true,force:true});});
 const statePath=join(root,'state.sqlite'),work=join(root,'work.sqlite'),destination=join(root,'download'),imports=join(root,'imports');
 mkdirSync(destination,{mode:0o700});mkdirSync(imports,{mode:0o700});
 const db=new DatabaseSync(work);db.exec('CREATE TABLE work_tickets(id TEXT PRIMARY KEY,owner_hash TEXT,context_json TEXT,request TEXT,created_at INTEGER,updated_at INTEGER,status TEXT)');db.close();chmodSync(work,0o600);
 state=openPortableBrainState(statePath);
 await state.put('owner-session:retained',{expires:123,tokenHash:'private-session-canary'});
 await state.put('bubbles-github-credential-v1',{ciphertext:'private-ciphertext-canary'});
 await state.put('repository-lease:www-infinity4/quantaphi',{leaseId:'keep-original-fence',leaseUntil:123});
 return {root,statePath,state,work,destination,imports,metadata:{...base,workSha256:sha(readFileSync(work))}};
}
function mapStorage(entries){return {transaction:async callback=>callback({list:async({startAfter,limit})=>new Map(entries.filter(([key])=>startAfter===undefined||Buffer.compare(Buffer.from(key),Buffer.from(startAfter))>0).slice(0,limit))})};}
function configured(f,extra={}){
 let calls=0;const env={WRITER_OWNER_HASH:owner,BRAIN_PRIVATE_EXPORT_ENABLED:'1',...extra};
 const clock=new BrainClock({storage:f.state},env);
 env.CLOCK={idFromName:name=>name,get:()=>({fetch:async(input,init)=>{calls++;assert.equal(String(input),'https://clock.internal/migration/state-export');return clock.fetch(new Request(input,init));}})};
 return {env,calls:()=>calls,fetcher:async(url,init)=>{assert.equal(url,EXPORT_ENDPOINT);assert.equal(init.redirect,'error');return worker.fetch(new Request(url,init),env);}};
}

test('export captures all JSON KV pages in UTF-8 order and stages with the existing importer',async t=>{
 const f=await fixture(t);await f.state.transaction(async tx=>{for(let i=0;i<140;i++)await tx.put('entry-'+String(i).padStart(3,'0'),{value:i});await tx.put('\uE000',{scope:'bmp'});await tx.put('\u{10000}',{scope:'supplementary'});});
 const before=readFileSync(f.statePath),result=await createPrivateBrainStateExport(f.state,f.metadata);
 assert.equal(result.document.entryCount,145);assert.equal(result.document.complete,true);assert.equal(result.document.entriesSha256,sha(JSON.stringify(result.document.entries)));
 const keys=result.document.entries.map(([key])=>key);assert.ok(keys.indexOf('\uE000')<keys.indexOf('\u{10000}'),'Cloudflare order uses UTF-8, not JS UTF-16 comparison');
 assert.equal(result.report.sourceFenceVerified,false);assert.equal(result.report.workSnapshotConsistencyVerified,false);assert.equal(result.report.productionVerified,false);assert.equal(result.report.scope,'infinity-main-json-kv');
 assert.equal(result.report.writerActivationPerformed,false);
 assert.deepEqual(readFileSync(f.statePath),before,'read-only export must not rewrite source storage');
 const exported=join(f.root,'export.json');writeFileSync(exported,result.serialized,{mode:0o600});
 const staged=await stageBrainImport({workDbPath:f.work,exportPath:exported,destinationRoot:f.imports,ownerHash:owner});assert.equal(staged.stateRecords,145);assert.equal(staged.writerEnabled,false);
 const copy=openPortableBrainState(staged.statePath);try{assert.deepEqual(await copy.get('bubbles-github-credential-v1'),{ciphertext:'private-ciphertext-canary'});assert.equal((await copy.get('repository-lease:www-infinity4/quantaphi')).leaseId,'keep-original-fence');}finally{await copy.close();}
 const proto=await createPrivateBrainStateExport(mapStorage([['safe',JSON.parse('{"__proto__":{"private":"data"}}')]]),base);
 assert.equal(Object.hasOwn(proto.document.entries[0][1],'__proto__'),true);assert.equal({}.private,undefined);
});
test('transaction retry starts a fresh capture and concurrent writers cannot alter captured values',async t=>{
 const storage={transaction:async callback=>{
  await callback({list:async({startAfter})=>startAfter===undefined?new Map([['discarded',1]]):new Map()});
  return callback({list:async({startAfter})=>startAfter===undefined?new Map([['retained',2]]):new Map()});
 }};
 const exported=await createPrivateBrainStateExport(storage,base);assert.deepEqual(exported.document.entries,[['retained',2]]);
 const f=await fixture(t),snapshot=createPrivateBrainStateExport(f.state,f.metadata),write=f.state.put('later',3);
 const result=await snapshot;await write;assert.equal(result.document.entries.some(([key])=>key==='later'),false);assert.equal(await f.state.get('later'),3);
});
test('unsupported or lossy structured-clone values, stalled pages and oversized snapshots fail without private error text',async()=>{
 const cyclic={};cyclic.self=cyclic;const same={};let getterCalls=0;const getter={};Object.defineProperty(getter,'secret',{enumerable:true,get(){getterCalls++;return 'private-getter-canary';}});
 for(const value of [undefined,NaN,Infinity,-0,1n,new Date(),new Map(),new Set(),new Uint8Array([1]),cyclic,[same,same],Array(2),getter])
  await assert.rejects(createPrivateBrainStateExport(mapStorage([['key',value]]),base),error=>{assert.doesNotMatch(error.stack,/private-getter-canary/);return true;});
 assert.equal(getterCalls,0);
 await assert.rejects(createPrivateBrainStateExport({transaction:async fn=>fn({list:async()=>new Map([['repeat',1]])})},base),/page_invalid/);
 await assert.rejects(createPrivateBrainStateExport(mapStorage([['big','x'.repeat(17*1024*1024)]]),base),/too_large/);
 await assert.rejects(createPrivateBrainStateExport(mapStorage([['unicode','é'.repeat(9*1024*1024)]]),base),/too_large/);
 let index=0;await assert.rejects(createPrivateBrainStateExport({transaction:async fn=>fn({list:async()=>new Map([[String(index++).padStart(6,'0'),0]])})},base),/too_many_records/);
 index=0;const exact=await createPrivateBrainStateExport({transaction:async fn=>fn({list:async()=>index===100000?new Map():new Map([[String(index++).padStart(6,'0'),0]])})},base);assert.equal(exact.document.entryCount,100000);
});
test('export ingress requires explicit enablement and original master proof, never phone or bridge grants',async t=>{
 const f=await fixture(t),server=configured(f),body=JSON.stringify({sourceSha:base.sourceSha,snapshotId:base.snapshotId,workSha256:f.metadata.workSha256});
 const request=(auth,origin='https://quantaphi.org',method='POST',payload=body)=>new Request(EXPORT_ENDPOINT,{method,headers:{Origin:origin,Authorization:'Bearer '+auth,'Content-Type':'application/json'},...(method==='POST'?{body:payload}:{})});
 for(const auth of ['', 'rb_'+'a'.repeat(64),'rd_'+'b'.repeat(64),'header.payload.signature'])assert.equal((await worker.fetch(request(auth),server.env)).status,401);
 assert.equal((await worker.fetch(request(token,'https://evil.example'),server.env)).status,403);assert.equal(server.calls(),0);
 assert.equal((await worker.fetch(request(token),{...server.env,BRAIN_PRIVATE_EXPORT_ENABLED:'0'})).status,404);assert.equal(server.calls(),0);
 assert.equal((await worker.fetch(request(token,'https://quantaphi.org','GET'),server.env)).status,404);
 const good=await worker.fetch(request(token),server.env);assert.equal(good.status,200);assert.match(good.headers.get('Cache-Control'),/private.*no-store/);assert.match(good.headers.get('Content-Disposition'),/attachment/);assert.equal(good.headers.get('X-Brain-Source-Fence-Verified'),'false');assert.equal(server.calls(),1);
 for(const payload of ['{',JSON.stringify({...JSON.parse(body),ownerHash:'b'.repeat(64)}),' '.repeat(5000)])assert.ok([400,413].includes((await worker.fetch(request(token,'https://quantaphi.org','POST',payload),server.env)).status));
 assert.equal(server.calls(),1,'invalid export metadata must not read private state');
});
test('private client downloads once, preserves owner/source/hash scope and writes private receipt last',async t=>{
 const f=await fixture(t),server=configured(f);
 const result=await downloadPrivateBrainState({workDbPath:f.work,destinationDirectory:f.destination,sourceSha:base.sourceSha,snapshotId:base.snapshotId,ownerToken:token,fetcher:server.fetcher});
 assert.equal(server.calls(),1);assert.equal(result.productionVerified,false);assert.equal(result.sourceFenceVerified,false);assert.equal(result.stateRecords,3);
 assert.equal(result.writerActivationPerformed,false);
 const document=JSON.parse(readFileSync(join(f.destination,'state.json'),'utf8'));assert.equal(document.ownerHash,owner);assert.equal(document.workSha256,f.metadata.workSha256);
 for(const name of ['state.json','export-receipt.json'])assert.equal(statSync(join(f.destination,name)).mode&0o777,0o600);
 assert.doesNotMatch(JSON.stringify(result),/private-session-canary|private-ciphertext-canary/);
 await assert.rejects(downloadPrivateBrainState({workDbPath:f.work,destinationDirectory:f.destination,sourceSha:base.sourceSha,snapshotId:base.snapshotId,ownerToken:token,fetcher:()=>assert.fail('existing outputs must stop before network')}));
 const staged=await stageBrainImport({workDbPath:f.work,exportPath:join(f.destination,'state.json'),destinationRoot:f.imports,ownerHash:owner});assert.equal(staged.stateRecords,3);
});
test('private client refuses public snapshots, error pages, mismatched payloads and changed source without accepted output',async t=>{
 const f=await fixture(t),result=await createPrivateBrainStateExport(f.state,f.metadata),headers={'Content-Type':'application/json','X-Brain-KV-Snapshot':'complete','X-Brain-Source-Authority-Verified':'false','X-Brain-Source-Fence-Verified':'false','X-Brain-Work-Consistency-Verified':'false','X-Brain-Production-Verified':'false'};
 const options={workDbPath:f.work,destinationDirectory:f.destination,sourceSha:base.sourceSha,snapshotId:base.snapshotId,ownerToken:token};
 const variants=[()=>new Response('private-error-page-canary',{status:429}),()=>new Response('',{status:302,headers:{Location:'https://evil.example'}}),()=>new Response('private-json-canary',{headers}),()=>Response.json({...result.document,ownerHash:'b'.repeat(64)},{headers}),()=>Response.json({...result.document,entriesSha256:'0'.repeat(64)},{headers}),()=>Response.json(result.document),()=>new Response(new Uint8Array([255]),{headers}),()=>new Response('x'.repeat(17*1024*1024),{headers})];
 for(const fetcher of variants){await assert.rejects(downloadPrivateBrainState({...options,fetcher}),error=>{assert.doesNotMatch(error.stack,/private-error-page-canary|private-json-canary/);return true;});assert.equal(existsSync(join(f.destination,'state.json')),false);assert.equal(existsSync(join(f.destination,'export-receipt.json')),false);}
 let cancelled=0;
 await assert.rejects(downloadPrivateBrainState({...options,fetcher:async()=>new Response(new ReadableStream({cancel(){cancelled++;return new Promise(()=>{});}}),{status:429})}));
 assert.equal(cancelled,1,'dispose rejected response without awaiting a stalled producer');
 chmodSync(f.work,0o644);await assert.rejects(downloadPrivateBrainState({...options,fetcher:()=>assert.fail('public snapshot must stop before network')}));chmodSync(f.work,0o600);
 await assert.rejects(downloadPrivateBrainState({...options,fetcher:async()=>{const db=new DatabaseSync(f.work);db.exec('CREATE TABLE changed_source(id TEXT)');db.close();return Response.json(result.document,{headers});}}));
 assert.equal(existsSync(join(f.destination,'export-receipt.json')),false);
});
