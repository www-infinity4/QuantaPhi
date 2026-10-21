import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {githubOperation,directGithubAgent} from '../workers/infinity-brain-clock/direct-github.mjs';
import {directGithubTools,decodeGithubStep} from '../workers/infinity-brain-clock/github-tool-schema.mjs';
const repository='www-infinity4/QuantaPhi',sha='a'.repeat(40),next='b'.repeat(40);
test('the model receives only primitives appropriate to its authorized task mode',()=>{
 const names=mode=>directGithubTools(mode).map(t=>t.function.name);
 assert.ok(names('read').includes('read_file'));assert.ok(names('read').includes('finish'));
 assert.ok(!names('read').includes('commit_files'));assert.ok(!names('read').includes('dispatch_workflow'));
 assert.ok(names('write').includes('commit_files'));assert.ok(!names('write').includes('dispatch_workflow'));
 assert.ok(names('actions').includes('dispatch_workflow'));assert.ok(!names('actions').includes('commit_files'));
 assert.ok(!JSON.stringify(directGithubTools('write')).includes('GITHUB_TOKEN'));
});
test('structured tool output supports Workers AI, Chat Completions and Responses envelopes',()=>{
 for(const answer of [
  {tool_calls:[{name:'read_file',arguments:{path:'README.md',ref:sha}}]},
  {choices:[{message:{tool_calls:[{function:{name:'read_file',arguments:JSON.stringify({path:'README.md',ref:sha})}}]}}]},
  {output:[{type:'function_call',name:'read_file',arguments:JSON.stringify({path:'README.md',ref:sha})}]}
 ])assert.deepEqual(decodeGithubStep(answer),{action:'read_file',args:{path:'README.md',ref:sha}});
 assert.throws(()=>decodeGithubStep({tool_calls:[{name:'list_runs'},{name:'commit_files'}]}),/single_tool/);
 assert.throws(()=>decodeGithubStep({tool_calls:[{name:'shell',arguments:{command:'anything'}}]}),/unknown_tool/);
 assert.throws(()=>decodeGithubStep({tool_calls:[{name:'read_file',arguments:'[]'}]}),/invalid_arguments/);
});
test('a structured plan executes the real adapter and feeds its actual receipt into the next reasoning step',async()=>{
 const modelInputs=[],receipts=[];
 const outputs=[{tool_calls:[{name:'list_runs',arguments:{}}]},
  {output:[{type:'function_call',name:'finish',arguments:JSON.stringify({summary:'Read actual workflow runs.'})}]}];
 const env={GITHUB_TOKEN:'fixture-token',WRITER_AI:{run:async(model,input)=>{modelInputs.push(structuredClone(input));return outputs.shift();}}};
 const result=await directGithubAgent(env,{repository,request:'Inspect actual workflow runs',mode:'read'},async url=>
  Response.json(url.includes('/actions/runs')?{workflow_runs:[{id:71,status:'completed',conclusion:'failure',head_sha:sha}]}:{default_branch:'main'}),async r=>receipts.push(r));
 assert.equal(result.status,'inspected');assert.equal(result.testsVerified,false);
 assert.equal(receipts[0].runs[0].conclusion,'failure');
 assert.equal(modelInputs[0].tool_choice,'auto');assert.ok(modelInputs[0].tools.length>0);
 assert.match(modelInputs[1].messages.at(-1).content,/"conclusion":"failure"/);
});
test('structured output cannot bypass task mode even when the provider ignores the offered tool list',async()=>{
 const env={GITHUB_TOKEN:'fixture-token',WRITER_AI:{run:async()=>({tool_calls:[{name:'commit_files',arguments:{}}]})}};
 let requests=0;
 const blocked=await directGithubAgent(env,{repository,request:'Inspect source',mode:'read'},async()=>{requests++;return Response.json({default_branch:'main'});});
 assert.equal(blocked.status,'blocked');assert.equal(blocked.error,'direct_write_not_requested');assert.equal(blocked.receipts.length,3);
 assert.equal(requests,1,'only the initial credential/read capability probe occurred');
});
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
 const blocked=await directGithubAgent(env,{repository,request:'Inspect the menu',mode:'read'},async()=>{calls++;return Response.json({default_branch:'main'});});
 assert.equal(blocked.error,'direct_write_not_requested');assert.equal(blocked.status,'blocked');
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

test('repository catalog follows every page and keeps owner scope without changing repositories',async()=>{
 const calls=[];
 const result=await githubOperation({GITHUB_TOKEN:'test'}, {action:'list_repositories'},async(url,options)=>{
  calls.push(url);assert.equal(options.redirect,'manual');assert.equal(options.method,undefined);
  return Response.json(calls.length===1?Array.from({length:100},(_,i)=>({full_name:'www-infinity4/Repo'+i,archived:false})):
   [{full_name:'www-infinity4/QuantaPhi',archived:false},{full_name:'another-owner/Repo',archived:false}]);
 });
 assert.equal(result.complete,true);assert.equal(calls.length,2);assert.equal(result.repositories.length,101);
 assert.ok(result.repositories.every(repo=>repo.repository.startsWith('www-infinity4/')));
});

// Include the Durable Object timeout/idempotency regression in existing CI suites.
import './bubbles-github-timeout.test.mjs';

test('malformed path is corrected with a pinned read and no writes',async()=>{
 const steps=[{action:'read_repository'},{action:'read_file',args:{path:'../secret',ref:sha}},{action:'read_file',args:{path:'README.md',ref:sha}},{action:'finish',summary:'Read source'}];
 const calls=[],inputs=[],saved=[];
 const env={GITHUB_TOKEN:'fixture-secret',WRITER_AI:{run:async(_,input)=>{inputs.push(structuredClone(input));return {response:JSON.stringify(steps.shift())}}}};
 const result=await directGithubAgent(env,{repository,request:'Read README',mode:'read'},async(url,options)=>{
  calls.push({url,method:options.method});
  if(url.includes('/contents/'))return Response.json({type:'file',size:5,encoding:'base64',content:btoa('hello'),sha});
  if(url.includes('/git/ref/'))return Response.json({object:{sha}});
  return Response.json({default_branch:'main'});
 },async r=>saved.push(r));
 assert.equal(result.status,'inspected');assert.equal(saved[1].status,'validation_rejected');assert.equal(saved[1].mutationSubmitted,false);
 assert.match(inputs[2].messages.at(-1).content,/invalid_repository_path/);
 assert.equal(calls.filter(c=>c.url.includes('/contents/')).length,1);assert.ok(calls.every(c=>c.method==='GET'));
 assert.ok(!JSON.stringify(saved).includes('fixture-secret'));
});
test('a rejected proposal followed by finish remains blocked',async()=>{
 const steps=[{action:'shell',args:{}},{action:'finish',summary:'Done'}];
 const result=await directGithubAgent({GITHUB_TOKEN:'test',WRITER_AI:{run:async()=>({response:JSON.stringify(steps.shift())})}},{repository,request:'Inspect',mode:'read'},async()=>Response.json({default_branch:'main'}));
 assert.equal(result.ok,false);assert.equal(result.error,'unresolved_tool_validation');
});
test('ambiguous workflow write is submitted once and never enters correction loop',async()=>{
 let models=0,posts=0;
 const env={GITHUB_TOKEN:'test',WRITER_AI:{run:async()=>{models++;return {tool_calls:[{name:'dispatch_workflow',arguments:{workflow:'check.yml',ref:'main'}}]}}}};
 await assert.rejects(directGithubAgent(env,{repository,request:'Run check.yml on main',mode:'actions'},async(url,options)=>{
  if(options.method==='POST'){posts++;throw Error('inflight_timeout')}
  return Response.json(url.includes('/actions/workflows/')?{state:'active'}:{default_branch:'main'});
 }),/inflight_timeout/);
 assert.equal(posts,1);assert.equal(models,1);
});
test('checkpoint failure cannot be converted into model correction or retried execution',async()=>{
 let models=0;
 await assert.rejects(directGithubAgent({GITHUB_TOKEN:'test',WRITER_AI:{run:async()=>{models++;return {response:JSON.stringify({action:'list_runs'})}}}},{repository,request:'Inspect',mode:'read'},async url=>Response.json(url.includes('/actions/runs')?{workflow_runs:[]}:{default_branch:'main'}),async()=>{throw Error('checkpoint_failed')}),/checkpoint_failed/);
 assert.equal(models,1);
});

test('workflow run evidence preserves failed steps and in-progress state without claiming deployment',async()=>{
 const calls=[];
 const result=await githubOperation({GITHUB_TOKEN:'fixture-secret'},{repository,action:'read_run',runId:71},async(url,options)=>{
  calls.push({url,...options});
  return Response.json(url.includes('/jobs?')?{total_count:1,jobs:[{id:81,run_id:71,name:'Python checks',status:'in_progress',conclusion:null,steps:[{number:1,name:'Lint',status:'completed',conclusion:'failure'},{number:2,name:'Tests',status:'queued',conclusion:null}]}]}:{id:71,repository:{full_name:repository},head_sha:sha,status:'in_progress',conclusion:null,path:'.github/workflows/check.yml',run_attempt:2});
 });
 assert.equal(result.run.status,'in_progress');assert.equal(result.run.conclusion,null);assert.equal(result.run.headSha,sha);assert.equal(result.run.attempt,2);
 assert.equal(result.jobs[0].steps[0].conclusion,'failure');assert.equal(result.jobs[0].steps[1].status,'queued');
 assert.equal(result.jobsComplete,true);assert.equal(result.deploymentVerified,false);assert.equal(result.hardwareVerified,false);
 assert.ok(calls.every(c=>c.method==='GET'&&c.redirect==='manual'));assert.ok(!JSON.stringify(result).includes('fixture-secret'));
});
test('run IDs and repository/run identities are checked before further reads',async()=>{
 let calls=0;
 for(const runId of [0,-1,'71',1.5,Number.MAX_SAFE_INTEGER+1])await assert.rejects(githubOperation({GITHUB_TOKEN:'test'},{repository,action:'read_run',runId},async()=>{calls++;throw Error('unexpected')}),/explicit_workflow_run_id/);
 assert.equal(calls,0);
 for(const run of [{id:72,repository:{full_name:repository},head_sha:sha},{id:71,repository:{full_name:'other/repo'},head_sha:sha},{id:71,repository:{full_name:repository},head_sha:'main'}]){
  await assert.rejects(githubOperation({GITHUB_TOKEN:'test'},{repository,action:'read_run',runId:71},async()=>{calls++;return Response.json(run)}),/run_identity_mismatch/);
 }
 assert.equal(calls,3);
});
test('run job discovery follows pagination and fails closed on oversized, missing or duplicate evidence',async()=>{
 const run={id:71,repository:{full_name:repository},head_sha:sha,run_attempt:1,status:'completed',conclusion:'success'};
 const jobs=Array.from({length:100},(_,i)=>({id:i+1,run_id:71,steps:[],status:'completed',conclusion:'success'}));
 const calls=[];
 const result=await githubOperation({GITHUB_TOKEN:'test'},{repository,action:'read_run',runId:71},async url=>{calls.push(url);return Response.json(!url.includes('/jobs?')?run:{total_count:101,jobs:url.includes('page=2')?[{id:101,run_id:71,steps:[]}]:jobs})});
 assert.equal(result.jobs.length,101);assert.equal(calls.length,3);assert.ok(calls[1].includes('/attempts/1/jobs?'));
 for(const body of [{total_count:201,jobs:[]},{total_count:2,jobs:[jobs[0]]},{total_count:2,jobs:[jobs[0],jobs[0]]},{total_count:1,jobs:[{id:1,run_id:72,steps:[]}]}]){
  await assert.rejects(githubOperation({GITHUB_TOKEN:'test'},{repository,action:'read_run',runId:71},async url=>Response.json(url.includes('/jobs?')?body:run)),/jobs_|job_identity/);
 }
});
test('workflow discovery returns later pages and refuses an incomplete catalog',async()=>{
 const rows=Array.from({length:100},(_,i)=>({id:i,name:'Workflow '+i,path:'.github/workflows/test'+i+'.yml',state:'active'}));
 const result=await githubOperation({GITHUB_TOKEN:'test'},{repository,action:'list_workflows'},async url=>Response.json({total_count:101,workflows:url.includes('page=2')?[{id:101,name:'Python toolbox',path:'.github/workflows/python.yml',state:'active'}]:rows}));
 assert.equal(result.complete,true);assert.equal(result.workflows.at(-1).id,101);
 await assert.rejects(githubOperation({GITHUB_TOKEN:'test'},{repository,action:'list_workflows'},async()=>Response.json({total_count:2,workflows:[rows[0]]})),/catalog_incomplete/);
});
test('native run inspection feeds actual job failure back into model context',async()=>{
 const steps=[{tool_calls:[{name:'read_run',arguments:{runId:71}}]},{tool_calls:[{name:'finish',arguments:{summary:'Lint failed.'}}]}],inputs=[];
 const result=await directGithubAgent({GITHUB_TOKEN:'test',WRITER_AI:{run:async(_,input)=>{inputs.push(structuredClone(input));return steps.shift()}}},{repository,request:'Why did run 71 fail?',mode:'read'},async url=>Response.json(url.includes('/jobs?')?{total_count:1,jobs:[{id:81,run_id:71,steps:[{name:'Ruff',status:'completed',conclusion:'failure'}]}]}:url.includes('/actions/runs/')?{id:71,repository:{full_name:repository},head_sha:sha,run_attempt:1,status:'completed',conclusion:'failure'}:{default_branch:'main'}));
 assert.equal(result.status,'inspected');assert.match(inputs[1].messages.at(-1).content,/"name":"Ruff"/);assert.match(inputs[1].messages.at(-1).content,/"conclusion":"failure"/);
 for(const mode of ['read','write','actions'])assert.ok(directGithubTools(mode).some(t=>t.function.name==='read_run'));
});

test('Brain rejects truncated repository names before any GitHub API call',async()=>{
 let calls=0;
 const request=async()=>{calls++;return Response.json({})};
 for(const name of ['a','the','new']){
  const result=await githubOperation({GITHUB_TOKEN:'fixture-token'},{repository:'www-infinity4/'+name,action:'create_repository'},request);
  assert.equal(result.status,'blocked');
  assert.equal(result.error,'ambiguous_repository_name');
 }
 assert.equal(calls,0);
});

test('repeated create RecordB returns a verified existing repository instead of a misleading error',async()=>{
 const calls=[];
 const network=async(url,options)=>{
  calls.push({url,method:options.method||'GET'});
  if(url==='https://api.github.com/user')return Response.json({login:'www-infinity4'});
  if(url==='https://api.github.com/user/repos')return Response.json({message:'Name already exists'},{status:422});
  if(url==='https://api.github.com/repos/www-infinity4/RecordB')
   return Response.json({full_name:'www-infinity4/RecordB',owner:{login:'www-infinity4'},html_url:'https://github.com/www-infinity4/RecordB',default_branch:'main',private:false});
  throw Error('unexpected URL '+url);
 };
 const result=await githubOperation({GITHUB_TOKEN:'fixture'},{
  repository:'www-infinity4/RecordB',action:'create_repository',description:'Screen recorder card'},network);
 assert.equal(result.status,'repository_already_exists');
 assert.equal(result.ok,true);
 assert.equal(result.testsPassed,false);
 assert.equal(calls.length,3);
});
