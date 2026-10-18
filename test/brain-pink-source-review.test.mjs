import test from 'node:test';
import assert from 'node:assert/strict';
import {pinnedPinkReview,pinkReviewHasActiveRepair,validatePinkSourceReceipt,completePinkReviewInContext,prioritizeReadOnlyPinkReviews} from '../workers/infinity-brain-clock/source-review.mjs';
const sha='1'.repeat(40),head='2'.repeat(40);
const repo='www-infinity4/QuantaPhi';
const generated=(id)=>({id,agent:'greenbeans',repository:repo,title:'Repair source-routing',
  status:'blocked',instructions:'Diagnose and repair the authenticated source-routing failure preventing a job'});
const makeContext=()=>({
 kind:'robot-directions',color_jobs:[
  {id:'TASK-1',agent:'greenbeans',repository:repo,status:'merged_verified',progress:{testsPassed:true,mergeSha:sha,commitSha:head,prUrl:'https://github.com/www-infinity4/QuantaPhi/pull/418'}},
  {id:'TASK-2',agent:'pink-panther',repository:repo,status:'blocked',dependencies:['TASK-1','TASK-3'],
   instructions:'After TASK-1, independently verify the requested work: owner-approved repository routing fix.'},
  generated('TASK-3'),generated('TASK-4')
 ],
 technical_handoffs:[
  {sourceJobId:'TASK-2',repairJobId:'TASK-3',category:'source-routing'},
  {sourceJobId:'TASK-3',repairJobId:'TASK-4',category:'implementation'}
 ]
});
test('a merged verified Green source with bona fide Pink review admits read-only verification',()=>{
 const ctx=makeContext(),proof=pinnedPinkReview(ctx,ctx.color_jobs[1]);
 assert.equal(proof.kind,'source_review_only');
 assert.equal(proof.mergeSha,sha);
 assert.equal(proof.prNumber,418);
 assert.deepEqual(proof.repairIds,['TASK-3','TASK-4']);
 assert.equal(proof.mayWrite,false);
 assert.equal(proof.sourceDeployedVerified,false);
});
test('no anonymous task, unsigned merge, unrelated dependency or wrong owner may claim source verified',()=>{
 const ctx=makeContext();
 for(const change of [{agent:'greenbeans'},{repository:'other/repo'},
  {instructions:'Create a new token for production.'},
  {dependencies:['TASK-1','TASK-99','TASK-3']}])
  assert.equal(pinnedPinkReview(ctx,{...ctx.color_jobs[1],...change}),null);
 for(const change of [{status:'working'},{progress:{testsPassed:false,mergeSha:sha}},
   {progress:{testsPassed:true,mergeSha:head,prUrl:'https://github.com/other/repo/pull/418'}}]){
  const mod=makeContext();Object.assign(mod.color_jobs[0],change);
  assert.equal(pinnedPinkReview(mod,mod.color_jobs[1]),null);
 }
 for(const c of ['tool-connection','owner-input-required']){
  const mod=makeContext();mod.technical_handoffs[0].category=c;
  assert.equal(pinnedPinkReview(mod,mod.color_jobs[1]),null);
 }
});
test('read-only Pink source receipt cannot claim payment, owner permission, deployed acceptance or broad paths',()=>{
 const ctx=makeContext(),review=pinnedPinkReview(ctx,ctx.color_jobs[1]),job=ctx.color_jobs[1];
 const receipt={status:'source_verified',testsPassed:true,reviewedMergeSha:sha,commitSha:head,
  testPaths:['test/bubbles-brain-actions.test.cjs'],productionVerified:false,ownerApprovalGranted:false};
 const proof=validatePinkSourceReceipt({review,job,body:receipt});
 assert.equal(proof.sourceOnly,true);
 assert.equal(proof.noReward,true);
 assert.equal(proof.productionVerified,false);
 for(const [key,value] of [['status','deployed_verified'],['testsPassed',false],
  ['reviewedMergeSha',head],['commitSha','garbage'],['testPaths',['.github/workflows/write.yml']],
  ['productionVerified',true],['ownerApprovalGranted',true],['mergedNewCode',true]]){
  assert.throws(()=>validatePinkSourceReceipt({review,job,body:{...receipt,[key]:value}}),/source_review_receipt_invalid/);
 }
 const after=completePinkReviewInContext(ctx,'TASK-2',proof,'2026-10-18T02:40:00Z','https://github.com/www-infinity4/Moltnook/actions/runs/2');
 assert.equal(after.color_jobs[1].status,'complete');
 assert.equal(after.color_jobs[1].progress.resultKind,'source_verified');
 assert.equal(after.color_jobs[1].progress.blocker,'deployment_not_verified');
 assert.equal(after.color_jobs[0].status,'merged_verified');
 assert.equal(after.color_jobs[2].status,'superseded');
 assert.equal(after.color_jobs[3].status,'superseded');
 assert.equal(ctx.color_jobs[1].status,'blocked','no mutation of original D1 snapshot');
});
test('no forged generated repair is silently retired',()=>{
 const ctx=makeContext();ctx.color_jobs[2].instructions='Do not bypass owner security review';
 assert.equal(pinnedPinkReview(ctx,ctx.color_jobs[1]),null);
 const good=makeContext();
 good.color_jobs[1].dependencies.push('TASK-9');
 assert.equal(pinnedPinkReview(good,good.color_jobs[1]),null);
});

test('read-only Pink verification moves ahead of bot-generated repair churn but never overrules owner selection',()=>{
 const ctx=makeContext();const candidate=id=>({context:ctx,job:ctx.color_jobs.find(j=>j.id===id),ticket:{id:'owner-ticket'}});
 const jobs=[candidate('TASK-3'),candidate('TASK-1'),candidate('TASK-2')];
 assert.deepEqual(prioritizeReadOnlyPinkReviews(jobs).map(x=>x.job.id),['TASK-2','TASK-3','TASK-1']);
 assert.deepEqual(prioritizeReadOnlyPinkReviews(jobs,{requested:{ticketId:'owner-ticket',jobId:'TASK-3'}}).map(x=>x.job.id),
  ['TASK-3','TASK-1','TASK-2']);
 // A source review cannot evade the original policy when its merge receipt vanishes.
 ctx.color_jobs[0].status='blocked';
 assert.deepEqual(prioritizeReadOnlyPinkReviews(jobs).map(x=>x.job.id),['TASK-3','TASK-1','TASK-2']);
});

test('Pink review cannot race a technical repair that already started, committed or finished',()=>{
 const ctx=makeContext(),review=pinnedPinkReview(ctx,ctx.color_jobs[1]);
 assert.equal(pinkReviewHasActiveRepair(ctx,review),false,'blocked repair can be superseded only after verified source');
 for(const status of ['working','committed_unverified','merged_verified','complete']){
  const clone=structuredClone(ctx);clone.color_jobs[3].status=status;
  assert.equal(pinkReviewHasActiveRepair(clone,review),true,status+' repair must not be superseded');
 }
 for(const status of ['blocked','queued','superseded']){
  const clone=structuredClone(ctx);clone.color_jobs[2].status=status;
  assert.equal(pinkReviewHasActiveRepair(clone,review),false);
 }
 assert.equal(pinkReviewHasActiveRepair(ctx,null),false);
 assert.equal(pinkReviewHasActiveRepair({color_jobs:[]},review),false);
});
