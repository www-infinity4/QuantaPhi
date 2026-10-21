import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ownerClockCommand,runDueOwnerClock,nextOccurrence,scheduleTime} from '../workers/infinity-brain-clock/owner-task-clock.mjs';
import {parseClockIntent,clockConversation} from '../bubbles-cloud-clock.mjs';
const now=Date.parse('2026-10-21T12:00:00Z'),owner='a'.repeat(64),ticketId='IW-20261021-ABCD1234',jobId='TASK-1';
function harness({ticketStatus='ready',jobStatus='queued',ticketOwner=true}={}){
 const mem=new Map(),queries=[];
 const storage={get:async k=>mem.get(k),put:async(k,v)=>mem.set(k,structuredClone(v))};
 const db={prepare(sql){return {bind(...xs){queries.push(xs);return this;},async first(){return ticketOwner?{id:ticketId,repository:'www-infinity4/RecordB',status:ticketStatus,
  context_json:JSON.stringify({kind:'robot-directions',color_jobs:[{id:jobId,repository:'www-infinity4/RecordB',status:jobStatus}]})}:null;}}}};
 return {storage,db,mem,queries};
}
const create={action:'create',ticketId,jobId,repeat:'once',startAt:'2026-10-21T12:30:00Z'};
test('Cloudflare clock requires offset-aware future time and a real owner-approved ticket',async()=>{
 assert.equal(scheduleTime('2026-10-21T12:30:00Z',now),now+30*60000);
 assert.throws(()=>scheduleTime('2026-10-21T12:30',now),/offset_required/);
 assert.throws(()=>scheduleTime('2026-10-21T12:01:00Z',now),/out_of_range/);
 const f=harness();
 const result=await ownerClockCommand(f.storage,f.db,owner,create,now);
 assert.equal(result.result.ok,true);
 assert.match(result.result.task.id,/^clock_[0-9a-f-]{36}$/);
 assert.equal(result.result.task.repository,'www-infinity4/RecordB');
 assert.equal(result.result.executionVerified,false);
 assert.deepEqual(f.queries[0],[owner,ticketId]);
 const duplicate=await ownerClockCommand(f.storage,f.db,owner,create,now);
 assert.equal(duplicate.result.error,'job_schedule_already_exists');
 assert.equal((await ownerClockCommand(f.storage,f.db,owner,{action:'list'},now)).result.tasks.length,1);
 const wrong=await ownerClockCommand(f.storage,harness({ticketOwner:false}).db,owner,{...create,jobId:'TASK-2'},now);
 assert.equal(wrong.result.error,'owner_ticket_not_found');
 const denied=await ownerClockCommand(f.storage,f.db,'not an owner',create,now);
 assert.equal(denied.result.error,'clock_owner_partition_unavailable');
 const finished=await ownerClockCommand(f.storage,harness({jobStatus:'deployed_verified'}).db,owner,
  {...create,jobId:'TASK-3'},now);
 assert.equal(finished.result.error,'authorized_robot_job_required');
});
test('one-shot alarm executes once, with receipts that NEVER imply verified code or deployment',async()=>{
 const f=harness();
 const result=await ownerClockCommand(f.storage,f.db,owner,create,now);
 const id=result.result.task.id,requests=[];
 const tick=()=>runDueOwnerClock(f.storage,{now:now+31*60000,dispatch:async arg=>{
  requests.push(arg);return {ok:true,status:'queued_for_runner',reason:'signed dispatch accepted'}
 }});
 const first=await tick();
 assert.equal(first.status,'queued_for_runner');
 assert.equal(first.executionVerified,false);
 assert.deepEqual(requests,[{ticketId,jobId}]);
 assert.equal((await tick()).status,'no_due_owner_schedules');
 const shown=(await ownerClockCommand(f.storage,f.db,owner,{action:'list'},now)).result.tasks[0];
 assert.equal(shown.status,'awaiting_runner');assert.equal(shown.lastReceipt.status,'queued_for_runner');
 const record=f.mem.get('clock-dispatch:'+id+':'+(now+30*60000));
 assert.equal(record.status,'queued_for_runner');
});
test('hourly alarms catch up at most once after a delayed Cron wake and respect cooldown',async()=>{
 const f=harness();
 await ownerClockCommand(f.storage,f.db,owner,{...create,repeat:'hourly'},now);
 let calls=0;
 const delay=await runDueOwnerClock(f.storage,{now:now+6*3600000,guard:()=>false,dispatch:async()=>{calls++;return {ok:true}}});
 assert.equal(delay.status,'scheduler_cooldown');assert.equal(calls,0);
 const fired=await runDueOwnerClock(f.storage,{now:now+6*3600000,dispatch:async()=>{calls++;return {ok:true,status:'queued_for_runner'}}});
 assert.equal(fired.dispatched,true);assert.equal(calls,1);
 assert.equal(nextOccurrence(now+6*3600000,now+30*60000,'hourly'),now+6.5*3600000);
 const active=(await ownerClockCommand(f.storage,f.db,owner,{action:'list'},now)).result.tasks[0];
 assert.equal(active.status,'active');assert.equal(active.nextAt,now+6.5*3600000);
});
test('owner can pause, resume and cancel, with no destructive purge or ambiguous replay',async()=>{
 const f=harness(),x=(await ownerClockCommand(f.storage,f.db,owner,create,now)).result.task;
 const paused=await ownerClockCommand(f.storage,f.db,owner,{action:'pause',id:x.id},now+1000);
 assert.equal(paused.result.task.status,'paused');
 assert.equal((await runDueOwnerClock(f.storage,{now:now+3600000,dispatch:async()=>{throw Error('must not dispatch')}})).status,'no_due_owner_schedules');
 const resumed=await ownerClockCommand(f.storage,f.db,owner,{action:'resume',id:x.id,startAt:'2026-10-21T14:00:00Z'},now+3600000);
 assert.equal(resumed.result.task.status,'active');
 const cancelled=await ownerClockCommand(f.storage,f.db,owner,{action:'cancel',id:x.id},now+3600001);
 assert.equal(cancelled.result.historyPreserved,true);
 const archived=await ownerClockCommand(f.storage,f.db,owner,{action:'archive_old'},now+16*86400000);
 assert.equal(archived.result.archived,1);
 assert.equal((await ownerClockCommand(f.storage,f.db,owner,{action:'list'},now+16*86400000)).result.tasks.length,0);
 assert.equal(f.mem.get('owner-task-clock-v1').length,0,'archived schedule frees active capacity');
 assert.equal(f.mem.get('owner-task-clock-archive:'+x.id).id,x.id,'schedule history remains in Durable Object');
 assert.equal((await ownerClockCommand(f.storage,f.db,owner,{action:'list'},now+16*86400000)).result.archivedCount,1);
});
test('a stale or completed ticket cannot be silently re-created from a recurring schedule',async()=>{
 const f=harness();
 await ownerClockCommand(f.storage,f.db,owner,{...create,repeat:'daily'},now);
 let attempts=0;
 const result=await runDueOwnerClock(f.storage,{now:now+3600000,dispatch:async()=>{
  attempts++;return {ok:true,status:'job_not_dispatchable',reason:'awaiting_merge_or_complete'}
 }});
 assert.equal(result.status,'job_not_dispatchable');
 assert.equal(attempts,1);
 const again=await runDueOwnerClock(f.storage,{now:now+48*3600000,dispatch:async()=>{attempts++;return {ok:true}}});
 assert.equal(again.status,'no_due_owner_schedules');assert.equal(attempts,1);
});
test('natural Bubbles owner instructions classify precise work, not general TV schedules or how-to questions',()=>{
 const sample='Schedule ticket '+ticketId+' job '+jobId+' tomorrow at 4 PM every day';
 const intent=parseClockIntent(sample,{now:new Date(now)});
 assert.equal(intent.action,'create');assert.equal(intent.ticketId,ticketId);assert.equal(intent.jobId,jobId);
 assert.equal(intent.repeat,'daily');assert.match(intent.startAt,/Z$/);
 assert.equal(parseClockIntent('Show scheduled jobs').action,'list');
 assert.equal(parseClockIntent('Clear old completed clock tasks').action,'archive_old');
 assert.equal(parseClockIntent('How can I schedule jobs?'),null);
 assert.equal(parseClockIntent('Build an Omni TV schedule'),null);
 assert.equal(parseClockIntent('Schedule jobs without specifying a ticket').needsTicket,true);
 const cid='clock_'+'a'.repeat(8)+'-'+'b'.repeat(4)+'-'+'c'.repeat(4)+'-'+'d'.repeat(4)+'-'+'e'.repeat(12);
 assert.equal(parseClockIntent('Pause '+cid).action,'pause');
});
test('Bubbles clock API does not claim execution on save and never sends action without owner bearer',async()=>{
 const intent=parseClockIntent('Schedule ticket '+ticketId+' job '+jobId+' at 2026-10-21T15:00:00Z');
 let calls=0;
 const reply=await clockConversation(intent,{base:'https://brain.test',ownerHeaders:async()=>({Authorization:'Bearer fixture'}),
 fetcher:async(url,options)=>{calls++;assert.equal(url,'https://brain.test/work/clock');
  assert.equal(options.headers.Authorization,'Bearer fixture');assert.equal(JSON.parse(options.body).jobId,jobId);
  return Response.json({ok:true,task:{id:'clock_fixture',ticketId,jobId,repeat:'once',nextAt:Date.parse(intent.startAt)}});
 }});
 assert.match(reply,/not proof that any bot ran/);assert.equal(calls,1);
 await assert.rejects(clockConversation(intent,{ownerHeaders:async()=>({}),fetcher:async()=>{throw Error('must not call')}}),/verified_Bubbles_owner_session_required/);
});
test('Cloudflare clock route has the same verified owner gate as Robot Brain work tickets',()=>{
 const worker=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 assert.match(worker,/path==='\/work\/clock'/);
 assert.match(worker,/ownerAuthorized\(env,token\)/);
 assert.match(worker,/runDueOwnerClock\(this.ctx.storage/);
 assert.match(worker,/alarm-global-next-at/);
 assert.match(worker,/this.fetch\(new Request\('https:\/\/clock.internal\/run-next'/);
});
