import test from 'node:test';
import assert from 'node:assert/strict';
import {ticketAdmission,filterActiveTickets,MAXIMUM_BACKGROUND_AGE_DAYS} from '../workers/infinity-brain-clock/ticket-selector.mjs';
import {sortCandidates} from '../workers/infinity-brain-clock/queue-order.mjs';
import {checkOwnerRunnerRequest} from '../workers/infinity-brain-clock/runner-request.mjs';
const now=Date.parse('2026-10-17T23:30:00Z');
const day=86400000;
const mk=(id,{days=1,priority=0,status='queued',summary='',blocker='',updatedDays=0,approvedDays,jobId='TASK-1'}={})=>({
 ticket:{id,created_at:now-days*day,updated_at:now-updatedDays*day,request:id},
 jobs:[],
 job:{id:jobId,status,queue_priority:priority,repository:'www-infinity4/QuantaPhi',
  instructions:'Implement verified, bounded UI repair',progress:{summary,blocker,
  ...(approvedDays===undefined?{}:{ownerApprovedAt:new Date(now-approvedDays*day).toISOString()})}}
});
test('legacy Quant AI owner-input blocker is deferred despite numeric priority 95 and fresh updated_at',()=>{
 const quant=mk('IW-20261013-C86DFEA8',{days:4,updatedDays:0,priority:95,status:'blocked',jobId:'TASK-4',summary:'Reader blocker: owner_input_required: Owner must specify the concrete UI files, exact exported function names and signatures for cinema-reel-core.js and the full JSON schema for production/quant-ai-commercial.json.'});
 const fresh=mk('IW-NEW',{days:1,priority:10});
 const snapshot=JSON.stringify([quant,fresh]);
 const sorted=sortCandidates([quant,fresh]);
 assert.equal(sorted[0],quant,'prioritization previously let Quant AI monopolize the reader');
 const filtered=filterActiveTickets(sorted,{now});
 assert.deepEqual(filtered.allowed.map(x=>x.ticket.id),['IW-NEW']);
 assert.deepEqual(filtered.deferred,[{ticketId:'IW-20261013-C86DFEA8',jobId:'TASK-4',reason:'owner_decision_required'}]);
 assert.equal(JSON.stringify([quant,fresh]),snapshot,'selector must not change D1 jobs or receipts');
});
test('background tickets older than seven days yield to current eligible work without deleting old jobs',()=>{
 assert.equal(MAXIMUM_BACKGROUND_AGE_DAYS,7);
 const old=mk('OLD',{days:8,priority:100,updatedDays:0});
 const fresh=mk('NEW',{days:0,priority:0});
 const filtered=filterActiveTickets(sortCandidates([old,fresh]),{now});
 assert.deepEqual(filtered.allowed,[fresh]);
 assert.equal(filtered.deferred[0].reason,'background_ticket_aged_out');
 assert.equal(filtered.deferred[0].ticketId,'OLD');
 assert.equal(old.job.status,'queued');
 assert.equal(ticketAdmission(old,{now,maximumAgeDays:7}).ageDays,8);
});
test('explicit authenticated owner selection overrides aging but not a missing specification or security hold',()=>{
 const old=mk('OLD',{days:40});
 assert.equal(ticketAdmission(old,{now,requested:{ticketId:'OLD',jobId:'TASK-1'}}).reason,'owner_selected');
 assert.equal(ticketAdmission(old,{now,requested:{ticketId:'OLD'}}).reason,'owner_selected');
 const missing=mk('OLD-BLOCKED',{days:40,status:'blocked',summary:'owner_input_required: Owner must specify exact file and schema'});
 assert.equal(ticketAdmission(missing,{now,requested:{ticketId:'OLD-BLOCKED',jobId:'TASK-1'}}).eligible,false);
 const denied=mk('SECURITY',{days:40,status:'blocked',blocker:'security_hold'});
 assert.equal(ticketAdmission(denied,{now,requested:{ticketId:'SECURITY',jobId:'TASK-1'}}).reason,'owner_decision_required');
 assert.equal(checkOwnerRunnerRequest(denied.job,{now}).reason,'owner_decision_required');
});
test('owner-approved old ordinary jobs can run only after actual authorization and existing retry gates',()=>{
 const approved=mk('LEGACY-APPROVED',{days:22,approvedDays:1});
 assert.equal(ticketAdmission(approved,{now}).eligible,true);
 assert.equal(checkOwnerRunnerRequest(approved.job,{now}).eligible,true);
 assert.equal(checkOwnerRunnerRequest(approved.job,{now,deps:[{status:'blocked'}]}).reason,'dependency_pending');
 assert.equal(checkOwnerRunnerRequest(approved.job,{now,lease:{leaseUntil:now+10000}}).reason,'runner_lease_active');
 const oldApproval=mk('LEGACY-OLD-APPROVAL',{days:22,approvedDays:10});
 assert.equal(ticketAdmission(oldApproval,{now}).reason,'background_ticket_aged_out');
});
test('reader failures and retries do not rejuvenate the original ticket creation age',()=>{
 const stale=mk('OLD',{days:9,updatedDays:0,status:'working',summary:'Ready for a new read'});
 stale.job.progress.attemptedAt=new Date(now-500).toISOString();
 assert.equal(ticketAdmission(stale,{now}).reason,'background_ticket_aged_out');
 const source=JSON.stringify(stale);
 filterActiveTickets([stale],{now});
 assert.equal(JSON.stringify(stale),source);
});
test('genuine recent blocked source retry is not discarded unless it needs missing owner input',()=>{
 const buildFailure=mk('SOURCE',{days:1,status:'blocked',
  summary:'Repair attempts exhausted: build: Model attempted an edit outside pinned source windows'});
 assert.equal(ticketAdmission(buildFailure,{now}).eligible,true);
 assert.equal(checkOwnerRunnerRequest(buildFailure.job,{now}).eligible,true);
 const noSpecs=mk('NEEDS-SPECS',{days:1,status:'blocked',summary:'No usable function signatures, owner must supply exact schema'});
 assert.equal(ticketAdmission(noSpecs,{now}).reason,'actionable_specs_required');
});
test('maximum age and look-ahead are bounded; malformed or absent created_at does not guess a deletion',()=>{
 const candidates=Array.from({length:8},(_,i)=>mk('JOB-'+i));
 assert.equal(filterActiveTickets(candidates,{now,maxLookAhead:3}).examined,3);
 assert.equal(filterActiveTickets(candidates,{now,maxLookAhead:3}).allowed.length,3);
 const unknown=mk('UNKNOWN');delete unknown.ticket.created_at;
 assert.equal(ticketAdmission(unknown,{now}).eligible,true);
 assert.equal(ticketAdmission(mk('OLD',{days:20}),{now,maximumAgeDays:Infinity}).reason,'background_ticket_aged_out');
});
