import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retryDelay,eligibleForRetry,nextRetryState,classifyAlarmDispatch} from '../workers/infinity-brain-clock/alarm-retry.mjs';
import {classifyDispatch} from '../workers/infinity-brain-clock/red-sectors.mjs';
import {readFile} from 'node:fs/promises';
const t=Date.parse('2026-10-17T02:00:00Z');
const job=(status='queued')=>({id:'TASK-1',repository:'www-infinity4/QuantaPhi',status,instructions:'Repair Bubbles'});
test('alarms keep work retryable with exponential backoff and a one-hour ceiling',()=>{
 assert.equal(retryDelay(1),300000);
 assert.equal(retryDelay(2),600000);
 assert.equal(retryDelay(4),2400000);
 assert.equal(retryDelay(20),3600000);
 const outcome=nextRetryState({attempts:0},{ok:true,status:'dispatch_accepted'},t);
 assert.equal(outcome.state,'dispatched_unverified');
 assert.equal(outcome.attempts,1);
 assert.equal(outcome.nextAt,t+300000);
 assert.deepEqual(classifyDispatch({ok:true,status:'dispatch_accepted'}),{state:'dispatched_unverified',reason:'Awaiting authenticated runner receipt'});
});
test('retry does not duplicate work already committed, merged or deployed',()=>{
 for(const status of ['complete','deployed_verified','committed_unverified','merged_verified'])
  assert.equal(eligibleForRetry(job(status),{now:t}).eligible,false);
 for(const status of ['committed_unverified','deployed_verified'])
  assert.equal(eligibleForRetry(job(),{now:t,prior:{status}}).eligible,false);
 assert.equal(eligibleForRetry(job(),{now:t,lease:{leaseUntil:t+1}}).reason,'runner_lease_active');
 assert.equal(eligibleForRetry(job('working'),{now:t,prior:{leaseUntil:t+1}}).reason,'claimed_by_runner');
 assert.equal(eligibleForRetry(job('blocked'),{now:t,retry:{nextAt:t+1000}}).reason,'alarm_backoff');
 assert.equal(eligibleForRetry(job('blocked'),{now:t,prior:{retryAt:t+1000}}).reason,'runner_backoff');
});
test('retry respects dependency jobs, active runner evidence, and owner-only blocks',()=>{
 assert.equal(eligibleForRetry(job(),{now:t,deps:[job('queued')]}).reason,'dependency_pending');
 assert.equal(eligibleForRetry(job(),{now:t,deps:[job('complete')]}).eligible,true);
 const running={...job('working'),progress:{runUrl:'https://github.com/www-infinity4/QuantaPhi/actions/runs/1',attemptedAt:new Date(t-60000).toISOString()}};
 assert.equal(eligibleForRetry(running,{now:t}).reason,'recent_runner_receipt');
 assert.equal(eligibleForRetry(running,{now:t+41*60000}).eligible,true);
 assert.equal(eligibleForRetry({...job('blocked'),progress:{blocker:'owner_authorization_required'}},{now:t}).reason,'permanent_owner_action_required');
});
test('dispatched versus blocked is never confused with actual code delivery',()=>{
 assert.equal(classifyAlarmDispatch({ok:true,status:'dispatch_accepted'}).state,'dispatched_unverified');
 assert.equal(classifyAlarmDispatch({status:'scheduled_fallback',error:'github_credential_not_connected'}).state,'awaiting_repository_runner');
 assert.equal(classifyAlarmDispatch({ok:false,status:'blocked',error:'workflow_disabled'}).state,'runner_dispatch_failed');
});
test('Brain Clock wake installs a recovery alarm and tries exactly one durable retry per turn',async()=>{
 const code=await readFile(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 assert.match(code,/async retryPendingWork\(\)/);
 assert.match(code,/this\.ctx\.storage\.put\(retryKey,attempting\)/);
 assert.match(code,/const outcome=nextRetryState/);
 assert.match(code,/this\.retryPendingWork\(\)/);
 assert.match(code,/this\.ctx\.storage\.setAlarm\(Date\.now\(\)\+120000\)/);
 assert.match(code,/finally\{this\.running=false;await this\.ctx\.storage\.setAlarm\(Date\.now\(\)\+delay\)/);
 assert.match(code,/recordRedBrain\(this\.ctx\.storage,\{kind:'alarm_dispatch'/);
});
