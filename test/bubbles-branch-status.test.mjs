import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {githubOperation} from '../workers/infinity-brain-clock/direct-github.mjs';

const repository='www-infinity4/Chiller';
const branch='add-full-episodes';
const head='b'.repeat(40);
function githubMock(exists=true,wrongIdentity=false){
 const calls=[];
 const network=async(url,options)=>{
  calls.push({url,method:options.method,redirect:options.redirect});
  if(url==='https://api.github.com/repos/'+repository)
   return Response.json({id:1367499788,full_name:wrongIdentity?'other/Chiller':repository,default_branch:'main'});
  if(url.endsWith('/git/ref/heads/add-full-episodes'))
   return exists?Response.json({ref:'refs/heads/add-full-episodes',object:{sha:head,type:'commit'}}):
    Response.json({message:'Not Found'},{status:404});
  throw Error('Unexpected remote URL: '+url);
 };
 return {calls,network};
}
test('the authenticated Chiller branch lookup returns exact GitHub identity and head SHA without a write',async()=>{
 const {calls,network}=githubMock();
 const result=await githubOperation({GITHUB_TOKEN:'synthetic'}, {action:'read_branch_status',repository,branch},network);
 assert.equal(result.ok,true);
 assert.equal(result.status,'branch_found');
 assert.equal(result.repositoryId,1367499788);
 assert.equal(result.repository,repository);
 assert.equal(result.branch,branch);
 assert.equal(result.headSha,head);
 assert.equal(result.exists,true);
 assert.equal(result.deploymentVerified,false);
 assert.ok(calls.every(call=>call.method==='GET'&&call.redirect==='manual'));
});
test('branch missing reports not found rather than claiming runner finished',async()=>{
 const {network}=githubMock(false);
 const result=await githubOperation({GITHUB_TOKEN:'synthetic'}, {action:'read_branch_status',repository,branch},network);
 assert.equal(result.ok,true);
 assert.equal(result.status,'branch_not_found');
 assert.equal(result.exists,false);
 assert.equal(result.headSha,null);
 assert.equal(result.jobExecutionVerified,false);
});
test('named branch is validated before any HTTP call and repository metadata mismatch fails closed',async()=>{
 for(const bad of ['../main','refs/heads/main','main..evil','feature//evil','a'.repeat(120),'bad?name']){
  let requests=0;
  await assert.rejects(githubOperation({GITHUB_TOKEN:'synthetic'}, {action:'read_branch_status',repository,branch:bad},()=>{requests++;throw Error('network not allowed')}),/invalid_branch_ref/);
  assert.equal(requests,0);
 }
 const {network}=githubMock(true,true);
 await assert.rejects(githubOperation({GITHUB_TOKEN:'synthetic'}, {action:'read_branch_status',repository,branch},network),/github_repository_identity_mismatch/);
});
test('public owner read endpoint admits only explicit branch-status parameters after authorization',()=>{
 const worker=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 const start=worker.indexOf("if(path==='/work/github/read'&&request.method==='POST')");
 const end=worker.indexOf("if(path==='/work/github'&&request.method==='POST')",start);
 assert.ok(start>0&&end>start);
 const gate=worker.slice(start,end);
 assert.match(gate,/ownerAuthorized\(env,token\)/);
 assert.match(gate,/read_branch_status/);
 assert.match(gate,/branch/);
 assert.doesNotMatch(gate,/dispatch_workflow|commit_files/);
});
