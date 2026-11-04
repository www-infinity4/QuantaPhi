import test from 'node:test';
import assert from 'node:assert/strict';
import {projectVerifiedJobTransitions} from '../bubbles-brain-job-steps.mjs';

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
