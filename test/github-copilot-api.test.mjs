import test from 'node:test';
import assert from 'node:assert/strict';
import {githubCopilotRequest} from '../workers/bubbles-connections/github-copilot-api.mjs';
const sha='a'.repeat(40);
const mock=(handler)=>async (url,options)=>Response.json(handler(new URL(url),options));
const args={accessToken:'test-secret',repository:'testowner/testrepo'};
test('rejects unverified tokens and malformed repositories before requests',async()=>{
 await assert.rejects(githubCopilotRequest({...args,accessToken:''},()=>assert.fail()),/connection_not_verified/);
 await assert.rejects(githubCopilotRequest({...args,repository:'https://evil.test'},()=>assert.fail()),/repository_invalid/);
});
test('creates Copilot issue with official assignee and does not claim PR exists',async()=>{
 let seen;
 const result=await githubCopilotRequest({...args,action:'build',prompt:'Build an accessible landing page and add tests'},mock((url,opt)=>{
  seen=JSON.parse(opt.body);
  assert.equal(url.pathname,'/repos/testowner/testrepo/issues');
  assert.equal(opt.headers.Authorization,'Bearer test-secret');
  return {number:5,html_url:'https://github.com/testowner/testrepo/issues/5',assignees:[{login:'copilot-swe-agent[bot]'}]};
 }));
 assert.equal(seen.assignees[0],'copilot-swe-agent[bot]');
 assert.equal(result.status,'copilot_assigned');
 assert.equal(result.issue,5);
});
test('lists PRs without exposing tokens',async()=>{
 const result=await githubCopilotRequest({...args,action:'prs'},mock(()=>[{number:7,title:'Fix UI',draft:true,head:{sha},html_url:'https://github.com/testowner/testrepo/pull/7'}]));
 assert.equal(result.prs[0].number,7);
 assert.ok(!JSON.stringify(result).includes('test-secret'));
});
test('merge requires typed confirmation and passing CI',async()=>{
 await assert.rejects(githubCopilotRequest({...args,action:'merge',prNumber:3,confirmation:'yes'},()=>assert.fail()),/merge_confirmation_required/);
 let calls=[];
 await assert.rejects(githubCopilotRequest({...args,action:'merge',prNumber:3,confirmation:'MERGE testowner/testrepo#3'},mock((url)=>{
  calls.push(url.pathname);
  if(url.pathname.endsWith('/pulls/3'))return {state:'open',draft:false,mergeable:true,head:{sha}};
  if(url.pathname.endsWith('/status'))return {state:'success',total_count:1};
  if(url.pathname.endsWith('/check-runs'))return {check_runs:[{status:'completed',conclusion:'failure'}],total_count:1};
  throw Error('must not merge');
 })),/merge_checks_not_passed/);
 assert.ok(!calls.some(path=>path.endsWith('/merge')));
});
test('successful guarded merge returns verified SHA',async()=>{
 const result=await githubCopilotRequest({...args,action:'merge',prNumber:3,confirmation:'MERGE testowner/testrepo#3'},mock((url)=>{
  if(url.pathname.endsWith('/pulls/3'))return {state:'open',draft:false,mergeable:true,head:{sha}};
  if(url.pathname.endsWith('/status'))return {state:'success',total_count:1};
  if(url.pathname.endsWith('/check-runs'))return {check_runs:[{status:'completed',conclusion:'success'}],total_count:1};
  if(url.pathname.endsWith('/merge'))return {merged:true,sha};
  throw Error('unknown');
 }));
 assert.equal(result.status,'merged');assert.equal(result.commit,sha);
});
