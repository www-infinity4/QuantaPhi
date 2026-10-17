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
