import test from 'node:test';
import assert from 'node:assert/strict';
import {projectVerifiedJobTransitions} from '../bubbles-brain-job-steps.mjs';
import {appendRunnerStep} from '../workers/infinity-brain-clock/runner-progress.mjs';

const original={
 id:'IW-20261104-1234',repository:'www-infinity4/QuantaPhi',
 context:{color_jobs:[{id:'TASK-1',agent:'greenbeans',repository:'www-infinity4/QuantaPhi',
 title:'Repair Bubbles',status:'working',progress:{summary:'Reading the exact Bubbles source',
 runUrl:'https://github.com/www-infinity4/QuantaPhi/actions/runs/41875539597'}}]}
};
test('authenticated ticket observations produce one specific visible step, without completion claims',()=>{
 const result=projectVerifiedJobTransitions(original);
 assert.equal(result.events.length,1);
 assert.equal(result.events[0].type,'job_step');
 assert.equal(result.events[0].status,'working');
 assert.equal(result.events[0].agent,'greenbeans');
 assert.match(result.events[0].summary,/Reading the exact Bubbles source/);
 assert.equal(result.events[0].runUrl,'https://github.com/www-infinity4/QuantaPhi/actions/runs/41875539597');
 assert.equal(result.events[0].verifiedCompletion,false);
 assert.ok(!JSON.stringify(result.events).includes('IW-20261104'));
});
test('15-second polls cannot create fake new iterations for unchanged jobs',()=>{
 const first=projectVerifiedJobTransitions(original);
 const again=projectVerifiedJobTransitions(original,first.markers);
 assert.equal(again.events.length,0);
 const changed=structuredClone(original);
 changed.context.color_jobs[0].progress.summary='Running source regression tests';
 const next=projectVerifiedJobTransitions(changed,again.markers);
 assert.equal(next.events.length,1);
 assert.match(next.events[0].summary,/regression tests/);
 const final=projectVerifiedJobTransitions(changed,next.markers);
 assert.equal(final.events.length,0);
});
test('blocked and merged stages are not called deployed and unsafe links never render',()=>{
 const blocked=structuredClone(original);
 blocked.context.color_jobs[0].status='blocked';
 blocked.context.color_jobs[0].progress.runUrl='https://example.com/secret?token=abc';
 const b=projectVerifiedJobTransitions(blocked).events[0];
 assert.equal(b.runUrl,'');
 assert.equal(b.verifiedCompletion,false);
 const merged=structuredClone(original);
 merged.context.color_jobs[0].status='merged_verified';
 assert.equal(projectVerifiedJobTransitions(merged).events[0].verifiedCompletion,false);
});
test('different repos, unsupported jobs and missing authenticated ticket shape produce nothing',()=>{
 assert.equal(projectVerifiedJobTransitions({}).events.length,0);
 const changed=structuredClone(original);
 changed.context.color_jobs[0].repository='www-someone-else/QuantaPhi';
 assert.equal(projectVerifiedJobTransitions(changed).events.length,0);
 const unsupported=structuredClone(original);
 unsupported.context.color_jobs[0].status='some_magic_success';
 assert.equal(projectVerifiedJobTransitions(unsupported).events.length,0);
});
test('old activity cannot follow the wrong conversation',()=>{
 const first=projectVerifiedJobTransitions(original);
 assert.ok(first.markers['TASK-1']);
 const changed=structuredClone(original);
 changed.id='IW-20261104-5678';
 const next=projectVerifiedJobTransitions(changed,first.markers);
 assert.equal(next.events.length,1);
});

test('Moltnook signed engineering runs can be linked without accepting arbitrary URLs',()=>{
 const copy=structuredClone(original);
 copy.context.color_jobs[0].progress.runUrl='https://github.com/www-infinity4/Moltnook/actions/runs/41875539597';
 assert.equal(projectVerifiedJobTransitions(copy).events[0].runUrl,copy.context.color_jobs[0].progress.runUrl);
});
test('persisted runner failures and retry phases reach the same ticket feed once',()=>{
 const ticket=structuredClone(original),job=ticket.context.color_jobs[0];
 const runUrl='https://github.com/www-infinity4/Moltnook/actions/runs/1234';
 job.progress={...job.progress,runUrl};
 const first=projectVerifiedJobTransitions(ticket);
 for(const step of [
  {phase:'source_read',attempt:0},
  {phase:'attempt_failed',attempt:1,stage:'test',exitCode:1,output:'private stdout'},
  {phase:'patch_prepared',attempt:2},
  {phase:'checks_passed',attempt:2,exitCode:0},
  {phase:'pr_opened',attempt:2,prUrl:'https://github.com/'+ticket.repository+'/pull/85'}
 ])job.progress=appendRunnerStep(job.progress,step,ticket.repository,runUrl);
 const next=projectVerifiedJobTransitions(ticket,first.markers);
 assert.deepEqual(next.events.map(event=>event.runnerPhase),['source_read','attempt_failed','patch_prepared','checks_passed','pr_opened']);
 assert.equal(next.markers.__ticketId,ticket.id);
 assert.match(next.events[1].summary,/exit code 1/);
 assert.doesNotMatch(JSON.stringify(next.events),/private stdout/);
 assert.match(next.events.at(-1).runUrl,/\/pull\/85$/);
 assert.equal(projectVerifiedJobTransitions(ticket,next.markers).events.length,0);
 assert.equal(appendRunnerStep(job.progress,{phase:'checks_passed',attempt:3,exitCode:1},ticket.repository,runUrl),null);
 assert.equal(appendRunnerStep(job.progress,{phase:'pr_opened',attempt:3,prUrl:'https://github.com/other/repo/pull/1'},ticket.repository,runUrl),null);
 assert.equal(appendRunnerStep(job.progress,{phase:'patch_prepared',attempt:3},ticket.repository,runUrl+'5'),null);
});
