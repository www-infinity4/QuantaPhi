import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkOwnerRunnerRequest,runnerDispatchReceipt} from '../workers/infinity-brain-clock/runner-request.mjs';

const now=Date.parse('2026-10-17T20:00:00Z');
const job=(status='queued',progress={})=>({id:'TASK-1',repository:'www-infinity4/QuantaPhi',instructions:'Repair Bubbles tool bridge',status,progress});
test('requested work uses the same lease and dependency gate as automatic retries',()=>{
 assert.equal(checkOwnerRunnerRequest(job(),{now}).eligible,true);
 assert.equal(checkOwnerRunnerRequest(job(),{now,lease:{leaseUntil:now+60000}}).reason,'runner_lease_active');
 assert.equal(checkOwnerRunnerRequest(job(),{now,prior:{retryAt:now+60000}}).reason,'runner_backoff');
 assert.equal(checkOwnerRunnerRequest(job(),{now,retry:{nextAt:now+60000}}).reason,'alarm_backoff');
 assert.equal(checkOwnerRunnerRequest(job(),{now,deps:[{status:'queued'}]}).reason,'dependency_pending');
 assert.equal(checkOwnerRunnerRequest(job('committed_unverified'),{now}).eligible,false);
 assert.equal(checkOwnerRunnerRequest(job('working',{commitSha:'a'.repeat(40)}),{now}).reason,'commit_verification_required');
});
test('voice dispatch cannot bypass an owner or security blocker',()=>{
 for(const blocker of ['owner_input_required','owner_authorization_required','security_hold','permission_denied','unsupported_repository']){
  assert.equal(checkOwnerRunnerRequest(job('blocked',{blocker}),{now}).reason,'owner_decision_required');
 }
 assert.equal(checkOwnerRunnerRequest(job('blocked',{summary:'Requires owner_input_required UI layout choice'}),{now}).eligible,false);
 assert.equal(checkOwnerRunnerRequest({...job(),repository:'unapproved/repo'},{now}).reason,'invalid_job_scope');
 assert.equal(checkOwnerRunnerRequest({...job(),instructions:''},{now}).eligible,false);
});
test('an accepted GitHub dispatch is not claimed as execution',()=>{
 assert.deepEqual(runnerDispatchReceipt({status:'dispatch_accepted'}),{status:'queued_for_runner',reason:'dispatch_accepted_execution_unverified'});
 assert.equal(runnerDispatchReceipt({status:'scheduled_fallback',error:'github_credential_not_connected'}).status,'awaiting_repository_runner');
 assert.equal(runnerDispatchReceipt({status:'failed',error:'workflow_disabled'}).status,'runner_dispatch_failed');
 assert.equal(runnerDispatchReceipt({status:'unknown'}).status,'runner_dispatch_unverified');
 assert.notEqual(runnerDispatchReceipt({status:'scheduled_fallback'}).status,'queued_for_runner');
});
test('authenticated Worker explicitly gates selected jobs and writes a dispatch receipt',()=>{
 const worker=fs.readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 const route=worker.slice(worker.indexOf("if(new URL(request.url).pathname==='/run-next')"),worker.indexOf("if(new URL(request.url).pathname==='/earnings-status')"));
 assert.match(route,/checkOwnerRunnerRequest\(job,/);
 assert.match(route,/runnerDispatchReceipt\(dispatch\)/);
 assert.match(route,/if\(!decision\.eligible\)/);
 assert.match(route,/requested-next-job/);
 assert.match(route,/recordRedBrain/);
 assert.doesNotMatch(route,/retryAt:0/);
 const outer=worker.slice(worker.indexOf("if(path==='/work/run-next'"),worker.indexOf("if(path==='/work/earnings/connect'"));
 assert.match(outer,/ownerAuthorized\(env,token\)/);
});
test('Android and web conversation share verified tools rather than letting GPT invent a ticket',()=>{
 const js=fs.readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(js,/async function sendMessage\(text,fromVoice=false/);
 assert.match(js,/async function verifiedOwnerHeaders\(\)/);
 assert.match(js,/async function requestRunner\(ticketId='',jobId=''\)/);
 assert.match(js,/await verifiedOwnerHeaders\(\)/);
 assert.match(js,/job_not_dispatchable/);
 assert.match(js,/GitHub dispatch accepted; runner start is not yet verified/);
});
