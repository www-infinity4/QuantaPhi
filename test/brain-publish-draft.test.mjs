import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {publishReviewed} from '../scripts/brain-publish.mjs';

const sha='a'.repeat(40);
const task='TASK-17/repair';
const branch='robot/TASK-17-repair/345';
const make=({push=async()=>{},api}={})=>({
 repository:'www-infinity4/QuantaPhi',base:'main',commitSha:sha,
 jobId:task,runId:'345',push,
 api:api||(async(_path,{body})=>({
  html_url:'https://github.com/www-infinity4/QuantaPhi/pull/123',
  head:{sha,ref:body.head},base:{ref:'main'},draft:true,number:123
 }))
});
test('every reviewed writer patch pushes ONLY a job branch and opens a DRAFT PR',async()=>{
 const pushes=[],posts=[];
 const config=make({push:async ref=>pushes.push(ref),
  api:async(path,options)=>{posts.push({path,...options});return {
   html_url:'https://github.com/www-infinity4/QuantaPhi/pull/123',
   head:{sha,ref:options.body.head},base:{ref:'main'},draft:options.body.draft,number:123
  }}});
 const result=await publishReviewed(config);
 assert.deepEqual(pushes,['HEAD:refs/heads/'+branch]);
 assert.equal(posts.length,1);
 assert.equal(posts[0].path,'repos/www-infinity4/QuantaPhi/pulls');
 assert.equal(posts[0].body.base,'main');
 assert.equal(posts[0].body.draft,true);
 assert.equal(posts[0].body.head,branch);
 assert.equal(result.publishedToDefault,false);
 assert.equal(result.draft,true);
 assert.equal(result.status,'committed_unverified');
 for(const claim of ['ciVerified','deploymentVerified','ownerMergeApproved'])assert.equal(result[claim],false);
 assert.ok(!JSON.stringify(posts).includes('Bearer '));
});
test('a failed branch push never falls back to direct main push',async()=>{
 const pushed=[],p=make({push:async ref=>{pushed.push(ref);throw Error('branch_push_denied')},
  api:async()=>{throw Error('api_should_not_be_called')}});
 await assert.rejects(publishReviewed(p),/branch_push_denied/);
 assert.deepEqual(pushed,['HEAD:refs/heads/'+branch]);
});
test('missing, incorrect, or non-draft PR receipts fail closed',async()=>{
 const variants=[
  {draft:false},
  {head:{sha:'b'.repeat(40),ref:branch}},
  {head:{sha,ref:'main'}},
  {base:{ref:'staging'}},
  {number:0},
  {html_url:'https://elsewhere.example/pull/1'}
 ];
 for(const variant of variants){
  const base={html_url:'https://github.com/www-infinity4/QuantaPhi/pull/123',
   head:{sha,ref:branch},base:{ref:'main'},draft:true,number:123};
  const p=make({api:async()=>({...base,...variant})});
  await assert.rejects(publishReviewed(p),/reviewed_draft_pr_receipt_mismatch/);
 }
});
test('invalid repo, run ID, SHA or job identifiers prevent both push and API calls',async()=>{
 const bad=[
  {repository:'www-infinity4/RecordB'},{base:'branch'},
  {commitSha:'not-sha'},{runId:'../1'},{jobId:'../secret'},
  {jobId:'A'.repeat(160)}
 ];
 for(const item of bad){
  let count=0;
  const cfg={...make(),...item,push:async()=>{count++},api:async()=>{count++}};
  await assert.rejects(publishReviewed(cfg),/invalid_reviewed_publish/);
  assert.equal(count,0);
 }
});
test('fixed branch CI dispatch is accepted but can never count as passed',async()=>{
 const requests=[];
 const result=await publishReviewed({...make(),
  requestCI:async receipt=>{requests.push(receipt);return true;}});
 assert.deepEqual(requests,[{branch,commitSha:sha,prNumber:123}]);
 assert.equal(result.ciDispatchRequested,true);
 assert.equal(result.ciVerified,false);
 assert.equal(result.deploymentVerified,false);
});
test('failed CI dispatch preserves draft PR receipt but never claims test success',async()=>{
 const result=await publishReviewed({...make(),
  requestCI:async()=>{throw Error('actions_permission_missing')}});
 assert.equal(result.draft,true);
 assert.equal(result.ciDispatchRequested,false);
 assert.equal(result.ciVerified,false);
 assert.equal(result.status,'committed_unverified');
});
test('writer cannot resume an unverified prior SHA as a deployed fix',()=>{
 const source=readFileSync(new URL('../scripts/brain-writer.mjs',import.meta.url),'utf8');
 const workflow=readFileSync(new URL('../.github/workflows/brain-writer.yml',import.meta.url),'utf8');
 assert.doesNotMatch(source,/publishReviewed\([\s\S]*?HEAD:main/);
 assert.doesNotMatch(source,/if\(resume\)/);
 assert.match(source,/writer_must_publish_draft_pr_only/);
 assert.match(source,/draft_pr_review_pending/);
 assert.match(source,/CI, owner merge, live site and Android acceptance remain unverified/);
 assert.match(workflow,/pull-requests: write/);
 assert.match(workflow,/actions: write/);
 assert.ok(source.includes('bubbles-brain-full-diagnostic.yml/dispatches'));
 assert.doesNotMatch(workflow,/deployments: write/);
});
