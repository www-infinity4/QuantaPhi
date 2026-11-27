import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,chmodSync,rmSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:http';
import {openPortableBrainState} from '../distributed-vault/portable-brain-state.mjs';
import {openBrainDatabase} from '../distributed-vault/sqlite-brain-db.mjs';
import {createSqliteBrain} from '../distributed-vault/sqlite-brain-runtime.mjs';

const owner='a'.repeat(64),otherOwner='b'.repeat(64);
async function fixture(t){
 const dir=mkdtempSync(join(tmpdir(),'qp-brain-runtime-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const workDbPath=join(dir,'work.sqlite'),statePath=join(dir,'state.sqlite');
 const db=new DatabaseSync(workDbPath);
 db.exec('CREATE TABLE work_tickets(id TEXT PRIMARY KEY,owner_hash TEXT,context_json TEXT,request TEXT,created_at INTEGER,status TEXT,updated_at INTEGER)');
 const insert=db.prepare('INSERT INTO work_tickets VALUES(?,?,?,?,?,?,?)');
 for(const [id,scope,status,progress] of [['IW-local-0001',owner,'queued',{}],['IW-foreign-0001',otherOwner,'queued',{}],['IW-held-0001',owner,'blocked',{blocker:'security_hold'}]]){
  const job={id:'TASK-1',repository:'www-infinity4/QuantaPhi',agent:'greenbeans',executor:'repository-engine',instructions:'Repair the existing source and run its focused tests.',acceptance:['Test the actual behavior.'],dependencies:[],status,progress};
  insert.run(id,scope,JSON.stringify({kind:'robot-directions',color_jobs:[job]}),'Synthetic source repair',Date.now(),'ready',Date.now());
 }
 db.close();chmodSync(workDbPath,0o600);
 const state=openPortableBrainState(statePath);
 await state.put('fixture-retained-credential',{ciphertext:'existing encrypted record'});
 await state.close();
 return {dir,workDbPath,statePath};
}

test('SQLite database uses the existing table, D1 envelopes and atomic batch rollback',async t=>{
 const f=await fixture(t),db=openBrainDatabase(f.workDbPath);
 t.after(()=>db.close());
 assert.equal(await db.prepare('SELECT id FROM work_tickets WHERE id=?').bind('absent').first(),null);
 assert.equal(await db.prepare('SELECT id FROM work_tickets WHERE id=?').bind('IW-local-0001').first('id'),'IW-local-0001');
 await assert.rejects(db.batch([
  db.prepare('UPDATE work_tickets SET status=? WHERE id=?').bind('changed','IW-local-0001'),
  db.prepare('INSERT INTO work_tickets(id) VALUES(?)').bind('IW-local-0001')
 ]));
 assert.equal((await db.prepare('SELECT status FROM work_tickets WHERE id=?').bind('IW-local-0001').first()).status,'ready');
 const result=await db.prepare('UPDATE work_tickets SET status=? WHERE id=?').bind('blocked','IW-local-0001').run();
 assert.equal(result.meta.changes,1);
 assert.equal((await db.prepare('SELECT id FROM work_tickets').all()).results.length,3);
});

test('SQLite host refuses absent or non-private data and never creates a ticket database',async t=>{
 const f=await fixture(t),missing=join(f.dir,'absent.sqlite');
 assert.throws(()=>openBrainDatabase(missing),/private_database_required/);
 assert.equal(existsSync(missing),false);
 chmodSync(f.workDbPath,0o644);
 assert.throws(()=>openBrainDatabase(f.workDbPath),/private_database_required/);
 chmodSync(f.workDbPath,0o600);
 const before=readFileSync(f.workDbPath);
 await assert.rejects(createSqliteBrain({...f,ownerHash:'wrong'}),/owner_scope_required/);
 assert.deepEqual(readFileSync(f.workDbPath),before);
});

async function signer(t){
 const original=globalThis.fetch;
 const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk={...await crypto.subtle.exportKey('jwk',pair.publicKey),kid:'sqlite-runtime-fixture'};
 globalThis.fetch=async url=>{
  assert.equal(String(url),'https://token.actions.githubusercontent.com/.well-known/jwks','claim must not call Cloudflare');
  return Response.json({keys:[jwk]});
 };
 t.after(()=>{globalThis.fetch=original;});
 return async(runId='42',changes={})=>{
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url'),now=Math.floor(Date.now()/1000);
  const unsigned=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({iss:'https://token.actions.githubusercontent.com',aud:'infinity-brain-writer',repository:'www-infinity4/Moltnook',repository_id:'1188306316',workflow_ref:'www-infinity4/Moltnook/.github/workflows/moltnook-repository-engine.yml@refs/heads/main',ref:'refs/heads/main',event_name:'schedule',run_id:runId,run_attempt:'1',exp:now+300,nbf:now-1,...changes});
  return unsigned+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(unsigned))).toString('base64url');
 };
}
const request=(token,step='claim',body={})=>new Request('https://owner-host.test/runner/'+step,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(body)});

test('the original signed Brain claims local SQLite work and preserves fences across restart',async t=>{
 const f=await fixture(t),sign=await signer(t),token=await sign();
 let brain=await createSqliteBrain({...f,ownerHash:owner,writerEnabled:true});
 try{
  const denied=await brain.fetch(request('invalid'));
  assert.equal(denied.status,401);
  const wrong=await brain.fetch(request(await sign('40',{repository:'visitor/foreign'})));
  assert.equal(wrong.status,401);
  const [one,two]=await Promise.all([brain.fetch(request(token)),brain.fetch(request(token))]);
  assert.equal(one.status,200);assert.equal(two.status,200);
  const claimed=await one.json(),replayed=await two.json();
  assert.equal(claimed.lease.ticketId,'IW-local-0001');
  assert.equal(claimed.lease.jobId,'TASK-1');
  assert.equal(replayed.lease,null);
  assert.equal(replayed.idle.code,'runner_attempt_already_claimed');
  const key=claimed.lease.key,leaseId=claimed.lease.leaseId;
  await brain.close();
  brain=await createSqliteBrain({...f,ownerHash:owner,writerEnabled:true});
  const state=openPortableBrainState(f.statePath);
  assert.equal((await state.get(key)).leaseId,leaseId);
  assert.deepEqual(await state.get('fixture-retained-credential'),{ciphertext:'existing encrypted record'});
  await state.close();
  const after=await (await brain.fetch(request(token))).json();
  assert.equal(after.idle.code,'runner_attempt_already_claimed');
  const another=await (await brain.fetch(request(await sign('43')))).json();
  assert.equal(another.lease,null,'an active repository lease survives restart');
  const wrongFence=await brain.fetch(request(token,'event',{key,leaseId:'wrong',message:'Must be rejected'}));
  assert.equal(wrongFence.status,409);
  const result=await brain.fetch(request(token,'result',{key,leaseId,status:'blocked',message:'Synthetic fixture: model not connected; no source execution claimed.'}));
  assert.equal(result.status,200);
  await brain.close();brain=await createSqliteBrain({...f,ownerHash:owner,writerEnabled:true});
  const receipt=await (await brain.fetch(request(token,'quant-receipt',{key,leaseId}))).json();
  assert.equal(receipt.ok,true);assert.equal(receipt.status,'blocked');
  assert.equal(receipt.durableReadback,true);
  assert.equal(receipt.repository,'www-infinity4/QuantaPhi');
  const db=openBrainDatabase(f.workDbPath);
  assert.equal((await db.prepare('SELECT status FROM work_tickets WHERE id=?').bind('IW-local-0001').first()).status,'blocked');
  assert.equal((await db.prepare('SELECT status FROM work_tickets WHERE id=?').bind('IW-foreign-0001').first()).status,'ready');
  assert.equal((await db.prepare('SELECT status FROM work_tickets WHERE id=?').bind('IW-held-0001').first()).status,'ready');
  db.close();
 }finally{await brain.close();}
});

test('shared provider cooldown survives private SQLite restart and expires without fabricating recovery',async t=>{
 const f=await fixture(t),sign=await signer(t);let calls=0,refused=true,now=Date.now();
 t.mock.method(Date,'now',()=>now);
 const bindings={WRITER_AI:{async run(){calls++;if(refused)throw Error('AiError: 4006: you have used up your daily free allocation of 10,000 neurons');return {response:JSON.stringify({summary:'Fixture model retried after deadline',requirements:[],subtasks:[],files:[],acceptance:[],blockers:[],notes:[]})};}}};
 let brain=await createSqliteBrain({...f,ownerHash:owner,writerEnabled:true,bindings});
 try{
  const token=await sign('601'),claim=await (await brain.fetch(request(token))).json(),lease=claim.lease;
  const evidence={colorFindings:{},runtime:{baseSha:'c'.repeat(40)}},body={key:lease.key,leaseId:lease.leaseId,evidence};
  const failure=await brain.fetch(request(token,'plan',body));assert.equal(failure.status,429);const quota=await failure.json();assert.equal(quota.error,'provider_quota_exhausted');assert.equal(calls,1);
  assert.equal((await brain.fetch(request(token,'plan',{...body,leaseId:'wrong'}))).status,409,'quota cannot bypass lease authentication');
  await brain.close();
  const db=new DatabaseSync(f.workDbPath),job={id:'TASK-2',repository:'www-infinity4/Moltnook',agent:'greenbeans',executor:'repository-engine',instructions:'Repair the other fixture source.',acceptance:['Test it.'],dependencies:[],status:'queued'};
  db.prepare('INSERT INTO work_tickets VALUES(?,?,?,?,?,?,?)').run('IW-another-local',owner,JSON.stringify({kind:'robot-directions',color_jobs:[job]}),'Synthetic queued repair',now,'ready',now);db.close();
  brain=await createSqliteBrain({...f,ownerHash:owner,writerEnabled:true,bindings});
  const deferred=await brain.fetch(request(await sign('602')));assert.equal(deferred.status,429);assert.equal((await deferred.json()).retryAt,quota.retryAt);assert.equal(calls,1);
  const state=openPortableBrainState(f.statePath);assert.equal((await state.get('runner-provider-quota:cloudflare-workers-ai')).retryAt,quota.retryAt);assert.equal(await state.get('runner-claim:www-infinity4/Moltnook:602:1'),undefined);assert.ok(await state.get(lease.key));await state.close();
  const view=openBrainDatabase(f.workDbPath);assert.equal((await view.prepare('SELECT status FROM work_tickets WHERE id=?').bind('IW-another-local').first()).status,'ready');view.close();
  now=quota.retryAt+1;refused=false;
  const nextToken=await sign('603'),nextClaim=await brain.fetch(request(nextToken));assert.equal(nextClaim.status,200);const next=(await nextClaim.json()).lease;assert.ok(next);
  assert.equal(calls,1,'deadline expiry permits a retry but cannot stand in for inference');
  const answer=await brain.fetch(request(nextToken,'plan',{key:next.key,leaseId:next.leaseId,evidence}));assert.equal(answer.status,200);assert.equal((await answer.json()).summary,'Fixture model retried after deadline');assert.equal(calls,2);
 }finally{await brain.close();}
});

test('real loopback HTTP preserves existing listeners and requires signed runner identity',async t=>{
 const f=await fixture(t),sign=await signer(t),brain=await createSqliteBrain({...f,ownerHash:owner,writerEnabled:true});
 const occupied=createServer((req,res)=>res.end('existing service'));
 await new Promise(resolve=>occupied.listen(0,'127.0.0.1',resolve));
 try{
  await assert.rejects(brain.listen(0,'0.0.0.0'),/loopback_required/);
  await assert.rejects(brain.listen(occupied.address().port),error=>error.code==='EADDRINUSE');
  // Use the original network implementation: the signer mock only services
  // the Brain's JWKS request, not the real loopback HTTP transport.
  const {request:httpRequest}=await import('node:http');
  const get=(url,token)=>new Promise((resolve,reject)=>{
   const req=httpRequest(url,{method:token===undefined?'GET':'POST',headers:token===undefined?{}:{Authorization:'Bearer '+token,'Content-Type':'application/json'}},res=>{
    let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,body}));
   });req.on('error',reject);req.end(token===undefined?undefined:'{}');
  });
  assert.equal((await get('http://127.0.0.1:'+occupied.address().port)).body,'existing service');
  const url=await brain.listen();
  const health=await get(url+'/local/health');
  assert.equal(health.status,200);assert.equal(JSON.parse(health.body).storage,'private-sqlite');
  assert.equal(JSON.parse(health.body).modelConfigured,false);
  assert.equal((await get(url+'/runner/claim','invalid')).status,401);
  const response=await get(url+'/runner/claim',await sign('51'));
  assert.equal(response.status,200);assert.equal(JSON.parse(response.body).lease.ticketId,'IW-local-0001');
 }finally{await brain.close();await new Promise(resolve=>occupied.close(resolve));}
});

test('existing encrypted credentials cannot start without their original encryption key',async t=>{
 const f=await fixture(t),state=openPortableBrainState(f.statePath);
 await state.put('bubbles-github-credential-v1',{ciphertext:'preserve-me',iv:'fixture'});await state.close();
 await assert.rejects(createSqliteBrain({...f,ownerHash:owner}),/existing_credential_encryption_key_required/);
 const reopened=openPortableBrainState(f.statePath);
 assert.equal((await reopened.get('bubbles-github-credential-v1')).ciphertext,'preserve-me');await reopened.close();
});

test('local writer stays inactive until explicit cutover and blocks internal or unrelated routes',async t=>{
 const f=await fixture(t),sign=await signer(t),brain=await createSqliteBrain({...f,ownerHash:owner});
 try{
  const response=await brain.fetch(request(await sign()));
  assert.equal(response.status,503);
  assert.equal((await response.json()).error,'sqlite_writer_cutover_required');
  for(const path of ['/start','/owner/pair-create','/github','/tools/phone/command']){
   assert.equal((await brain.fetch(new Request('http://localhost'+path,{method:'POST',body:'{}'}))).status,404);
  }
  const state=openPortableBrainState(f.statePath);
  assert.equal((await state.list({prefix:'writer:'})).size,0);await state.close();
 }finally{await brain.close();}
});
