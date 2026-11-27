import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,chmodSync,existsSync,readdirSync,mkdirSync,symlinkSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {stageBrainImport,verifyBrainImport} from '../distributed-vault/brain-private-import.mjs';
import {openPortableBrainState} from '../distributed-vault/portable-brain-state.mjs';
import {githubEnvironment,connectGithubCredential} from '../workers/infinity-brain-clock/github-credential.mjs';

const owner='a'.repeat(64),sha='c'.repeat(40);
const hash=value=>createHash('sha256').update(value).digest('hex');
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'brain-import-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const workDbPath=join(root,'owner-work.sqlite'),exportPath=join(root,'owner-state.json'),destinationRoot=join(root,'staged');
 mkdirSync(destinationRoot,{mode:0o700});
 const db=new DatabaseSync(workDbPath);
 db.exec('CREATE TABLE work_tickets(id TEXT PRIMARY KEY,owner_hash TEXT,context_json TEXT,request TEXT,created_at INTEGER,updated_at INTEGER,status TEXT); CREATE TABLE retained_data(id INTEGER PRIMARY KEY,bytes BLOB); CREATE INDEX retained_lookup ON retained_data(id)');
 db.prepare('INSERT INTO work_tickets VALUES(?,?,?,?,?,?,?)').run('IW-existing-1',owner,'{"kind":"robot-directions","color_jobs":[]}','private fixture',Date.now(),Date.now(),'blocked');
 db.prepare('INSERT INTO work_tickets VALUES(?,?,?,?,?,?,?)').run('IW-foreign-1','b'.repeat(64),'{}','foreign fixture',Date.now(),Date.now(),'ready');
 db.prepare('INSERT INTO retained_data VALUES(?,?)').run(7,new Uint8Array([0,17,255]));db.close();chmodSync(workDbPath,0o600);
 const entries=[['owner-session:fixture',{expires:1234567890,tokenHash:'existing-expired-scope'}],['repository-lease:www-infinity4/quantaphi',{leaseId:'original-fence',leaseUntil:Date.now()+300000}],['runner-claim:www-infinity4/Moltnook:42:1','original-fence'],['job-quant-index',[{id:'retained-result',status:'blocked'}]]];
 const document={format:'infinity-brain-private-state/v1',ownerHash:owner,sourceSha:sha,snapshotId:'owner-offline-snapshot-1',complete:true,entryCount:entries.length,entriesSha256:hash(JSON.stringify(entries)),workSha256:hash(readFileSync(workDbPath)),entries};
 const save=()=>writeFileSync(exportPath,JSON.stringify(document),{mode:0o600});save();
 return {root,workDbPath,exportPath,destinationRoot,ownerHash:owner,document,save};
}

test('private import preserves every queue partition, arbitrary BLOB data, sessions, leases and receipts',async t=>{
 const f=fixture(t),beforeWork=readFileSync(f.workDbPath),beforeExport=readFileSync(f.exportPath);
 const result=await stageBrainImport(f);
 assert.equal(result.ok,true);assert.equal(result.productionVerified,false);assert.equal(result.sourceAuthorityVerified,false);assert.equal(result.writerEnabled,false);
 assert.deepEqual(readFileSync(result.workDbPath),beforeWork,'source SQLite is copied without schema or value rewriting');
 const state=openPortableBrainState(result.statePath);
 try{for(const [key,value] of f.document.entries)assert.deepEqual(await state.get(key),value);}finally{await state.close();}
 assert.deepEqual(readFileSync(f.workDbPath),beforeWork);assert.deepEqual(readFileSync(f.exportPath),beforeExport);
 const verified=await verifyBrainImport({directory:result.directory,ownerHash:owner});
 assert.equal(verified.verified,true);assert.equal(verified.stateRecords,4);
 assert.equal(verified.sourceFenceVerified,false,'local hashes are not proof that the cloud writer stopped');
 assert.doesNotMatch(JSON.stringify(result),/private fixture|original-fence|existing-expired-scope|owner-session|ownerHash/);
});

test('replayed and concurrent imports reuse one complete verified destination without changing it',async t=>{
 const f=fixture(t),results=await Promise.allSettled([stageBrainImport(f),stageBrainImport(f)]);
 const success=results.filter(x=>x.status==='fulfilled');assert.ok(success.length>=1);
 const result=success[0].value,before=readFileSync(result.statePath);
 const replay=await stageBrainImport(f);
 assert.equal(replay.directory,result.directory);assert.equal(replay.reused,true);
 assert.deepEqual(readFileSync(result.statePath),before);
 assert.equal(readdirSync(f.destinationRoot).length,1);
});

test('incomplete, corrupted, duplicate-key and cross-owner exports leave no accepted import',async t=>{
 for(const change of [
  d=>{d.complete=false;},d=>{d.entryCount++;},d=>{d.entriesSha256='0'.repeat(64);},
  d=>{d.ownerHash='b'.repeat(64);},d=>{d.workSha256='0'.repeat(64);},
  d=>{d.entries.push(d.entries[0]);d.entryCount++;d.entriesSha256=hash(JSON.stringify(d.entries));},
  d=>{d.sourceSha='unverified';}
 ]){
  const f=fixture(t);change(f.document);f.save();
  await assert.rejects(stageBrainImport(f));
  assert.deepEqual(readdirSync(f.destinationRoot),[]);
 }
 const badNumber=fixture(t);
 writeFileSync(badNumber.exportPath,readFileSync(badNumber.exportPath,'utf8').replace('"expires":1234567890','"expires":1e400'));
 await assert.rejects(stageBrainImport(badNumber));
 assert.deepEqual(readdirSync(badNumber.destinationRoot),[]);
});

test('uncheckpointed input and non-private or symlink sources are refused without overwriting files',async t=>{
 const f=fixture(t);
 writeFileSync(f.workDbPath+'-wal','pending journal',{mode:0o600});
 await assert.rejects(stageBrainImport(f),/offline_snapshot_required/);
 rmSync(f.workDbPath+'-wal');
 chmodSync(f.exportPath,0o644);await assert.rejects(stageBrainImport(f),/private/);chmodSync(f.exportPath,0o600);
 const linked=join(f.root,'state-link.json');symlinkSync(f.exportPath,linked);
 await assert.rejects(stageBrainImport({...f,exportPath:linked}),/private/);
 chmodSync(f.destinationRoot,0o755);await assert.rejects(stageBrainImport(f),/private/);
 assert.deepEqual(readdirSync(f.destinationRoot),[]);
});

test('changed staged data and missing completion marker cannot be reused or activated as a verified copy',async t=>{
 const f=fixture(t),first=await stageBrainImport(f);
 const db=new DatabaseSync(first.workDbPath);db.prepare('UPDATE retained_data SET bytes=?').run(new Uint8Array([1]));db.close();
 await assert.rejects(verifyBrainImport({directory:first.directory,ownerHash:owner}),/verification_failed/);
 await assert.rejects(stageBrainImport(f),/verification_failed/);
 assert.equal(existsSync(first.workDbPath),true,'changed existing files must survive refusal');
 const g=fixture(t),second=await stageBrainImport(g);rmSync(join(second.directory,'receipt.json'));
 await assert.rejects(stageBrainImport(g),/verification_failed/);
 assert.equal(existsSync(second.statePath),true);
});

test('a different complete snapshot moved into the expected directory is preserved and refused',async t=>{
 const f=fixture(t),original=JSON.stringify(f.document),first=await stageBrainImport(f);
 f.document.snapshotId='owner-offline-snapshot-2';f.document.entries[0][1].expires=999;
 f.document.entriesSha256=hash(JSON.stringify(f.document.entries));f.save();
 const second=await stageBrainImport(f),secondBytes=readFileSync(second.statePath);
 renameSync(first.directory,first.directory+'-retained');renameSync(second.directory,first.directory);
 writeFileSync(f.exportPath,original);
 await assert.rejects(stageBrainImport(f),/brain_import_verification_failed/);
 assert.deepEqual(readFileSync(join(first.directory,'state.sqlite')),secondBytes);
 assert.equal(existsSync(first.directory+'-retained'),true);
});

test('original encrypted credential decrypts after import with the same key and no new credentials',async t=>{
 const f=fixture(t),privateState=openPortableBrainState(join(f.root,'prior-state.sqlite'));
 const env={BOT_WORK_SECRET:'synthetic-original-encryption-key'},token='test-original-github-token-unchanged';
 await connectGithubCredential(env,privateState,token,async()=>Response.json({login:'www-infinity4'}));
 const encrypted=await privateState.get('bubbles-github-credential-v1');await privateState.close();
 f.document.entries.push(['bubbles-github-credential-v1',encrypted]);f.document.entryCount++;
 f.document.entriesSha256=hash(JSON.stringify(f.document.entries));f.save();
 const result=await stageBrainImport(f),state=openPortableBrainState(result.statePath);
 try{
  assert.deepEqual(await state.get('bubbles-github-credential-v1'),encrypted);
  assert.equal((await githubEnvironment(env,state)).GITHUB_TOKEN,token);
  assert.doesNotMatch(JSON.stringify(result),/test-original-github-token|synthetic-original-encryption-key/);
 }finally{await state.close();}
 const {createSqliteBrain}=await import('../distributed-vault/sqlite-brain-runtime.mjs');
 await assert.rejects(createSqliteBrain({...result,ownerHash:owner}),/existing_credential_encryption_key_required/);
 const brain=await createSqliteBrain({...result,ownerHash:owner,bindings:env});
 try{
  const health=await (await brain.fetch(new Request('http://localhost/local/health'))).json();
  assert.equal(health.ok,true);assert.equal(health.writerEnabled,false);assert.equal(health.productionVerified,false);
 }finally{await brain.close();}
});

test('malformed private JSON never exposes its content through a parse error',async t=>{
 const f=fixture(t);writeFileSync(f.exportPath,'{"private":"synthetic-must-not-appear" invalid');
 await assert.rejects(stageBrainImport(f),error=>{
  assert.equal(error.message,'brain_import_document_invalid');
  assert.doesNotMatch(error.stack,/synthetic-must-not-appear/);return true;
 });
});
