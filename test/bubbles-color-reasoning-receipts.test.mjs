import test from 'node:test';
import assert from 'node:assert/strict';
import {appendRunnerStep} from '../workers/infinity-brain-clock/runner-progress.mjs';
import {projectVerifiedJobTransitions} from '../bubbles-brain-job-steps.mjs';

const repository='www-infinity4/QuantaPhi';
const runUrl='https://github.com/www-infinity4/Moltnook/actions/runs/42400000000';
const ticket=()=>({id:'IW-20261107-1234',repository,
 context:{color_jobs:[{id:'TASK-1',repository,agent:'greenbeans',status:'working',
 progress:{runUrl}}]}});

test('a real Red GPT step and subsequent Orange decision have separate same-ticket progress',()=>{
 const input=ticket(),job=input.context.color_jobs[0];
 job.progress=appendRunnerStep(job.progress,{phase:'planning_started',attempt:0},repository,runUrl);
 assert.ok(job.progress);
 job.progress=appendRunnerStep(job.progress,{phase:'red_reasoned',attempt:0},repository,runUrl);
 assert.ok(job.progress);
 job.progress=appendRunnerStep(job.progress,{phase:'orange_reasoned',attempt:0},repository,runUrl);
 assert.ok(job.progress);
 const events=projectVerifiedJobTransitions(input).events;
 const reasoning=events.filter(e=>/_reasoned$/.test(e.runnerPhase||''));
 assert.deepEqual(reasoning.map(e=>e.runnerPhase),['red_reasoned','orange_reasoned']);
 assert.deepEqual(reasoning.map(e=>e.agent),['red-macro-reader','orange-peel']);
 assert.ok(reasoning.every(e=>e.verifiedCompletion===false));
 assert.equal(projectVerifiedJobTransitions(input,projectVerifiedJobTransitions(input).markers).events.length,0);
});

test('Red to Blue validation is a reasoning receipt, not a claimed data import',()=>{
 const input=ticket(),job=input.context.color_jobs[0];
 job.progress=appendRunnerStep(job.progress,{phase:'planning_started',attempt:0},repository,runUrl);
 job.progress=appendRunnerStep(job.progress,{phase:'red_reasoned',attempt:0},repository,runUrl);
 job.progress=appendRunnerStep(job.progress,{phase:'blue_reasoned',attempt:0},repository,runUrl);
 assert.deepEqual(projectVerifiedJobTransitions(input).events
  .filter(e=>/_reasoned$/.test(e.runnerPhase||'')).map(e=>e.agent),
  ['red-macro-reader','blueberry']);
 assert.ok(job.progress.runnerSteps.every(x=>!x.prUrl));
});

test('reasoning proof is bounded and does not admit arbitrary phases or backwards replay',()=>{
 const started=appendRunnerStep({runUrl},{phase:'planning_started',attempt:0},repository,runUrl);
 const red=appendRunnerStep(started,{phase:'red_reasoned',attempt:0,raw:'secret'},repository,runUrl);
 assert.ok(red);
 assert.equal(red.runnerSteps.at(-1).summary,'');
 assert.equal(appendRunnerStep(red,{phase:'color_reasoned',attempt:0},repository,runUrl),null);
 assert.equal(appendRunnerStep(red,{phase:'red_reasoned',attempt:0},repository,runUrl),null);
 assert.equal(appendRunnerStep(red,{phase:'planning_started',attempt:0},repository,runUrl),null);
 assert.equal(appendRunnerStep(red,{phase:'source_read',attempt:1},repository,runUrl),null);
});
