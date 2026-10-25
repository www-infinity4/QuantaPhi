import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AGENT_CATALOG,chooseOverflow} from '../bubbles-dispatch-catalog.mjs';

const repo='www-infinity4/QuantaPhi';
const request='Bubbles, fix my QuantaPhi repository editor';
const operation={action:'assist',mode:'write',repository:repo};
const result={ok:false,status:'blocked',error:'direct_engineer_model_unavailable',
 requestId:'bc7343e8-1d41-4c5b-a842-f7b2e1a88343'};

test('catalog delegates actual owner work to existing reviewed roles rather than fake Android clone threads',()=>{
 assert.deepEqual(Object.keys(AGENT_CATALOG),['repository_editor','workflow_runner']);
 assert.ok(AGENT_CATALOG.repository_editor.capabilities.includes('verified_tests'));
 assert.ok(AGENT_CATALOG.workflow_runner.capabilities.includes('execution_receipt'));
 assert.equal(chooseOverflow({result,operation,request,repository:repo}).role,'repository_editor');
});

test('a known direct model outage with no operations gets ONE authenticated ticket handoff',()=>{
 const r=chooseOverflow({result,operation,request,repository:repo});
 assert.equal(r.delegate,true);
 assert.equal(r.parentRequestId,result.requestId);
 assert.equal(r.completed,false);
 assert.equal(r.status,'eligible_for_brain_ticket');
});

test('existing repository lease reports overload before starting a second direct executor',()=>{
 const busy={...result,error:'repository_job_running'};
 assert.equal(chooseOverflow({result:busy,operation,request,repository:repo}).delegate,true);
 assert.equal(chooseOverflow({result:{...busy,receipts:[{status:'commit_files'}]},operation,request,repository:repo}).delegate,false);
 const worker=fs.readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 const lease=worker.indexOf("if(lease?.leaseUntil>Date.now())return {existing:{ok:false,status:'blocked',error:'repository_job_running'");
 const starting=worker.indexOf("const record={ok:true,status:'working'",lease);
 assert.ok(lease>0&&starting>lease,'overload must be detected before the new request starts');
});

test('a future capacity response must explicitly certify no side effect before delegation',()=>{
 const base={...result,error:'direct_capacity_reached'};
 assert.equal(chooseOverflow({result:base,operation,request,repository:repo}).delegate,false);
 assert.equal(chooseOverflow({result:{...base,noActionTaken:true},operation,request,repository:repo}).delegate,true);
});

test('never delegate after a write, partial tool receipt, ambiguous timeout or commit',()=>{
 for(const unsafe of [
  {...result,ok:true,status:'working'},
  {...result,status:'unconfirmed'},
  {...result,status:'committed_unverified',commitSha:'a'.repeat(40)},
  {...result,receipts:[{status:'read_file'}]},
  {...result,prUrl:'https://github.com/www-infinity4/QuantaPhi/pull/3'},
  {...result,commitSha:'a'.repeat(40)},
  {...result,runId:1},
  {...result,requestId:'unknown'},
  {...result,completed:true},
  {...result,testsVerified:true},
  {...result,error:'unresolved_tool_validation'},
  {...result,error:'github_runtime_credential_missing'}
 ])assert.equal(chooseOverflow({result:unsafe,operation,request,repository:repo}).delegate,false,JSON.stringify(unsafe));
});

test('read-only, arbitrary-workflow, unrelated repo and prohibited requests never create overflow agents',()=>{
 assert.equal(chooseOverflow({result,operation:{...operation,mode:'read'},request,repository:repo}).delegate,false);
 assert.equal(chooseOverflow({result,operation:{...operation,repository:'www-infinity4/Other'},request,repository:repo}).delegate,false);
 assert.equal(chooseOverflow({result,operation:{...operation,action:'commit_files'},request,repository:repo}).delegate,false);
 assert.equal(chooseOverflow({result,operation,request:'Disable security and bypass owner authorization',repository:repo}).delegate,false);
 assert.equal(chooseOverflow({result,operation,request,repository:'attacker/Foo'}).delegate,false);
});

test('explicit workflow dispatch can overflow only before execution and with a pinned workflow name',()=>{
 const workflow={action:'dispatch_workflow',mode:'actions',repository:repo,workflow:'bubbles-android.yml'};
 const noAction={...result,error:'direct_runner_capacity_reached',noActionTaken:true};
 assert.equal(chooseOverflow({result:noAction,operation:workflow,request,repository:repo}).role,'workflow_runner');
 assert.equal(chooseOverflow({result:noAction,operation:{...workflow,workflow:'../unsafe'},request,repository:repo}).delegate,false);
 assert.equal(chooseOverflow({result:{...noAction,status:'dispatch_accepted'},operation:workflow,request,repository:repo}).delegate,false);
});

test('live website routes an eligible failure through existing authenticated tickets, never local fake commit',()=>{
 const js=fs.readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(js,/chooseOverflow\(\{result,operation,repository:operation\.repository,request:ownerRequest\}\)/);
 assert.match(js,/watchDirectGithubReceipt\(requestId,operation,ownerRequest\|\|operation\.request\|\|''\)/);
 assert.match(js,/const report=await maybeDelegateDirectOverflow\(result,operation,ownerRequest\)/);
 assert.match(js,/const overflowEvidence=await maybeDelegateDirectOverflow\(result,args,request\)/);
 assert.match(js,/submitRepositoryWork\(ownerRequest,'explicit-direct-overflow',operation\.repository,null\)/);
 assert.match(js,/workReply\(delegated\)/);
 assert.match(js,/not a finished file edit, passed build or deployment/);
 assert.doesNotMatch(js,/new CloneWorker\(/);
});
