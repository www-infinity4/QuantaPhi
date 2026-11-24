// Synthetic-only local reservation rehearsal, deliberately NOT an auth adapter.
// A fixture reservation never authorizes repository writes, dispatch or inference.
// Do not import production tickets or expose this function through an HTTP route.
import {createHash,randomUUID} from 'node:crypto';
import {ticketAdmission} from '../workers/infinity-brain-clock/ticket-selector.mjs';
import {checkOwnerRunnerRequest} from '../workers/infinity-brain-clock/runner-request.mjs';

const denied=reason=>({reserved:false,executionAuthorized:false,reason});
const fixtureId=value=>typeof value==='string'&&/^fixture-[a-z0-9-]{1,64}$/.test(value);
export async function rehearsePortableClaim(state,{ownerHash,ticketId,jobId,runId,runAttempt,now}={}){
 if(!fixtureId(ownerHash)||!fixtureId(ticketId)||!/^TASK-[0-9]{1,4}$/.test(jobId||'')||
  typeof runId!=='string'||!/^\d{1,24}$/.test(runId)||!Number.isSafeInteger(runAttempt)||runAttempt<1||
  runAttempt>9999||!Number.isSafeInteger(now)||now<0)return denied('invalid_fixture_scope');
 return state.transaction(async tx=>{
  const ticketKey='rehearsal:ticket:'+ownerHash+':'+ticketId;
  const runKey='rehearsal:runner-claim:Moltnook:'+runId+':'+runAttempt;
  if(await tx.get(runKey)!==undefined)return denied('runner_attempt_already_claimed');
  const ticket=await tx.get(ticketKey),context=ticket?.context;
  if(ticket?.synthetic!==true||ticket.id!==ticketId||ticket.owner_hash!==ownerHash||
    context?.kind!=='robot-directions'||!Array.isArray(context.color_jobs)||
    !['ready','working','blocked'].includes(ticket.status))return denied('fixture_ticket_unavailable');
  const jobs=context.color_jobs,job=jobs.find(j=>j?.id===jobId);
  if(!job||jobs.filter(j=>j?.id===jobId).length!==1||job.agent!=='greenbeans'||
    job.executor!=='repository-engine'||!Array.isArray(job.dependencies)||
    context.technical_handoffs?.length||!['queued','ready'].includes(job.status))
   return denied('fixture_job_unsupported');
  const admission=ticketAdmission({ticket,job},{now});
  if(!admission.eligible)return denied(admission.reason);
  const deps=job.dependencies.map(id=>jobs.find(j=>j?.id===id)||{status:'missing_dependency'});
  const revision=createHash('sha256').update(JSON.stringify({instructions:job.instructions,acceptance:job.acceptance,repository:job.repository})).digest('hex');
  if(typeof job.repository!=='string'||!/^www-infinity4\/[A-Za-z0-9_.-]+$/.test(job.repository))return denied('invalid_job_scope');
  const key='rehearsal:writer:'+ownerHash+':'+ticketId+':'+jobId+':'+revision;
  const lockKey='rehearsal:repository-lease:'+job.repository.toLowerCase();
  const prior=await tx.get(key),lease=await tx.get(lockKey);
  const eligible=checkOwnerRunnerRequest(job,{now,prior,lease,deps});
  if(!eligible.eligible)return denied(eligible.reason);
  // Rehearsals never recycle uncertain or expired reservations.
  if(prior!==undefined||lease!==undefined)return denied('fixture_reconciliation_required');
  const reservation={kind:'synthetic-reservation',leaseId:randomUUID(),leaseUntil:now+40*60*1000,
   repository:job.repository,ticketId,jobId,revision,runId,runAttempt,executionAuthorized:false};
  const after=structuredClone(ticket);after.status='working';
  after.context.color_jobs.find(j=>j.id===jobId).status='working';
  if(!await tx.compareAndSwap(ticketKey,ticket,after))return denied('ticket_update_conflict');
  await tx.put(key,reservation);await tx.put(lockKey,reservation);await tx.put(runKey,reservation.leaseId);
  return {reserved:true,executionAuthorized:false,reason:'synthetic_reservation',reservation};
 });
}
