import test from 'node:test';import assert from 'node:assert/strict';
import {attachTechnicalHandoff,technicalCategory} from '../workers/infinity-brain-clock/technical-handoff.mjs';
import {createRequire} from 'node:module';const {ProgressTracker}=createRequire(import.meta.url)('../bubbles-brain-actions.js');
test('authenticated technical failures get bounded, correctly targeted repair work without a human relay',()=>{
 const job={id:'TASK-1',repository:'www-infinity4/QuantaPhi',status:'blocked',dependencies:[]};const context={color_jobs:[job]};
 const receipt={summary:'Runner failed: Invalid redirect value',when:'now'};
 assert.equal(attachTechnicalHandoff(context,job,receipt).queued,true);
 assert.equal(context.color_jobs[1].repository,job.repository);
 assert.deepEqual(job.dependencies,['TASK-2']);
 assert.match(context.color_jobs[1].instructions,/Do not ask Kris to relay/);
 assert.equal(attachTechnicalHandoff(context,job,receipt).queued,false);
 assert.equal(context.color_jobs.length,2);
 assert.equal(technicalCategory('owner_input_required UI design choice'),null);
 assert.equal(technicalCategory('password reauthentication required'),null);
});
test('routine failure wording changes do not keep interrupting the owner',()=>{
 const tracker=new ProgressTracker();tracker.update([]);
 const ticket=summary=>({id:'one',title:'fix teh ui thing',status:'blocked',context:{color_jobs:[{id:'TASK-1',status:'blocked',progress:{summary}}]}});
 assert.deepEqual(tracker.update([ticket('GitHub access unavailable')]),[]);
 assert.deepEqual(tracker.update([ticket('Kris tell GPT to fix GitHub access')]),[]);
});

test('live canary Green no-edit refusal cannot recursively create phantom repair jobs',()=>{
 const reason='Repair attempts exhausted: build: Green returned no bounded edits: the model claims it cannot perform Git operations and cannot supply PR receipts';
 assert.equal(technicalCategory(reason),null);
 const job={id:'TASK-1',repository:'www-infinity4/QuantaPhi',status:'blocked',dependencies:[]};
 const context={verificationOnly:true,color_jobs:[job]};
 const actual=attachTechnicalHandoff(context,job,{summary:'Runner failed: Invalid redirect value',when:'now'});
 assert.equal(actual.queued,false);
 assert.equal(actual.reason,'verification_only_no_repair_fanout');
 assert.equal(context.color_jobs.length,1);
 assert.deepEqual(job.dependencies,[]);
});

test('a child repair must not recursively spawn another child or rewrite parent dependencies',()=>{
 const parent={id:'TASK-1',repository:'www-infinity4/QuantaPhi',status:'blocked',dependencies:['TASK-2']};
 const repair={id:'TASK-2',repository:parent.repository,status:'blocked',dependencies:[]};
 const context={color_jobs:[parent,repair],technical_handoffs:[{key:'TASK-1:runner-connection',sourceJobId:'TASK-1',repairJobId:'TASK-2',category:'runner-connection'}]};
 const outcome=attachTechnicalHandoff(context,repair,{summary:'Runner failed: Invalid redirect value',when:'now'});
 assert.equal(outcome.queued,false);
 assert.equal(outcome.reason,'nested_technical_repair_not_allowed');
 assert.equal(context.color_jobs.length,2);
 assert.deepEqual(repair.dependencies,[]);
 assert.deepEqual(parent.dependencies,['TASK-2']);
});

test('historical reader owner-input refusals do not silently invent a new permission grant',()=>{
 for(const message of [
  'Reader blocker: owner_input_required: The repository is read-only and requires write permission',
  'Reader blocker: unsupported_acceptance: owner must supply credentials',
  'Reader blocker: excluded_path_required: repository outside source windows',
  'Repair attempts exhausted: build: Green returned no bounded edits: AGENTS.md exists'
 ])assert.equal(technicalCategory(message),null,message);
 assert.equal(technicalCategory('Runner failed: Invalid redirect value'),'runner-connection');
});
