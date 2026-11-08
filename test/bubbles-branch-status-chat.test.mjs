import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBranchStatusQuery,describeAuthenticatedBranchStatus} from '../bubbles-branch-status.mjs';

test('explicit Chiller branch-status request routes to owner-scoped GitHub read, not the model',()=>{
 const examples=[
  'Check the add-full-episodes branch in Chiller',
  'Has the Chiller add-full-episodes job finished?',
  'Bubbles, check the job status for www-infinity4/Chiller branch add-full-episodes'
 ];
 for(const q of examples)assert.deepEqual(parseBranchStatusQuery(q),{repository:'www-infinity4/Chiller',branch:'add-full-episodes'});
});
test('non-status requests and dangerous compounded requests must not run as status checks',()=>{
 for(const q of ['Build the Chiller episodes', 'Add add-full-episodes to Chiller', 'Check Chiller branch add-full-episodes and delete old work',
  'Check branch ../main in Chiller', 'Check branch main in somebody/Chiller']){
  assert.equal(parseBranchStatusQuery(q),null,q);
 }
});
test('branch-missing output is truthful and distinct from runner execution status',()=>{
 const q={repository:'www-infinity4/Chiller',branch:'add-full-episodes'};
 const answer=describeAuthenticatedBranchStatus(q,
  {ok:true,repository:q.repository,branch:q.branch,repositoryId:1367499788,exists:false,status:'branch_not_found',headSha:null},
  {ok:true,tickets:[]});
 assert.match(answer,/branch.*not found/i);
 assert.match(answer,/not (?:confirmed|verified)|unverified/i);
 assert.doesNotMatch(answer,/job (?:finished|complete)|runner succeeded/i);
});
test('verified branch and exact matching ticket show independent status with no completion inference',()=>{
 const q={repository:'www-infinity4/Chiller',branch:'add-full-episodes'},sha='a'.repeat(40);
 const answer=describeAuthenticatedBranchStatus(q,
  {ok:true,repository:q.repository,branch:q.branch,repositoryId:1367499788,exists:true,status:'branch_found',headSha:sha},
  {ok:true,tickets:[{id:'IW-20261107-ABCDEFGH',repository:q.repository,title:'Import add-full-episodes catalog',status:'working'}]});
 assert.match(answer,/branch exists/i);
 assert.match(answer,/working/i);
 assert.match(answer,/not (?:prove|establish)|separate/i);
 assert.match(answer,/aaaaaaaaaaaa/);
});
test('unrelated ticket and mismatched API result cannot be falsely linked to the Chiller branch',()=>{
 const q={repository:'www-infinity4/Chiller',branch:'add-full-episodes'};
 const tickets={ok:true,tickets:[{repository:q.repository,title:'Unrelated TV guide',status:'complete'}]};
 const answer=describeAuthenticatedBranchStatus(q,
  {ok:true,repository:q.repository,branch:q.branch,exists:false,status:'branch_not_found',repositoryId:1367499788},tickets);
 assert.doesNotMatch(answer,/work ticket.*complete/i);
 const blocked=describeAuthenticatedBranchStatus(q,
  {ok:true,repository:'www-infinity4/QuantaPhi',branch:q.branch,exists:true,headSha:'a'.repeat(40),status:'branch_found'},tickets);
 assert.match(blocked,/identity mismatch|not verified/i);
});
test('Bubbles main messenger invokes authenticated branch read before generic model replies and never mutates on status inquiry',()=>{
 const file=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const start=file.indexOf("parseBranchStatusQuery(spoken)");
 const generalModel=file.indexOf("const lookupPayload=()");
 assert.ok(start>0&&start<generalModel);
 const fragment=file.slice(start,start+2900);
 assert.match(fragment,/\/work\/github\/read/);
 assert.match(fragment,/\/work\/tickets\/list/);
 assert.match(fragment,/verifiedOwnerHeaders\(\)/);
 assert.doesNotMatch(fragment,/commit_files|dispatch_workflow|run-next/);
});
