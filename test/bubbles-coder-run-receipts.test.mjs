import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {githubOperation} from '../workers/infinity-brain-clock/direct-github.mjs';

test('Bubbles Coder reads real Linux workflow receipts instead of unrelated jobs', async()=>{
 const requests=[];
 const fakeFetch=async(url)=>{
  requests.push(url);
  return {ok:true,status:200,json:async()=>({workflow_runs:[
   {id:500,name:'Bubbles Coder Linux Sandbox',status:'completed',conclusion:'success',
    created_at:'2026-10-17T04:00:00Z',updated_at:'2026-10-17T04:01:00Z',
    event:'workflow_dispatch',head_sha:'a'.repeat(40),html_url:'https://github.com/example/action/500'}
  ]})};
 };
 const result=await githubOperation({GITHUB_TOKEN:'test-token'},{
  repository:'www-infinity4/QuantaPhi',action:'list_workflow_runs',
  workflow:'bubbles-coder-sandbox.yml'},fakeFetch);
 assert.equal(result.status,'runs_read_only');
 assert.equal(result.workflow,'bubbles-coder-sandbox.yml');
 assert.equal(result.runs.length,1);
 assert.equal(result.runs[0].status,'completed');
 assert.equal(result.runs[0].conclusion,'success');
 assert.equal(result.runs[0].createdAt,'2026-10-17T04:00:00Z');
 assert.equal(requests.length,1);
 assert.match(requests[0],/\/actions\/workflows\/bubbles-coder-sandbox\.yml\/runs\?per_page=10$/);
});

test('Bubbles Coder enforces file-like workflow identifiers before GitHub request', async()=>{
 const fakeFetch=async()=>{throw Error('invalid input touched remote GitHub');};
 await assert.rejects(githubOperation({GITHUB_TOKEN:'test-token'},{
  repository:'www-infinity4/QuantaPhi',action:'list_workflow_runs',
  workflow:'../../etc/passwd'},fakeFetch),/invalid_workflow_name/);
});

test('Bubbles presents source run status and still calls GitHub directly',()=>{
 const app=fs.readFileSync('bubbles-ai.js','utf8');
 assert.match(app,/args\.action='list_workflow_runs'/);
 assert.match(app,/Bubbles Coder Linux runs:/);
 assert.match(app,/Only a completed successful run confirms that the script ran/);
 assert.match(app,/Linux job requested\. This is an acceptance receipt, not an execution result/);
});
