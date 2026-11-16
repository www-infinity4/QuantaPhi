/* Cloudflare Cron + Durable Object alarms own time-based execution.
 * An owner-scheduled entry only points to an ALREADY owner-authorized Robot Brain
 * ticket/job. It never grants permissions, creates source code, or certifies CI.
 * Cancellation and archive preserve the ticket, runner history and receipts.
 */
const KEY='owner-task-clock-v1',ARCHIVE_COUNT='owner-task-clock-archive-count-v1',REPO=/^www-infinity4\/[A-Za-z0-9_.-]+$/;
const ID=/^IW-\d{8}-[0-9A-F-]{8}$/,JOB=/^TASK-\d+$/;
const LIMIT=40,DAY=86400000,MINUTE=60000;
const intervals={once:0,hourly:60*MINUTE,daily:DAY};
const safe=v=>String(v||'').slice(0,160);
const finite=Number.isFinite;
export function scheduleTime(iso,now=Date.now()){
 if(typeof iso!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(iso))throw Error('clock_absolute_time_with_offset_required');
 const at=Date.parse(iso);
 if(!finite(at)||at<now+2*MINUTE||at>now+365*DAY)throw Error('clock_time_out_of_range');
 return at;
}
export function nextOccurrence(now,previous,repeat){
 const step=intervals[repeat];if(!step)return null;
 // A suspended Worker gets one opportunity, never a storm of missed runs.
 return previous+Math.max(1,Math.floor((now-previous)/step)+1)*step;
}
async function entries(store){
 const value=await store.get(KEY);
 return Array.isArray(value)?value.filter(v=>v&&typeof v.id==='string').slice(0,LIMIT):[];
}
function exposed(row){
 return {id:row.id,ticketId:row.ticketId,jobId:row.jobId,repository:row.repository,
  repeat:row.repeat,status:row.status,nextAt:row.nextAt??null,createdAt:row.createdAt,
  updatedAt:row.updatedAt,lastAttemptAt:row.lastAttemptAt??null,
  lastReceipt:row.lastReceipt??null};
}
function failure(reason,status=400){return {status,result:{ok:false,error:reason}}}
export async function ownerClockCommand(store,db,ownerHash,input,now=Date.now()){
 if(!/^[a-f0-9]{64}$/.test(ownerHash||''))return failure('clock_owner_partition_unavailable',503);
 const action=String(input?.action||''),all=await entries(store);
 if(action==='list')return {status:200,result:{ok:true,tasks:all.filter(r=>r.status!=='archived').map(exposed),
  archivedCount:(await store.get(ARCHIVE_COUNT)||0)+all.filter(r=>r.status==='archived').length,clock:'cloudflare-cron-durable-object'}};
 if(action==='create'){
  const ticketId=String(input.ticketId||''),jobId=String(input.jobId||'');
  if(!ID.test(ticketId)||!JOB.test(jobId))return failure('existing_ticket_and_job_required');
  if(!Object.hasOwn(intervals,input.repeat))return failure('unsupported_clock_frequency');
  let nextAt;
  try{nextAt=scheduleTime(input.startAt,now)}catch(e){return failure(e.message)}
  const ticket=await db.prepare('SELECT id,repository,status,context_json FROM work_tickets WHERE owner_hash=? AND id=?')
   .bind(ownerHash,ticketId).first();
  if(!ticket)return failure('owner_ticket_not_found',404);
  if(!['ready','working','blocked'].includes(ticket.status))return failure('ticket_not_schedulable',409);
  let context;try{context=JSON.parse(ticket.context_json||'{}')}catch{return failure('saved_ticket_invalid',409)}
  const job=context?.color_jobs?.find(j=>j?.id===jobId);
  if(context.kind!=='robot-directions'||!job||job.repository!==ticket.repository||!REPO.test(ticket.repository||''))
   return failure('authorized_robot_job_required',409);
  if(!['queued','ready','working','blocked'].includes(job.status))return failure('job_not_schedulable',409);
  // Owner-approved recorded job is enough to establish the scope of a timed
  // dispatch; the runner must still independently enforce all permission gates.
  const existing=all.find(r=>r.ticketId===ticketId&&r.jobId===jobId&&['active','paused','awaiting_runner'].includes(r.status));
  if(existing)return {status:409,result:{ok:false,error:'job_schedule_already_exists',task:exposed(existing)}};
  if(all.length>=LIMIT)return failure('clock_schedule_limit_reached',409);
  const row={id:'clock_'+crypto.randomUUID(),ticketId,jobId,repository:ticket.repository,
   repeat:input.repeat,status:'active',nextAt,createdAt:now,updatedAt:now,lastAttemptAt:null,lastReceipt:null};
  all.push(row);await store.put(KEY,all);
  return {status:200,result:{ok:true,status:'clock_scheduled',task:exposed(row),executionVerified:false}};
 }
 if(['pause','resume','cancel','archive'].includes(action)){
  const id=String(input.id||''),row=all.find(v=>v.id===id);
  if(!/^clock_[0-9a-f-]{36}$/.test(id)||!row)return failure('clock_task_not_found',404);
  if(action==='pause'&&!['active','awaiting_runner'].includes(row.status))return failure('clock_task_not_active',409);
  if(action==='resume'&&!['paused','awaiting_runner'].includes(row.status))return failure('clock_task_not_paused',409);
  if(action==='archive'&&!['cancelled','finished','paused'].includes(row.status))return failure('only_inactive_clock_tasks_can_archive',409);
  if(action==='pause')row.status='paused';
  if(action==='cancel')row.status='cancelled';
  if(action==='archive')row.status='archived';
  if(action==='resume'){
   // Resuming does NOT retrigger an old committed job or reuse missed alarms.
   // The original verified ticket and current job state remain authoritative.
   let at;try{at=scheduleTime(input.startAt,now)}catch(e){return failure(e.message)}
   row.status='active';row.nextAt=at;
  }
  row.updatedAt=now;
  if(action==='archive'){
   await store.put('owner-task-clock-archive:'+row.id,{...row,archivedAt:now});
   await store.put(ARCHIVE_COUNT,(await store.get(ARCHIVE_COUNT)||0)+1);
   await store.put(KEY,all.filter(item=>item.id!==row.id));
  }else await store.put(KEY,all);
  const labels={pause:'paused',resume:'resumed',cancel:'cancelled',archive:'archived'};
  return {status:200,result:{ok:true,status:'clock_'+labels[action],task:exposed(row),historyPreserved:true}};
 }
 if(action==='archive_old'){
  const limit=now-14*DAY;let archived=0;
  const keep=[];
  for(const row of all){
   if((['cancelled','finished','archived'].includes(row.status))&&row.updatedAt<limit){
    row.status='archived';row.updatedAt=now;
    await store.put('owner-task-clock-archive:'+row.id,{...row,archivedAt:now});
    archived++;
   }else keep.push(row);
  }
  if(archived){
   await store.put(ARCHIVE_COUNT,(await store.get(ARCHIVE_COUNT)||0)+archived);
   await store.put(KEY,keep);
  }
  return {status:200,result:{ok:true,archived,retained:keep.length,receiptsPreserved:true}};
 }
 return failure('unsupported_clock_action',404);
}
export async function runDueOwnerClock(store,{now=Date.now(),dispatch,guard=()=>true}={}){
 const all=await entries(store);
 const row=all.find(v=>v.status==='active'&&finite(v.nextAt)&&v.nextAt<=now);
 if(!row)return {status:'no_due_owner_schedules'};
 if(!await guard())return {status:'scheduler_cooldown',taskId:row.id};
 // Reserve BEFORE any network call; lost responses must not cause duplicate
 // submissions. One-time jobs do not repeat even after an ambiguous timeout.
 const runKey='clock-dispatch:'+row.id+':'+row.nextAt;
 const existing=await store.get(runKey);
 if(existing)return {status:'previously_claimed',taskId:row.id};
 const dueAt=row.nextAt;
 await store.put(runKey,{state:'claimed_unverified',at:now});
 row.lastAttemptAt=now;row.lastReceipt={status:'claimed_unverified',at:now};
 row.nextAt=nextOccurrence(now,dueAt,row.repeat);
 row.status=row.repeat==='once'?'awaiting_runner':'active';row.updatedAt=now;
 await store.put(KEY,all);
 let receipt;
 try{
  receipt=await dispatch({ticketId:row.ticketId,jobId:row.jobId});
 }catch(e){receipt={ok:false,status:'dispatch_unverified',reason:safe(e?.message||e)}}
 const status=receipt?.status||'dispatch_unverified';
 const finalState={status,at:Date.now(),reason:safe(receipt?.reason||receipt?.error||''),
  dispatched:receipt?.ok===true&&status==='queued_for_runner'};
 const latest=await entries(store),item=latest.find(t=>t.id===row.id);
 // Never undo an owner's cancellation/pause while an in-flight call completes.
 if(item){item.lastReceipt=finalState;item.updatedAt=Date.now();
  if(['job_not_dispatchable','no_pending_jobs'].includes(status)){
   // An approved ticket can become completed/blocked before its alarm fires.
   // Mark schedule paused rather than forge another ticket or patch.
   if(item.status==='active'||item.status==='awaiting_runner')item.status='paused';
  }
  await store.put(KEY,latest);
 }
 await store.put(runKey,{...finalState});
 return {taskId:row.id,ticketId:row.ticketId,jobId:row.jobId,executionVerified:false,...finalState};
}
