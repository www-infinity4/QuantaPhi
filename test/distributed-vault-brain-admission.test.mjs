import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {register} from 'node:module';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openPortableBrainState} from '../distributed-vault/portable-brain-state.mjs';
import {requestBrainAdmission} from '../distributed-vault/brain-private-export.mjs';
import {createPrivateBrainStateExport} from '../workers/infinity-brain-clock/private-state-export.mjs';

register('../distributed-vault/sqlite-brain-loader.mjs',import.meta.url);
const {default:worker,BrainClock}=await import('../workers/infinity-brain-clock/worker.js');
const token='admission-master-fixture',owner=createHash('sha256').update(token).digest('hex');
const key='brain-migration-admission-v1',labels={migrationId:'synthetic-drain-1',sourceSha:'c'.repeat(40)};
const endpoint='https://infinity-brain-clock.marvaseater.workers.dev/work/migration/admission/';
async function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'brain-admission-')),path=join(root,'state.sqlite');let state=openPortableBrainState(path);
 t.after(async()=>{await state.close();rmSync(root,{recursive:true,force:true});});
 const env={WRITER_OWNER_HASH:owner,BRAIN_MIGRATION_CONTROL_ENABLED:'1'},ctx={storage:state,blockConcurrencyWhile:fn=>fn()};
 let clock=new BrainClock(ctx,env),forwards=0;
 env.CLOCK={idFromName:()=>1,get:()=>({fetch:(url,init)=>{forwards++;return clock.fetch(new Request(url,init));}})};
 const call=(action,body=labels,auth=token,extra={})=>worker.fetch(new Request(endpoint+action,{method:'POST',headers:{Authorization:'Bearer '+auth,'Content-Type':'application/json',...extra},body:JSON.stringify(body)}),env);
 const run=(action,body={})=>clock.fetch(new Request('https://clock.internal/'+action,{method:'POST',body:JSON.stringify({runId:'42',runnerRepository:'www-infinity4/Moltnook',...body})}));
 return {env,ctx,call,run,state,clock:()=>clock,forwards:()=>forwards,restart:async()=>{await state.close();state=openPortableBrainState(path);ctx.storage=state;clock=new BrainClock(ctx,env);return state;}};
}
test('admission controls require their own opt-in and original master proof before private state access',async t=>{
 const f=await fixture(t);
 for(const auth of ['', 'rb_'+'a'.repeat(64),'rd_'+'b'.repeat(64),'header.payload.signature'])assert.equal((await f.call('begin',labels,auth)).status,401);
 assert.equal((await f.call('begin',labels,token,{Origin:'https://evil.example'})).status,403);assert.equal(f.forwards(),0);
 delete f.env.BRAIN_MIGRATION_CONTROL_ENABLED;f.env.BRAIN_PRIVATE_EXPORT_ENABLED='1';
 assert.equal((await f.call('begin')).status,404);assert.equal(f.forwards(),0);
 f.env.BRAIN_MIGRATION_CONTROL_ENABLED='1';
 for(const body of [{...labels,ownerHash:owner},{...labels,sourceSha:'bad'},{...labels,migrationId:'../override'}])assert.equal((await f.call('begin',body)).status,400);
 assert.equal(f.forwards(),0);
 const response=await f.call('begin');assert.equal(response.status,200);assert.match(response.headers.get('Cache-Control'),/private.*no-store/);
 const result=await response.json();assert.equal(result.phase,'draining');assert.equal(result.claimsBlocked,true);assert.equal(result.sourceFenceVerified,false);assert.equal(result.sourceWritesFenced,false);assert.equal(result.targetActivationAllowed,false);
 assert.equal((await f.call('activate')).status,404);
});
test('a drain survives restart and flag removal, blocks before queue/credential calls and preserves every fence',async t=>{
 const f=await fixture(t);await f.state.put('runner-claim:retained','original-fence');await f.state.put('requested-next-job',{ticketId:'keep-this-selection'});
 assert.equal((await f.call('begin')).status,200);const original=await f.state.get(key),state=await f.restart();delete f.env.BRAIN_MIGRATION_CONTROL_ENABLED;
 f.env.WORK_DB={prepare:()=>assert.fail('drained admission must not read or mutate the work queue')};
 f.env.WRITER_AI={run:()=>assert.fail('drained alarm must not infer')};
 for(const action of ['runner/claim','run-next','start']){const response=await f.run(action);assert.equal(response.status,503);assert.equal((await response.json()).error,'migration_admission_blocked');}
 assert.equal((await f.clock().dispatchRunner()).error,'migration_admission_blocked');
 await f.clock().alarm();assert.equal(f.clock().running,false);
 assert.deepEqual(await state.get(key),original);assert.equal(await state.get('runner-claim:retained'),'original-fence');assert.equal((await state.get('requested-next-job')).ticketId,'keep-this-selection');assert.equal(await state.get('writerHeartbeat'),undefined);
});
test('begin/cancel are scoped and replay-safe, retain history and never renew grants or enable a target',async t=>{
 const f=await fixture(t);const first=await (await f.call('begin')).json();
 assert.equal((await (await f.call('begin')).json()).startedAt,first.startedAt);
 assert.equal((await f.call('begin',{...labels,migrationId:'other'})).status,409);
 assert.equal((await f.call('cancel',{...labels,sourceSha:'d'.repeat(40)})).status,409);
 const cancel=await (await f.call('cancel')).json();assert.equal(cancel.phase,'cancelled');assert.equal(cancel.claimsBlocked,false);assert.equal(cancel.targetActivationAllowed,false);
 assert.equal((await (await f.call('cancel')).json()).cancelledAt,cancel.cancelledAt);
 assert.equal((await f.call('begin')).status,409,'a cancelled request cannot replay into a new active drain');
 assert.equal((await f.call('begin',{...labels,migrationId:'next'})).status,200);
 assert.equal((await f.state.get('brain-migration-admission-history:synthetic-drain-1')).phase,'cancelled');
 assert.equal((await f.call('cancel')).status,409,'old cancellation cannot release a newer drain');
});
test('status distinguishes active, expired unresolved, publication and malformed records without private records',async t=>{
 const f=await fixture(t),now=Date.now();
 await f.state.put('writer:active',{leaseId:'private-active-id',leaseUntil:now+60000,status:'claimed'});
 await f.state.put('writer:expired',{leaseId:'private-expired-id',leaseUntil:now-1,status:'claimed'});
 await f.state.put('writer:publication',{leaseId:'private-pending-id',leaseUntil:0,status:'blocked',pendingPublication:{private:'payload'}});
 await f.state.put('writer:settled',{leaseId:'settled',leaseUntil:0,status:'blocked'});
 await f.state.put('repository-lease:private-repository',{leaseUntil:0,status:'direct_bubbles'});
 await f.state.put('writer:malformed',null);
 const result=await (await f.call('begin')).json();assert.equal(result.inventory.complete,true);
 assert.equal(result.inventory.writer.active,1);assert.equal(result.inventory.writer.expiredUnresolved,1);assert.equal(result.inventory.writer.pendingPublication,1);assert.equal(result.inventory.writer.malformed,1);assert.equal(result.inventory.repository.expiredUnresolved,1);
 assert.doesNotMatch(JSON.stringify(result),/private-active-id|private-expired-id|private-pending-id|private-repository|payload/);
 assert.equal(result.sourceFenceVerified,false);assert.equal(result.targetActivationAllowed,false);
 assert.equal((await f.state.get('writer:expired')).leaseUntil,now-1,'status cannot expire or discard unresolved work');
});
test('an incomplete inventory and running alarm never become a source fence or activation receipt',async t=>{
 const f=await fixture(t);await f.state.transaction(async tx=>{for(let i=0;i<1025;i++)await tx.put('writer:'+String(i).padStart(4,'0'),{status:'blocked',leaseUntil:0});});
 f.clock().running=true;const result=await (await f.call('begin')).json();
 assert.equal(result.inventory.complete,false);assert.equal(result.alarmInFlight,true);assert.equal(result.claimsBlocked,true);assert.equal(result.sourceWritesFenced,false);assert.equal(result.targetActivationAllowed,false);
});
test('inventory pagination preserves native UTF-8 key order including supplementary characters',async t=>{
 const f=await fixture(t);for(let i=0;i<31;i++)await f.state.put('writer:'+i,{status:'blocked',leaseUntil:0});
 for(const suffix of ['\uE000','\u{10000}'])await f.state.put('writer:'+suffix,{status:'blocked',leaseUntil:0});
 const result=await (await f.call('begin')).json();assert.equal(result.inventory.complete,true);assert.equal(result.inventory.writer.examined,33);
 assert.equal((await f.call('status')).status,200);assert.equal((await f.call('cancel')).status,200);
});
test('unavailable inventory cannot stop explicit cancellation and never appears as zero unresolved work',async t=>{
 const f=await fixture(t);await f.call('begin');const original=f.ctx.storage;
 f.ctx.storage={...original,transaction:fn=>original.transaction(tx=>fn({...tx,list:()=>{throw Error('private-backend-detail');}}))};
 const response=await f.call('cancel'),result=await response.json();assert.equal(response.status,200);assert.equal(result.phase,'cancelled');
 assert.deepEqual(result.inventory,{complete:false,writer:null,repository:null});assert.equal((await f.state.get(key)).phase,'cancelled');
 assert.doesNotMatch(JSON.stringify(result),/private-backend-detail/);assert.equal((await f.call('status')).status,200);
 f.ctx.storage={...original,transaction:()=>{throw Error('private-control-failure');}};
 assert.equal((await f.call('begin',{...labels,migrationId:'other'})).status,503,'control failures remain failures');
});
test('malformed and cross-owner drain state fails closed and cannot be silently cancelled',async t=>{
 const f=await fixture(t);
 for(const marker of [null,{}, {...labels,version:1,ownerHash:'b'.repeat(64),phase:'cancelled',startedAt:Date.now(),cancelledAt:Date.now()}]){
  await f.state.put(key,marker);assert.equal((await f.run('runner/claim')).status,503);assert.equal((await f.call('cancel')).status,503);
 }
});
test('a drain racing a claim is rechecked in the reservation transaction before any new fence or D1 write',async t=>{
 const f=await fixture(t),job={id:'TASK-1',repository:'www-infinity4/QuantaPhi',instructions:'Repair source',acceptance:['Regression passes'],status:'queued',dependencies:[]};
 const ticket={id:'IW-20261127-12345678',owner_hash:owner,request:'Repair source',created_at:Date.now(),updated_at:Date.now(),context_json:JSON.stringify({kind:'robot-directions',color_jobs:[job]})};
 f.env.WORK_DB={prepare:sql=>({bind(){return this;},all:async()=>{assert.match(sql,/SELECT/);return {results:[ticket]};},run:()=>assert.fail('racing drain must stop D1 reservation')})};
 const original=f.ctx.storage;let transactions=0;
 f.ctx.storage={...original,transaction:async fn=>{transactions++;await original.put(key,{version:1,...labels,ownerHash:owner,phase:'draining',startedAt:Date.now()});return original.transaction(fn);}};
 const response=await f.run('runner/claim');assert.equal(response.status,503);assert.equal((await response.json()).error,'migration_admission_blocked');assert.equal(transactions,1);
 assert.equal((await original.list({prefix:'runner-claim:'})).size,0);assert.equal((await original.list({prefix:'writer:'})).size,0);assert.equal((await original.list({prefix:'repository-lease:'})).size,0);
});
test('existing active lease heartbeat and result receipts still pass their original fences during drain',async t=>{
 const f=await fixture(t),lease={key:'writer:receipt-fixture',leaseId:'original-lease',runId:'42',runAttempt:1,engine:true,repository:'www-infinity4/QuantaPhi',ticketId:'IW-20261127-12345678',jobId:'TASK-1',revision:'a'.repeat(64),leaseUntil:Date.now()+60000,status:'claimed',job:{instructions:'Repair source',acceptance:['passes']}};
 await f.state.put(lease.key,lease);await f.call('begin');
 f.clock().emit=async()=>{};f.clock().projectRunnerResult=async()=>{};
 const body={key:lease.key,leaseId:lease.leaseId};
 assert.equal((await f.run('runner/event',{...body,message:'synthetic receipt'})).status,200);
 assert.equal((await f.run('runner/event',{...body,leaseId:'wrong-fence'})).status,409);
 const result=await f.run('runner/result',{...body,status:'blocked',summary:'Synthetic blocked receipt'});assert.equal(result.status,200);
 assert.equal((await f.state.get(lease.key)).status,'blocked');assert.equal((await f.state.get(lease.key)).leaseUntil,0);assert.equal((await f.state.get(key)).phase,'draining');
});
test('exporting a drain retains it on another SQLite state and no feature flag or writer switch releases it',async t=>{
 const f=await fixture(t);await f.call('begin');
 const captured=await createPrivateBrainStateExport(f.state,{ownerHash:owner,sourceSha:labels.sourceSha,snapshotId:'admission-copy',workSha256:'a'.repeat(64)});
 const target=await fixture(t);await target.state.transaction(async tx=>{for(const [name,value] of captured.document.entries)await tx.put(name,value);});
 target.env.BRAIN_MIGRATION_CONTROL_ENABLED='0';target.env.BRAIN_SQLITE_WRITER_ENABLED='1';
 assert.equal((await target.run('runner/claim')).status,503);
 assert.equal((await target.state.get(key)).migrationId,labels.migrationId);
});
test('private admission client pins the original authority and rejects malformed, redirected and false cutover reports',async t=>{
 const f=await fixture(t),options={...labels,ownerToken:token};let calls=0;
 const fetcher=async(url,init)=>{calls++;assert.equal(url,endpoint+'begin');assert.equal(init.redirect,'error');assert.equal(init.headers.Authorization,'Bearer '+token);return worker.fetch(new Request(url,init),f.env);};
 const good=await requestBrainAdmission({...options,action:'begin',fetcher});assert.equal(good.claimsBlocked,true);assert.equal(calls,1);
 const headers={'Content-Type':'application/json','Cache-Control':'private, no-store'};
 for(const response of [()=>Response.json({...good,sourceFenceVerified:true},{headers}),()=>Response.json({...good,targetActivationAllowed:true},{headers}),()=>Response.json({...good,private:'unexpected'},{headers}),()=>Response.json({...good,migrationId:'wrong'},{headers}),()=>new Response('',{status:302,headers:{...headers,Location:'https://evil.example'}}),()=>new Response('x'.repeat(16385),{headers}),()=>Response.json(good)])
  await assert.rejects(requestBrainAdmission({...options,action:'status',fetcher:async()=>response()}),/brain_migration_admission_blocked/);
 await assert.rejects(requestBrainAdmission({...options,action:'activate',fetcher:()=>assert.fail('unknown action must not send a credential')}));
 const cancelled={...good,phase:'cancelled',claimsBlocked:false,cancelledAt:good.startedAt};
 await assert.rejects(requestBrainAdmission({...options,action:'begin',fetcher:async()=>Response.json(cancelled,{headers})}));
 await assert.rejects(requestBrainAdmission({...options,action:'cancel',fetcher:async()=>Response.json(good,{headers})}));
 const unknown={...cancelled,inventory:{complete:false,writer:null,repository:null}};
 assert.equal((await requestBrainAdmission({...options,action:'cancel',fetcher:async()=>Response.json(unknown,{headers})})).inventory.writer,null);
});
