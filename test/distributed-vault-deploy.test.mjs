import test from 'node:test';
import './distributed-vault-brain-runtime.test.mjs';
import './distributed-vault-brain-import.test.mjs';
import './distributed-vault-brain-host.test.mjs';
import './distributed-vault-brain-mesh.test.mjs';
import './distributed-vault-brain-export.test.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../distributed-vault/deploy/'+name,import.meta.url),'utf8');
test('repository host systemd service keeps localhost-only and secret env file',()=>{
 const s=read('quantaphi-mesh.service');
 assert.match(s,/ExecStart=\/usr\/bin\/node .*distributed-vault\/mesh-runner\.mjs/);
 assert.match(s,/EnvironmentFile=\/etc\/quantaphi\/mesh\.env/);
 assert.match(s,/MESH_HOST=127\.0\.0\.1/);
 assert.match(s,/MESH_DB=\/var\/lib\/quantaphi-mesh\/mesh\.sqlite/);
 assert.match(s,/User=quantamesh/);
 for(const setting of ['NoNewPrivileges=true','ProtectSystem=strict','ProtectHome=true','UMask=0077','StateDirectory=quantaphi-mesh','Restart=on-failure'])
  assert.ok(s.includes(setting),setting);
 assert.doesNotMatch(s,/MESH_OWNER_TOKEN\s*=/);
 assert.doesNotMatch(s,/0\.0\.0\.0|cloudflare|api[_-]?key/i);
});
test('example HTTPS reverse proxy forwards only to loopback and needs real host',()=>{
 const cfg=read('Caddyfile.example');
 assert.match(cfg,/mesh\.example\.org/);
 assert.match(cfg,/reverse_proxy 127\.0\.0\.1:8789/);
 assert.doesNotMatch(cfg,/http:\/\/mesh\.example\.org/);
 assert.doesNotMatch(cfg,/cloudflare|tls_insecure_skip_verify|\*/i);
});
test('deployment runbook never claims repos provide always-on compute or D1 data migration complete',()=>{
 const cfg=read('README.md');
 assert.match(cfg,/systemd/i);
 assert.match(cfg,/D1.*remains.*authoritative/i);
 assert.match(cfg,/https/i);
 assert.match(cfg,/not.*production.*cutover/i);
 assert.match(cfg,/separate.*permanent.*host/i);
});


import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
function queueSnapshot(t){
 const dir=mkdtempSync(join(tmpdir(),'qp-portable-queue-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const dbPath=join(dir,'private.sqlite'),db=new DatabaseSync(dbPath);
 db.exec('CREATE TABLE work_tickets(id TEXT PRIMARY KEY,owner_hash TEXT,context_json TEXT,request TEXT,created_at INTEGER,status TEXT)');
 const add=db.prepare('INSERT INTO work_tickets VALUES(?,?,?,?,?,?)');
 for(let i=0;i<105;i++)add.run('job-'+i,'owner-a',JSON.stringify({kind:'robot-directions',color_jobs:[]}), 'private fixture',i,'ready');
 add.run('foreign','owner-b','{"kind":"robot-directions"}','other private fixture',999,'ready');
 add.run('complete','owner-a','{"kind":"robot-directions"}','complete',998,'complete');
 add.run('other-kind','owner-a','{"kind":"other"}','other kind',997,'ready');
 db.close();
 return {dir,dbPath};
}
test('portable queue reuses owner-scoped Brain selection across SQLite pages without network or writes',async t=>{
 const {readPortableQueue}=await import('../distributed-vault/portable-brain-queue.mjs');
 const {dbPath}=queueSnapshot(t);
 const before=readFileSync(dbPath);
 const q=await readPortableQueue({dbPath,ownerHash:'owner-a'});
 assert.equal(q.results.length,105);
 assert.equal(q.pagesRead,2);
 assert.equal(q.scanLimited,false);
 assert.equal(q.results[0].id,'job-104');
 assert.equal(q.results.at(-1).id,'job-0');
 const foreign=await readPortableQueue({dbPath,ownerHash:'owner-a',requestedTicketId:'foreign',order:'oldest'});
 assert.equal(foreign.results.length,105);
 assert.equal(foreign.results[0].id,'job-0');
 assert.ok(!foreign.results.some(r=>['foreign','complete','other-kind'].includes(r.id)));
 assert.deepEqual(readFileSync(dbPath),before);
});
test('portable queue refuses absent snapshots and missing owner scope without creating files',async t=>{
 const {readPortableQueue}=await import('../distributed-vault/portable-brain-queue.mjs');
 const {dir,dbPath}=queueSnapshot(t),missing=join(dir,'absent.sqlite');
 await assert.rejects(readPortableQueue({dbPath:missing,ownerHash:'owner-a'}));
 assert.equal(existsSync(missing),false);
 await assert.rejects(readPortableQueue({dbPath,ownerHash:''}),/scope/i);
});


test('portable Brain transaction serializes concurrent reservation attempts and survives restart',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {dir}=queueSnapshot(t),dbPath=join(dir,'brain-state.sqlite');
 let state=openPortableBrainState(dbPath);
 const reserve=async id=>state.transaction(async tx=>{
  if(await tx.get('runner-claim:fixture:1'))return false;
  await tx.put('writer:fixture',{leaseId:id});
  await Promise.resolve();
  await tx.put('repository-lease:fixture',{leaseId:id});
  await tx.put('runner-claim:fixture:1',id);
  return true;
 });
 try{
  assert.deepEqual(await Promise.all([reserve('first'),reserve('second')]),[true,false]);
  await state.close();
  state=openPortableBrainState(dbPath);
  assert.deepEqual(await state.get('writer:fixture'),{leaseId:'first'});
  assert.equal(await state.get('runner-claim:fixture:1'),'first');
  assert.deepEqual([...await state.list({prefix:'repository-lease:'})],[['repository-lease:fixture',{leaseId:'first'}]]);
 }finally{await state.close();}
});
test('portable Brain rolls back incomplete reservations and invalidates escaped transaction handles',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {dir}=queueSnapshot(t),state=openPortableBrainState(join(dir,'brain-state.sqlite'));
 let escaped;
 try{
  await state.put('writer:fixture',{leaseId:'prior'});
  await assert.rejects(state.transaction(async tx=>{
   escaped=tx;
   await tx.put('writer:fixture',{leaseId:'uncommitted'});
   await tx.put('runner-claim:fixture:1','uncommitted');
   throw Error('fixture rollback');
  }),/fixture rollback/);
  assert.deepEqual(await state.get('writer:fixture'),{leaseId:'prior'});
  assert.equal(await state.get('runner-claim:fixture:1'),undefined);
  await assert.rejects(async()=>escaped.put('runner-claim:fixture:1','escaped'),/transaction_closed/);
  await state.put('repository-lease:other%',{leaseId:'other'});
  await state.put('repository-lease:otherx',{leaseId:'different'});
  assert.equal((await state.list({prefix:'repository-lease:other%'})).size,1);
  await state.delete('writer:fixture');
  assert.equal(await state.get('writer:fixture'),undefined);
 }finally{await state.close();}
});


test('portable Brain competing database handles fail closed and can proceed after commit',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {dir}=queueSnapshot(t),dbPath=join(dir,'brain-state.sqlite');
 const first=openPortableBrainState(dbPath),second=openPortableBrainState(dbPath);
 try{
  await first.transaction(async tx=>{
   await tx.put('runner-claim:fixture:1','first');
   await assert.rejects(second.transaction(async other=>{
    await other.put('runner-claim:fixture:1','duplicate');
   }),/locked|busy/i);
  });
  assert.equal(await second.get('runner-claim:fixture:1'),'first');
  await second.transaction(async tx=>{await tx.put('runner-claim:fixture:2','second');});
  assert.equal(await first.get('runner-claim:fixture:2'),'second');
 }finally{await first.close();await second.close();}
});
test('portable Brain rejects a private database with an incompatible reservation schema',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {dir}=queueSnapshot(t),dbPath=join(dir,'wrong-state.sqlite');
 const {chmodSync}=await import('node:fs');
 const db=new DatabaseSync(dbPath);
 db.exec('CREATE TABLE portable_brain_state (key TEXT,value TEXT)');
 db.close();chmodSync(dbPath,0o600);
 const before=readFileSync(dbPath);
 assert.throws(()=>openPortableBrainState(dbPath),/incompatible_state_schema/);
 assert.deepEqual(readFileSync(dbPath),before);
});
test('portable Brain rejects a separate private work-ticket database without adding state tables',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {dbPath}=queueSnapshot(t);
 const {chmodSync}=await import('node:fs');chmodSync(dbPath,0o600);
 const before=readFileSync(dbPath);
 assert.throws(()=>openPortableBrainState(dbPath),/dedicated_state_database_required/);
 assert.deepEqual(readFileSync(dbPath),before);
});


test('portable ticket compare-and-swap commits reservation and ticket shadow together',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {dir}=queueSnapshot(t),dbPath=join(dir,'brain-state.sqlite');
 let state=openPortableBrainState(dbPath);
 const ticketKey='ticket-shadow:owner-a:fixture',before={context_json:'{"kind":"robot-directions"}',status:'ready'};
 const after={...before,status:'working'};
 try{
  await state.put(ticketKey,before);
  const reserve=()=>state.transaction(async tx=>{
   if(await tx.get('runner-claim:fixture:1'))return false;
   if(!await tx.compareAndSwap(ticketKey,before,after))return false;
   await tx.put('writer:fixture',{leaseId:'fixture-fence'});
   await tx.put('repository-lease:fixture',{leaseId:'fixture-fence'});
   await tx.put('runner-claim:fixture:1','fixture-fence');
   return true;
  });
  assert.deepEqual(await Promise.all([reserve(),reserve()]),[true,false]);
  await state.close();state=openPortableBrainState(dbPath);
  assert.deepEqual(await state.get(ticketKey),after);
  assert.equal(await state.get('runner-claim:fixture:1'),'fixture-fence');
  assert.equal(await state.transaction(tx=>tx.compareAndSwap(ticketKey,before,{status:'complete'})),false);
  assert.deepEqual(await state.get(ticketKey),after);
 }finally{await state.close();}
});
test('portable ticket compare-and-swap is transaction-only and rolls back with reservations',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {dir}=queueSnapshot(t),state=openPortableBrainState(join(dir,'brain-state.sqlite'));
 const key='ticket-shadow:owner-a:fixture',before={status:'ready'};
 let escaped;
 try{
  assert.equal(state.compareAndSwap,undefined);
  await state.put(key,before);
  await assert.rejects(state.transaction(async tx=>{
   escaped=tx;
   assert.equal(await tx.compareAndSwap(key,before,{status:'working'}),true);
   await tx.put('writer:fixture',{leaseId:'uncommitted'});
   throw Error('fixture aborted');
  }),/fixture aborted/);
  assert.deepEqual(await state.get(key),before);
  assert.equal(await state.get('writer:fixture'),undefined);
  await assert.rejects(escaped.compareAndSwap(key,before,{status:'complete'}),/transaction_closed/);
  await state.transaction(async tx=>{
   assert.equal(await tx.compareAndSwap('absent',null,1),false);
   assert.equal(await tx.compareAndSwap('absent',undefined,1),true);
   assert.equal(await tx.compareAndSwap('absent',undefined,2),false);
  });
  assert.equal(await state.get('absent'),1);
 }finally{await state.close();}
});


const shadowTicket=(now,overrides={})=>({synthetic:true,id:'fixture-ticket',owner_hash:'fixture-owner',created_at:now,status:'ready',context:{kind:'robot-directions',color_jobs:[{id:'TASK-1',repository:'www-infinity4/QuantaPhi',agent:'greenbeans',executor:'repository-engine',status:'queued',instructions:'Repair synthetic fixture',dependencies:[],...overrides}]}});
test('portable rehearsal admits a scoped job and atomically fences duplicate attempts after restart',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {rehearsePortableClaim}=await import('../distributed-vault/portable-brain-claim.mjs');
 const {dir}=queueSnapshot(t),path=join(dir,'brain-state.sqlite'),now=Date.now();
 let state=openPortableBrainState(path);
 const key='rehearsal:ticket:fixture-owner:fixture-ticket';
 const input={ownerHash:'fixture-owner',ticketId:'fixture-ticket',jobId:'TASK-1',runId:'123',runAttempt:1,now};
 try{
  await state.put(key,shadowTicket(now));
  const results=await Promise.all([rehearsePortableClaim(state,input),rehearsePortableClaim(state,input)]);
  assert.equal(results[0].reserved,true);assert.equal(results[0].executionAuthorized,false);
  assert.equal(results[1].reason,'runner_attempt_already_claimed');
  await state.close();state=openPortableBrainState(path);
  assert.equal((await state.get(key)).context.color_jobs[0].status,'working');
  assert.equal((await rehearsePortableClaim(state,{...input,runId:'124'})).reserved,false);
  assert.equal((await state.list({prefix:'rehearsal:repository-lease:'})).size,1);
 }finally{await state.close();}
});
test('portable rehearsal preserves dependency and owner security holds and rejects foreign scope',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {rehearsePortableClaim}=await import('../distributed-vault/portable-brain-claim.mjs');
 const {dir}=queueSnapshot(t),state=openPortableBrainState(join(dir,'brain-state.sqlite')),now=Date.now();
 const key='rehearsal:ticket:fixture-owner:fixture-ticket';
 const input={ownerHash:'fixture-owner',ticketId:'fixture-ticket',jobId:'TASK-1',runId:'123',runAttempt:1,now};
 try{
  const pending=shadowTicket(now,{dependencies:['TASK-0']});
  pending.context.color_jobs.unshift({id:'TASK-0',status:'committed_unverified'});
  await state.put(key,pending);
  assert.equal((await rehearsePortableClaim(state,input)).reason,'dependency_pending');
  await state.put(key,shadowTicket(now,{progress:{blocker:'security_hold'}}));
  assert.equal((await rehearsePortableClaim(state,input)).reason,'owner_decision_required');
  assert.equal((await rehearsePortableClaim(state,{...input,ownerHash:'other-owner'})).reserved,false);
  await state.put(key,{...shadowTicket(now),synthetic:false});
  assert.equal((await rehearsePortableClaim(state,input)).reserved,false);
  assert.equal((await state.list({prefix:'rehearsal:repository-lease:'})).size,0);
 }finally{await state.close();}
});


test('portable rehearsal records one fenced synthetic result and releases only its own lock after restart',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {rehearsePortableClaim,recordPortableRehearsalResult}=await import('../distributed-vault/portable-brain-claim.mjs');
 const {dir}=queueSnapshot(t),path=join(dir,'brain-state.sqlite'),now=Date.now();
 let state=openPortableBrainState(path);
 const key='rehearsal:ticket:fixture-owner:fixture-ticket';
 const input={ownerHash:'fixture-owner',ticketId:'fixture-ticket',jobId:'TASK-1',runId:'123',runAttempt:1,now};
 try{
  await state.put(key,shadowTicket(now));
  const {reservation}=await rehearsePortableClaim(state,input);
  const result={...input,now:now+100,leaseId:reservation.leaseId,outcome:'fixture_passed'};
  assert.equal((await recordPortableRehearsalResult(state,{...result,leaseId:'wrong'})).recorded,false);
  assert.equal((await state.get(key)).context.color_jobs[0].status,'working');
  await state.close();state=openPortableBrainState(path);
  const accepted=await recordPortableRehearsalResult(state,result);
  assert.equal(accepted.recorded,true);assert.equal(accepted.executionVerified,false);
  assert.equal(accepted.productionVerified,false);
  assert.equal((await state.get(key)).context.color_jobs[0].status,'blocked');
  assert.equal((await state.list({prefix:'rehearsal:repository-lease:'})).size,0);
  const replay=await recordPortableRehearsalResult(state,result);
  assert.equal(replay.recorded,false);
  assert.equal(replay.reason,'fixture_result_already_recorded');
  assert.equal((await state.list({prefix:'rehearsal:result:'})).size,1);
  assert.equal((await rehearsePortableClaim(state,input)).reason,'runner_attempt_already_claimed');
 }finally{await state.close();}
});
test('portable rehearsal rejects expired, foreign, changed-ticket and replaced-lock results',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {rehearsePortableClaim,recordPortableRehearsalResult}=await import('../distributed-vault/portable-brain-claim.mjs');
 const {dir}=queueSnapshot(t),state=openPortableBrainState(join(dir,'brain-state.sqlite')),now=Date.now();
 const key='rehearsal:ticket:fixture-owner:fixture-ticket',lock='rehearsal:repository-lease:www-infinity4/quantaphi';
 const input={ownerHash:'fixture-owner',ticketId:'fixture-ticket',jobId:'TASK-1',runId:'123',runAttempt:1,now};
 try{
  await state.put(key,shadowTicket(now));
  const {reservation}=await rehearsePortableClaim(state,input);
  const result={...input,now:now+100,leaseId:reservation.leaseId,outcome:'fixture_failed'};
  assert.equal((await recordPortableRehearsalResult(state,{...result,now:reservation.leaseUntil})).recorded,false);
  assert.equal((await recordPortableRehearsalResult(state,{...result,ownerHash:'fixture-other'})).recorded,false);
  const original=await state.get(key),changed=structuredClone(original);
  changed.context.color_jobs[0].instructions='Changed after reservation';
  await state.put(key,changed);
  assert.equal((await recordPortableRehearsalResult(state,result)).recorded,false);
  await state.put(key,original);
  await state.put(lock,{...reservation,leaseId:'replacement'});
  assert.equal((await recordPortableRehearsalResult(state,result)).recorded,false);
  assert.equal((await state.get(lock)).leaseId,'replacement');
  assert.equal((await state.list({prefix:'rehearsal:result:'})).size,0);
  assert.equal((await state.get(key)).context.color_jobs[0].status,'working');
 }finally{await state.close();}
});


test('owner host check runs actual mesh HTTP and restart roundtrip without production credentials',async ()=>{
 const {execFileSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const output=execFileSync(process.execPath,[fileURLToPath(new URL('../distributed-vault/mesh-host-check.mjs',import.meta.url))],{encoding:'utf8',timeout:25000,env:{...process.env,MESH_OWNER_TOKEN:'not-a-real-token',MESH_DB:'/nonexistent/production-do-not-use.sqlite'}});
 const receipt=JSON.parse(output);
 assert.deepEqual(receipt,{ok:true,scope:'local-synthetic-host-check',service:'infinity-mesh-local-v1',anonymousDenied:true,encryptedRoundtrip:true,restartVerified:true,productionVerified:false});
 assert.doesNotMatch(output,/not-a-real-token|production-do-not-use/);
});


test('portable Brain rejects unrelated SQLite-prefixed objects without touching private database',async t=>{
 const {openPortableBrainState}=await import('../distributed-vault/portable-brain-state.mjs');
 const {dir}=queueSnapshot(t),dbPath=join(dir,'unrelated-state.sqlite');
 const {chmodSync}=await import('node:fs');
 const db=new DatabaseSync(dbPath);
 db.exec('CREATE TABLE sqliteXnotes (note TEXT); INSERT INTO sqliteXnotes VALUES (\'private fixture\')');
 db.close();chmodSync(dbPath,0o600);
 const before=readFileSync(dbPath);
 let opened;
 try{assert.throws(()=>{opened=openPortableBrainState(dbPath);},/dedicated_state_database_required/);}
 finally{await opened?.close();}
 assert.deepEqual(readFileSync(dbPath),before);
});


test('owner local inference probe sends only a synthetic prompt to fixed loopback and verifies generated text',async()=>{
 const {probeLocalInference}=await import('../distributed-vault/local-inference-probe.mjs');
 const calls=[];
 const result=await probeLocalInference({model:'fixture-model:1',fetcher:async(url,opts)=>{
  calls.push({url,opts});
  return new Response(JSON.stringify({model:'fixture-model:1',done:true,message:{role:'assistant',content:'4'},eval_count:1}));
 }});
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'http://127.0.0.1:11434/api/chat');
 assert.equal(calls[0].opts.redirect,'error');
 assert.deepEqual(JSON.parse(calls[0].opts.body).messages,[{role:'user',content:'What is 2 + 2? Reply only with the digit.'}]);
 assert.equal(result.ok,true);
 assert.equal(result.productionVerified,false);
 assert.equal(result.executionAuthorized,false);
});

test('owner local inference probe rejects missing, malformed, unfinished, mismatched or nonlocal model responses',async()=>{
 const {probeLocalInference}=await import('../distributed-vault/local-inference-probe.mjs');
 let calls=0;
 await assert.rejects(probeLocalInference({model:'https://example.org/model',fetcher:async()=>{calls++;}}));
 assert.equal(calls,0);
 for(const payload of [{model:'fixture-model:1',done:false,message:{role:'assistant',content:'4'},eval_count:1},
  {model:'other',done:true,message:{role:'assistant',content:'4'},eval_count:1},
  {model:'fixture-model:1',done:true,message:{role:'assistant',content:'4'},eval_count:0},
  {model:'fixture-model:1',done:true,message:{role:'assistant',content:'not 4'},eval_count:1}]){
  await assert.rejects(probeLocalInference({model:'fixture-model:1',fetcher:async()=>new Response(JSON.stringify(payload))}));
 }
 await assert.rejects(probeLocalInference({model:'fixture-model:1',fetcher:async()=>new Response('offline',{status:503})}));
});


test('owner-host local chat uses only loopback, bounded text and no tool or execution claims',async()=>{
 const {localChat}=await import('../distributed-vault/local-inference-probe.mjs');
 let calls=0;
 const reply=await localChat({model:'fixture-model:1',prompt:'Explain gravity.',fetcher:async(url,opts)=>{
  calls++;
  assert.equal(url,'http://127.0.0.1:11434/api/chat');
  assert.equal(opts.redirect,'error');
  assert.equal(opts.headers.Authorization,undefined);
  const body=JSON.parse(opts.body);
  assert.equal(body.messages.at(-1).content,'Explain gravity.');
  assert.equal(body.stream,false);
  assert.equal(body.tools,undefined);
  assert.equal(body.options.num_predict,512);
  return Response.json({model:'fixture-model:1',done:true,message:{role:'assistant',content:'Gravity attracts masses.'},eval_count:5});
 }});
 assert.equal(calls,1);
 assert.equal(reply.reply,'Gravity attracts masses.');
 assert.equal(reply.executionAuthorized,false);
 assert.equal(reply.productionVerified,false);
 assert.equal(reply.offlineRuntimeVerified,false);
});

test('owner-host local chat refuses remote model names, excessive input, tool calls and oversized output',async()=>{
 const {localChat}=await import('../distributed-vault/local-inference-probe.mjs');
 const never=async()=>assert.fail('unexpected request');
 await assert.rejects(localChat({model:'remote-cloud:1',prompt:'Hello',fetcher:never}));
 await assert.rejects(localChat({model:'fixture-model:1',prompt:'x'.repeat(16385),fetcher:never}));
 const options={model:'fixture-model:1',prompt:'Hello'};
 await assert.rejects(localChat({...options,fetcher:async()=>Response.json({model:options.model,done:true,eval_count:4,message:{role:'assistant',content:'Hello',tool_calls:[{function:{name:'anything'}}]}})}),/local_model_response_unverified/);
 await assert.rejects(localChat({...options,fetcher:async()=>new Response('x'.repeat(262145))}),/local_model_response_too_large/);
 await assert.rejects(localChat({...options,fetcher:async()=>new Response('Unavailable',{status:503})}),/local_model_unavailable/);
});
import './distributed-vault-brain-admission.test.mjs';
