import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directGithubAgent,githubOperation} from '../workers/infinity-brain-clock/direct-github.mjs';

const site=readFileSync('bubbles-ai.js','utf8');
const source=site.slice(site.indexOf(" let workEvidence='';"),site.indexOf(' if(!embedded&&articleResearch)',site.indexOf(" let workEvidence='';")));
const modeLine=site.slice(site.indexOf('   const mode='),site.indexOf('   const namedWorkflow=',site.indexOf('   const mode=')));
const classify=new Function('request','coderIntent',source+'\n'+modeLine+'\nreturn {ownerGithubNonAction,createRepository,directCoding,requestsAgents,mode};');

test('create a new file uses GitHub WRITE, not READ',()=>{
 const request='Create a new file named hello.txt in RecordB';
 const result=classify(request,()=>null);
 assert.equal(result.createRepository,false,'file creation is not repository creation');
 assert.equal(result.directCoding,true,'file creation must reach GitHub tool route');
 assert.equal(result.mode,'write','file creation needs commit_files permission');
});
test('create repository differs from file creation; questions and refusals never write',()=>{
 const repo=classify('Create a new repository named Bubbles-QA',()=>null);
 assert.equal(repo.createRepository,true);
 assert.equal(repo.ownerGithubNonAction,false);
 const read=classify('Read README.md in RecordB',()=>null);
 assert.equal(read.mode,'read');
 for(const message of [
  'Do not create a repo called Bubbles-QA',
  "Don't create a file in RecordB",
  'How do I create a file in RecordB?',
  'Can you explain how to create a GitHub repo?'
 ]){
  const x=classify(message,()=>null);
  assert.equal(x.ownerGithubNonAction,true,message);
  assert.equal(x.directCoding,false,message);
 }
 const prompt=classify('Can you create a new file named hello.txt in RecordB?',()=>null);
 assert.equal(prompt.ownerGithubNonAction,false);
 assert.equal(prompt.mode,'write');
});
test('GitHub responses distinguish read, commit, PR and repo creation blockers',()=>{
 const start=site.indexOf('const humanReplies=()=>({'),end=site.indexOf('const brainTools=',start);
 const humanReplies=new Function(site.slice(start,end)+'\nreturn humanReplies;')();
 assert.match(humanReplies.githubReply({ok:true,status:'inspected'}),/No files were created or changed/);
 const commit=humanReplies.githubReply({ok:true,status:'committed_unverified',receipts:[
  {status:'committed_unverified',commitSha:'a'.repeat(40)},
  {status:'pull_request_open',url:'https://github.com/www-infinity4/RecordB/pull/5'}]});
 assert.match(commit,/source commit/);
 assert.match(commit,/pull\/5/);
 assert.match(commit,/not verified/);
 const created=humanReplies.githubReply({ok:true,status:'repository_created',repository:'www-infinity4/Bubbles-QA',url:'https://github.com/www-infinity4/Bubbles-QA',environment:{status:'blocked',error:'github_workflow_setup_http_403'}});
 assert.match(created,/GitHub created/);
 assert.match(created,/Automated checks could not be configured/);
 assert.doesNotMatch(created,/tests passed|deployed successfully/i);
});
test('direct GitHub Bubbles tool stages a newly created file after a pinned missing-file read',async()=>{
 const head='a'.repeat(40),created='b'.repeat(40),checks=[],modelSteps=[
  {action:'read_repository',args:{}},
  {action:'read_file',args:{path:'synthetic/hello.txt',ref:head}},
  {action:'commit_files',args:{baseSha:head,message:'Create isolated QA file',files:[{path:'synthetic/hello.txt',content:'Hello from Bubbles QA\n'}]}},
  {action:'finish',summary:'Staged requested file, PR open; CI and deployment unverified.'}
 ];
 const env={GITHUB_TOKEN:'fixture-only',WRITER_AI:{run:async(_model,input)=>{
  if(input.tools)return {response:JSON.stringify(modelSteps.shift())};
  return {response:JSON.stringify({approved:true,reason:'Bounded synthetic file in owner-authorized repo'})};
 }}};
 const writes=[];
 const network=async(url,options={})=>{
  if(options.method&&options.method!=='GET')writes.push({url,method:options.method,body:options.body?JSON.parse(options.body):null});
  if(url.endsWith('/contents/synthetic/hello.txt?ref='+head))return Response.json({message:'Not Found'},{status:404});
  if(url.includes('/git/ref/heads/bubbles/'))return Response.json({message:'Not Found'},{status:404});
  if(url.endsWith('/git/ref/heads/main'))return Response.json({object:{sha:head}});
  if(url.endsWith('/git/commits/'+head))return Response.json({tree:{sha:'c'.repeat(40)}});
  if(url.endsWith('/git/trees'))return Response.json({sha:'d'.repeat(40)});
  if(url.endsWith('/git/commits'))return Response.json({sha:created});
  if(url.endsWith('/pulls'))return Response.json({number:5,html_url:'https://github.com/www-infinity4/RecordB/pull/5',head:{sha:created}},{status:201});
  if(url.endsWith('/git/refs'))return Response.json({ref:'refs/heads/bubbles/mock',object:{sha:created}},{status:201});
  if(url.endsWith('/www-infinity4/RecordB'))return Response.json({default_branch:'main',permissions:{push:true}});
  return Response.json({},{status:200});
 };
 const result=await directGithubAgent(env,{repository:'www-infinity4/RecordB',request:'Create synthetic/hello.txt',mode:'write'},network,r=>checks.push(r));
 assert.equal(result.ok,true);
 assert.equal(result.status,'committed_unverified');
 assert.equal(result.testsVerified,false);
 assert.equal(result.deploymentVerified,false);
 assert.ok(checks.some(r=>r.status==='committed_unverified'));
 assert.ok(checks.some(r=>r.status==='pull_request_open'));
 const tree=writes.find(w=>w.url.endsWith('/git/trees'));
 assert.ok(tree);
 assert.equal(tree.body.tree[0].path,'synthetic/hello.txt');
 assert.equal(tree.body.tree[0].content,'Hello from Bubbles QA\n');
 assert.ok(!writes.some(w=>/user\/repos/.test(w.url)),'file create must not create a second repo');
});
test('repository creation contract is explicit and does not report verified CI or deployment',async()=>{
 const calls=[];
 const network=async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith('/user'))return Response.json({login:'www-infinity4'});
  if(url.endsWith('/user/repos'))return Response.json({full_name:'www-infinity4/Bubbles-QA',owner:{login:'www-infinity4'},html_url:'https://github.com/www-infinity4/Bubbles-QA',default_branch:'main',private:true},{status:201});
  return Response.json({commit:{sha:'b'.repeat(40)}},{status:201});
 };
 const result=await githubOperation({GITHUB_TOKEN:'fixture-only'},{repository:'www-infinity4/Bubbles-QA',action:'create_repository',private:true,description:'Isolated test'},network);
 assert.equal(result.status,'repository_created');
 assert.equal(result.private,true);
 assert.equal(result.testsPassed,false);
 assert.equal(result.deployed,false);
 assert.deepEqual(JSON.parse(calls[1].options.body).private,true);
 assert.ok(calls.every(c=>c.options.redirect==='manual'));
});
