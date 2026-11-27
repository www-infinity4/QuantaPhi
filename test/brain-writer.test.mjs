import test from 'node:test';
import './brain-runner-origin.test.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {checkClaims,supported,authenticate} from '../workers/infinity-brain-clock/runner-auth.mjs';
import {applyEdits,clearButtonPatch} from '../scripts/brain-patch.mjs';
import {ticketStatusFromJobs} from '../workers/infinity-brain-clock/ticket-status.mjs';
test('runner identity restricts audience, exact repo, workflow, main and expiry',()=>{
 const c={iss:'https://token.actions.githubusercontent.com',aud:'infinity-brain-writer',repository:'www-infinity4/QuantaPhi',repository_id:'1380883643',ref:'refs/heads/main',workflow_ref:'www-infinity4/QuantaPhi/.github/workflows/brain-writer.yml@refs/heads/main',event_name:'schedule',run_id:'123',exp:200,nbf:0};
 assert.equal(checkClaims(c,100),c);
 for(const change of [{aud:'other'},{repository:'www-infinity4/Moltnook'},{ref:'refs/pull/1/merge'},{workflow_ref:'other'},{exp:99},{event_name:'pull_request'}])assert.throws(()=>checkClaims({...c,...change},100));
});
test('unsigned public callers cannot claim writer access',async()=>{
 await assert.rejects(authenticate(new Request('https://brain/runner/claim')),/identity_required/);
});
test('adapter honors repository and dependency scope',()=>{
 assert.equal(supported({repository:'www-infinity4/QuantaPhi',instructions:'Create a clear text button',dependencies:[]}),true);
 assert.equal(supported({repository:'www-infinity4/Moltnook',instructions:'clear text'}),false);
 assert.equal(supported({repository:'www-infinity4/QuantaPhi',instructions:'clear text',dependencies:['ledger']}),false);
});
test('clear patch uniquely edits source and cannot mutate privileged files',async()=>{
 const original={'robot-directions.js':await fs.readFile(new URL('../robot-directions.js',import.meta.url),'utf8')};
 const edits=clearButtonPatch(original);
 if(edits.length){const result=applyEdits(original,edits);assert.match(result['robot-directions.js'],/clearButton.dataset.clear='1'/);assert.match(result['robot-directions.js'],/localStorage.removeItem\(DRAFT\)/);assert.deepEqual(clearButtonPatch(result),[]);}
 assert.throws(()=>applyEdits({'.github/workflows/x.yml':'abc'},[{path:'.github/workflows/x.yml',before:'abc',after:'xyz'}]));
 assert.throws(()=>applyEdits({'robot-directions.js':'abc abc'},[{path:'robot-directions.js',before:'abc',after:'xyz'}]));
});

test('explicit production executor cannot be claimed by the narrow interface writer',()=>{assert.equal(supported({repository:'www-infinity4/QuantaPhi',executor:'repository-engine',instructions:'Robot presentation reads source inputs and displays scene buttons',dependencies:[]}),false)});

test('a blocked Greenbeans job and dependent queued Pink Panther ticket do not claim active work',()=>{
 const blocked=[{id:'TASK-1',status:'blocked',dependencies:[]},{id:'TASK-2',status:'queued',dependencies:['TASK-1']}];
 assert.equal(ticketStatusFromJobs(blocked),'blocked');
 assert.equal(ticketStatusFromJobs([{id:'TASK-1',status:'working'},blocked[1]]),'working');
 assert.equal(ticketStatusFromJobs([{id:'TASK-1',status:'committed_unverified'},blocked[1]]),'blocked');
 assert.equal(ticketStatusFromJobs([{id:'TASK-1',status:'complete'},blocked[1]]),'ready');
 assert.equal(ticketStatusFromJobs([{id:'TASK-1',status:'complete'},{id:'TASK-2',status:'complete'}]),'complete');
 assert.equal(ticketStatusFromJobs([...blocked,{id:'TASK-3',status:'queued',dependencies:[]}]),'ready');
 assert.equal(ticketStatusFromJobs([]),'draft');
});


test('Brain writer diagnoses HTML and invalid JSON without leaking upstream body',async()=>{
 const {readBrainRunnerResponse}=await import('../scripts/brain-runner-response.mjs');
 for(const status of [200,403,429,502,503]){
  await assert.rejects(readBrainRunnerResponse(new Response('<!DOCTYPE html>private upstream marker',{status,headers:{'content-type':'text/html'}}),'claim'),e=>e.message==='runner_claim_non_json_http_'+status);
 }
 await assert.rejects(readBrainRunnerResponse(new Response('{broken',{status:503,headers:{'content-type':'application/json'}}),'claim'),/runner_claim_invalid_json_http_503/);
 await assert.rejects(readBrainRunnerResponse(Response.json({ok:false,error:'private upstream marker'},{status:503}),'claim'),/runner_claim_http_503/);
 assert.deepEqual(await readBrainRunnerResponse(Response.json({ok:true,lease:null}),'claim'),{ok:true,lease:null});
 await assert.rejects(readBrainRunnerResponse(Response.json({ok:false,error:'runner_operation_unavailable'},{status:503}),'claim'),/runner_operation_unavailable/);
});
test('Brain writer rejects redirects and malformed success without calling it idle',async()=>{
 const {readBrainRunnerResponse}=await import('../scripts/brain-runner-response.mjs');
 await assert.rejects(readBrainRunnerResponse(new Response(null,{status:302,headers:{location:'https://untrusted.invalid'}}),'claim'),/runner_claim_redirect_http_302/);
 for(const data of [{ok:true},{ok:true,lease:42},[],null])
  await assert.rejects(readBrainRunnerResponse(Response.json(data),'claim'),/runner_claim_invalid_receipt_http_200/);
 const source=await fs.readFile(new URL('../scripts/brain-writer.mjs',import.meta.url),'utf8');
 assert.match(source,/readBrainRunnerResponse\(response,path\)/);
 assert.match(source,/redirect:'manual'/);
});


test('Brain writer rejects incomplete or inconsistent active leases before execution',async()=>{
 const {readBrainRunnerResponse}=await import('../scripts/brain-runner-response.mjs');
 const lease={"key":"writer:WT-1:TASK-1:revision","leaseId":"synthetic-lease","ticketId":"WT-1","jobId":"TASK-1","repository":"www-infinity4/QuantaPhi","status":"claimed","leaseUntil":2000000000000,"job":{"id":"TASK-1","repository":"www-infinity4/QuantaPhi","instructions":"Test scoped file"}};
 const malformed=[{}, {key:lease.key}, {...lease,leaseId:''}, {...lease,job:null}, {...lease,job:{...lease.job,id:'TASK-2'}}, {...lease,job:{...lease.job,repository:'www-infinity4/Moltnook'}}, {...lease,job:{...lease.job,instructions:null}}, {...lease,leaseUntil:0}, {...lease,status:'complete'}];
 for(const invalid of malformed)await assert.rejects(readBrainRunnerResponse(Response.json({ok:true,lease:invalid}),'claim'),/runner_claim_invalid_receipt_http_200/);
 assert.deepEqual(await readBrainRunnerResponse(Response.json({ok:true,lease}),'claim'),{ok:true,lease});
 assert.deepEqual(await readBrainRunnerResponse(Response.json({ok:true,lease:null}),'claim'),{ok:true,lease:null});
});
