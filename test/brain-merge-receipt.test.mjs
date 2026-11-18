import test from 'node:test';import assert from 'node:assert/strict';
import {reconcileMergedJob} from '../workers/infinity-brain-clock/merge-receipt.mjs';
const sha='a'.repeat(40),merge='b'.repeat(40),repository='www-infinity4/WidgetPhi';
function fixture(passed=true,{base='main',changes=1}={}){
 const row={id:'order',context_json:JSON.stringify({color_jobs:[{id:'TASK-1',repository,status:'committed_unverified',progress:{commitSha:sha}}]})},writes=[];
 const env={GITHUB_TOKEN:'fixture',WRITER_OWNER_HASH:'owner',WORK_DB:{prepare(sql){return {bind(...args){this.args=args;return this},all:async()=>({results:[row]}),run:async function(){writes.push(this.args);return {meta:{changes}}}};}}};
 const request=async url=>Response.json(url.includes('/pulls/')?{merged:true,merge_commit_sha:merge,merged_at:new Date().toISOString(),html_url:'https://github.com/'+repository+'/pull/1',user:{login:'www-infinity4'},base:{ref:base,repo:{full_name:repository,default_branch:'main'}},head:{repo:{full_name:repository},sha}}:url.includes('check-runs')?{total_count:2,check_runs:[{status:'completed',conclusion:passed?'success':'failure'},{status:'completed',conclusion:'skipped'}]}:{statuses:[]});
 return {env,writes,request};
}
test('verified merge advances the actual job and does not claim deployment',async()=>{
 const f=fixture();const receipt=await reconcileMergedJob(f.env,{repository,number:1,headSha:sha},f.request);
 assert.equal(receipt.status,'merged_verified');assert.equal(receipt.deployed,false);assert.equal(receipt.matchedJobs,1);
 const context=JSON.parse(f.writes[0][0]);assert.equal(context.color_jobs[0].status,'merged_verified');assert.equal(context.color_jobs[0].progress.mergeSha,merge);
});
test('a feature-branch merge and a lost D1 compare-and-swap cannot advance a dependency',async()=>{
 const feature=fixture(true,{base:'other-feature'});
 await assert.rejects(reconcileMergedJob(feature.env,{repository,number:1,headSha:sha},feature.request),/default_branch_not_verified/);
 assert.equal(feature.writes.length,0);
 const conflicted=fixture(true,{changes:0});
 const result=await reconcileMergedJob(conflicted.env,{repository,number:1,headSha:sha},conflicted.request);
 assert.equal(result.matchedJobs,0);
 assert.equal(conflicted.writes[0][3],'owner');
});
test('failed target checks and mismatched commit heads cannot advance job status',async()=>{
 const f=fixture(false);await assert.rejects(reconcileMergedJob(f.env,{repository,number:1,headSha:sha},f.request),/checks_not_verified/);assert.equal(f.writes.length,0);
 const g=fixture();await assert.rejects(reconcileMergedJob(g.env,{repository,number:1,headSha:merge},g.request),/head_mismatch/);assert.equal(g.writes.length,0);
});
