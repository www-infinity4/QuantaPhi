import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {githubOperation,directGithubAgent} from '../workers/infinity-brain-clock/direct-github.mjs';
const repository='www-infinity4/QuantaPhi',sha='a'.repeat(40),next='b'.repeat(40);
test('direct GitHub HTTP endpoint requires the existing owner session before forwarding',async()=>{
 const source=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8')
  .replace(/^import .*;\n/gm,'').replace(/export (?=(?:async )?function|class)/g,'').replace('export default{','return {');
 const handler=new Function('DurableObject',source)(class{});
 let forwarded=0;
 const env={CLOCK:{get:()=>({fetch:async()=>{forwarded++;return Response.json({ok:true,status:'credential_verified_read'});}}),idFromName:()=>1}};
 const denied=await handler.fetch(new Request('https://brain.test/work/github',{method:'POST',headers:{Origin:'https://quantaphi.org'},body:'{}'}),env);
 assert.equal(denied.status,401);assert.equal(forwarded,0);
 const owner='test-owner';env.WRITER_OWNER_HASH=Buffer.from(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(owner))).toString('hex');
 const accepted=await handler.fetch(new Request('https://brain.test/work/github',{method:'POST',headers:{Origin:'https://quantaphi.org',Authorization:'Bearer '+owner},body:JSON.stringify({repository,action:'capabilities',requestId:crypto.randomUUID()})}),env);
 assert.equal(accepted.status,200);assert.equal(forwarded,1);
});
test('missing server credential reports a blocker without making a network call',async()=>{
 const result=await githubOperation({}, {repository,action:'capabilities'},()=>{throw Error('unexpected network')});
 assert.equal(result.error,'github_runtime_credential_missing');assert.equal(result.capabilities.push,false);
});
test('repository scope, paths and branch changes are enforced before writes',async()=>{
 await assert.rejects(githubOperation({GITHUB_TOKEN:'test'}, {repository:'other/repo',action:'read_repository'}),/explicit_owner_repository/);
 await assert.rejects(githubOperation({GITHUB_TOKEN:'test'}, {repository,action:'read_file',ref:sha,path:'../secret'}),/invalid_repository_path/);
 const writes=[];
 const network=async(url,options)=>{if(options.method!=='GET')writes.push(url);return Response.json({object:{sha:next}});};
 await assert.rejects(githubOperation({GITHUB_TOKEN:'test'}, {repository,action:'commit_files',branch:'bubbles/test',baseSha:sha,message:'Fix menu',files:[{path:'menu.js',content:'ok'}]},network),/branch_changed/);
 assert.deepEqual(writes,[]);
});
test('a push uses a pinned parent and non-force ref update; it is not a test or deployment receipt',async()=>{
 const calls=[];
 const network=async(url,options)=>{
  calls.push({url,...options,body:options.body&&JSON.parse(options.body)});
  if(url.includes('/git/ref/'))return Response.json({object:{sha}});
  if(url.endsWith('/git/commits/'+sha))return Response.json({tree:{sha:'c'.repeat(40)}});
  if(url.endsWith('/git/trees'))return Response.json({sha:'d'.repeat(40)});
  if(url.endsWith('/git/commits'))return Response.json({sha:next});
  return Response.json({});
 };
 const result=await githubOperation({GITHUB_TOKEN:'test'}, {repository,action:'commit_files',branch:'bubbles/test',baseSha:sha,message:'Fix menu',files:[{path:'menu.js',content:'ok'}]},network);
 assert.equal(result.commitSha,next);assert.equal(result.testsPassed,false);assert.equal(result.deployed,false);
 assert.deepEqual(calls.find(c=>c.url.endsWith('/git/commits')).body.parents,[sha]);
 assert.equal(calls.at(-1).body.force,false);
});
test('Actions acceptance is distinguished from a running or completed workflow',async()=>{
 const calls=[];
 const network=async(url,options)=>{calls.push({url,...options});return options.method==='POST'?new Response(null,{status:204}):Response.json({state:'active',html_url:'https://github.com/'+repository+'/actions'});};
 const result=await githubOperation({GITHUB_TOKEN:'test'}, {repository,action:'dispatch_workflow',workflow:'bubbles-android.yml',ref:'main'},network);
 assert.equal(result.status,'dispatch_accepted');assert.equal(result.completed,false);assert.equal(calls.length,2);
 assert.equal(calls[1].headers.Authorization,'Bearer test');
 assert.ok(!JSON.stringify(result).includes('Bearer'));
});
test('Cloudflare Worker GitHub requests use manual redirects and do not follow redirected bearer tokens',async()=>{
 const calls=[];
 const redirected=async(url,options)=>{
  calls.push({url,redirect:options.redirect,token:options.headers.Authorization});
  return new Response(null,{status:302,headers:{Location:'https://unexpected.example/receive-token'}});
 };
 await assert.rejects(githubOperation({GITHUB_TOKEN:'fixture-token'}, {repository,action:'capabilities'},redirected),/github_http_302/);
 assert.equal(calls.length,1);
 assert.equal(calls[0].redirect,'manual');
 assert.equal(calls[0].token,'Bearer fixture-token');
 const ownerCalls=[];
 const ownerRedirect=async(url,options)=>{ownerCalls.push({url,redirect:options.redirect});return new Response(null,{status:302,headers:{Location:'https://unexpected.example'}});};
 await assert.rejects(githubOperation({GITHUB_TOKEN:'fixture-token'}, {repository:'www-infinity4/New-App',action:'create_repository'},ownerRedirect),/github_repository_creation_owner_mismatch/);
 assert.equal(ownerCalls.length,1);
 assert.equal(ownerCalls[0].redirect,'manual');
});
test('a read-only direct request cannot be turned into a write by model or source text',async()=>{
 const env={GITHUB_TOKEN:'test',WRITER_AI:{run:async()=>({response:JSON.stringify({action:'commit_files',args:{}})})}};
 let calls=0;
 await assert.rejects(directGithubAgent(env,{repository,request:'Inspect the menu',mode:'read'},async()=>{calls++;return Response.json({default_branch:'main'});}),/direct_write_not_requested/);
 assert.equal(calls,1);
});
test('direct agent checkpoints real operation receipts before its final explanation',async()=>{
 const steps=[{action:'list_runs',args:{}},{action:'finish',summary:'Inspected current runs.'}],saved=[];
 const env={GITHUB_TOKEN:'test',WRITER_AI:{run:async()=>({response:JSON.stringify(steps.shift())})}};
 const result=await directGithubAgent(env,{repository,request:'Inspect GitHub runs',mode:'read'},async url=>Response.json(url.includes('/actions/runs')?{workflow_runs:[]}:{default_branch:'main'}),async r=>saved.push(r));
 assert.equal(saved.length,1);assert.equal(result.testsVerified,false);assert.equal(result.receipts.length,1);
});
test('repository creation uses the owner account API and provisions Python/Node Actions without exposing the key',async()=>{
 const calls=[];
 const network=async(url,options)=>{calls.push({url,options});if(url.endsWith('/user'))return Response.json({login:'www-infinity4'});if(url.endsWith('/user/repos'))return Response.json({full_name:'www-infinity4/New-App',html_url:'https://github.com/www-infinity4/New-App',default_branch:'main',private:false},{status:201});return Response.json({commit:{sha:next}},{status:201});};
 const result=await githubOperation({GITHUB_TOKEN:'fixture-token'}, {repository:'www-infinity4/New-App',action:'create_repository'},network);
 assert.equal(result.status,'repository_created');assert.equal(result.environment.status,'configured');assert.equal(result.testsPassed,false);
 assert.equal(JSON.parse(calls[1].options.body).name,'New-App');
 const workflow=Buffer.from(JSON.parse(calls[2].options.body).content,'base64').toString('utf8');
 assert.match(workflow,/setup-python/);assert.match(workflow,/node-version: '22'/);assert.ok(!workflow.includes('fixture-token'));
});
