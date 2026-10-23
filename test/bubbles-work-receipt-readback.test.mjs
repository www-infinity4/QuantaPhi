import test from 'node:test';
import assert from 'node:assert/strict';
import {readbackOwnerWorkReceipt} from '../workers/infinity-brain-clock/work-receipt-readback.mjs';
import {readFileSync} from 'node:fs';

const repo='www-infinity4/QuantaPhi',sha='a'.repeat(40),runId=1234567;
const input={mode:'work-audit-source-check',candidateId:'autonomous-building',repository:repo,commitSha:sha,runId};
const owner='a'.repeat(64);
const urls=[
 'https://api.github.com/repos/'+repo+'/commits/'+sha,
 'https://api.github.com/repos/'+repo+'/actions/runs/'+runId,
 'https://api.github.com/repos/'+repo+'/actions/runs/'+runId+'/jobs?per_page=100'
];
const success=[
 {sha,commit:{tree:{sha:'b'.repeat(40)}}},
 {head_sha:sha,repository:{full_name:repo},status:'completed',conclusion:'success'},
 {total_count:2,jobs:[{status:'completed',conclusion:'success'},{status:'completed',conclusion:'success'}]}
];
function checked(reply=success){
 const seen=[];
 const fetcher=async(url,options)=>{
  seen.push({url,options});
  const index=urls.indexOf(url);
  assert.ok(index>=0,'reject unknown host or endpoint: '+url);
  assert.equal(options.method,'GET');
  assert.equal(options.redirect,'error');
  return {ok:true,json:async()=>reply[index]};
 };
 return {seen,fetcher};
}
test('real GitHub commit/workflow/all jobs are checked before claiming only CI observed',async()=>{
 const t=checked(),result=await readbackOwnerWorkReceipt(owner,input,t.fetcher);
 assert.equal(result.ok,true);
 assert.equal(result.status,'commit_and_ci_readback_observed');
 assert.deepEqual(t.seen.map(x=>x.url),urls);
 assert.equal(result.receipt.commitSha,sha);
 assert.equal(result.receipt.successfulJobs,2);
 assert.equal(result.receipt.workflowUrl,'https://github.com/'+repo+'/actions/runs/'+runId);
 for(const key of ['featureImplemented','deploymentVerified','ownerApprovalGranted','workDispatched'])
  assert.equal(result[key],false,key);
});
test('forged test URL or source SHA cannot promote a task; URL is never fetched',async()=>{
 const t=checked();
 const bad=await readbackOwnerWorkReceipt(owner,{...input,repository:'evil/Repo'},t.fetcher);
 assert.equal(bad.ok,false);assert.equal(t.seen.length,0);
 const mismatch=checked([{...success[0],sha:'b'.repeat(40)},success[1],success[2]]);
 const receipt=await readbackOwnerWorkReceipt(owner,input,mismatch.fetcher);
 assert.equal(receipt.error,'commit_source_unverified');
 assert.equal(mismatch.seen.length,1);
});
test('a workflow from another repository or commit does not validate this work',async()=>{
 for(const override of [{head_sha:'b'.repeat(40)},{repository:{full_name:'other/repo'}}]){
  const t=checked([success[0],{...success[1],...override},success[2]]);
  const result=await readbackOwnerWorkReceipt(owner,input,t.fetcher);
  assert.equal(result.error,'workflow_source_mismatch');
  assert.equal(t.seen.length,2);
 }
});
test('queued and failed CI remains explicitly unverified',async()=>{
 for(const state of [{status:'in_progress',conclusion:null},{status:'completed',conclusion:'failure'}]){
  const t=checked([success[0],{...success[1],...state},success[2]]);
  const result=await readbackOwnerWorkReceipt(owner,input,t.fetcher);
  assert.equal(result.status,'commit_seen_ci_not_verified');
  assert.equal(result.deploymentVerified,false);
  assert.equal(t.seen.length,2);
 }
});
test('jobs cannot be forged or truncated to a passing subset',async()=>{
 for(const bad of [
  {total_count:101,jobs:success[2].jobs},
  {total_count:2,jobs:[{status:'completed',conclusion:'success'}]},
  {total_count:2,jobs:[{status:'completed',conclusion:'success'},{status:'in_progress',conclusion:null}]},
  {total_count:0,jobs:[]}
 ]){
  const t=checked([success[0],success[1],bad]);
  const result=await readbackOwnerWorkReceipt(owner,input,t.fetcher);
  assert.equal(result.error,'workflow_job_receipts_incomplete');
 }
});
test('read failures, malformed IDs and missing owner fail closed',async()=>{
 await assert.rejects(()=>readbackOwnerWorkReceipt('',input,checked().fetcher),/verified_owner_required/);
 for(const args of [{...input,runId:'../../etc'},{...input,commitSha:'not-a-SHA'},{...input,extra:true}]){
  const r=await readbackOwnerWorkReceipt(owner,args,checked().fetcher);
  assert.equal(r.ok,false);
 }
 const failing=await readbackOwnerWorkReceipt(owner,input,async()=>({ok:false,status:403}));
 assert.equal(failing.error,'github_receipt_readback_unavailable');
});
test('owner-only Brain route exposes bounded source readback, not a ticket creation operation',()=>{
 const source=readFileSync('workers/infinity-brain-clock/conversation-memory.mjs','utf8');
 const checker=readFileSync('workers/infinity-brain-clock/work-receipt-readback.mjs','utf8');
 assert.match(source,/body.mode==='work-audit-source-check'/);
 assert.match(checker,/featureImplemented:false,deploymentVerified:false,ownerApprovalGranted:false,workDispatched:false/);
 assert.doesNotMatch(checker,/\b(?:POST|PUT|PATCH|DELETE)\b\s*,\s*redirect/);
});
