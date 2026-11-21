import {test} from 'node:test';
import assert from 'node:assert/strict';
import {directGithubAgent,githubOperation} from '../workers/infinity-brain-clock/direct-github.mjs';
import {directGithubTools} from '../workers/infinity-brain-clock/github-tool-schema.mjs';

const repository='www-infinity4/QuantaPhi',sha='a'.repeat(40);
const tool=(name,args={})=>({tool_calls:[{type:'function',function:{name,arguments:JSON.stringify(args)}}]});

test('Bubbles direct editor discovers existing paths through real repository-scoped GitHub code search',async()=>{
 const answers=[
  tool('read_repository'),
  tool('search_code',{query:'Cardone'}),
  tool('read_file',{path:'cards/Cardone.mjs',ref:sha}),
  tool('finish',{summary:'Inspected card source; no changes requested.'})
 ];
 const requests=[];
 const env={GITHUB_TOKEN:'fixture-token',WRITER_AI:{run:async(_model,input)=>{
  assert.ok(input.tools.some(t=>t.function.name==='search_code'));
  return answers.shift();
 }}};
 const result=await directGithubAgent(env,{repository,request:'Find the Gary Cardone card source without editing',mode:'read'},async(url,options={})=>{
  requests.push({url,method:options.method||'GET'});
  if(url.includes('/search/code?'))return Response.json({
   total_count:1,incomplete_results:false,items:[{repository:{full_name:repository},path:'cards/Cardone.mjs',
    html_url:'https://github.com/www-infinity4/QuantaPhi/blob/main/cards/Cardone.mjs',sha}]
  });
  if(url.includes('/git/ref/heads/'))return Response.json({object:{sha}});
  if(url.includes('/contents/cards/Cardone.mjs'))return Response.json({type:'file',size:7,encoding:'base64',content:btoa('source!'),sha});
  if(url==='https://api.github.com/repos/'+repository)return Response.json({default_branch:'main',permissions:{push:true}});
  throw Error('unexpected URL: '+url);
 });
 assert.equal(result.ok,true);
 assert.equal(result.status,'inspected');
 assert.ok(result.receipts.some(r=>r.status==='code_search_results'&&r.scope==='repository'));
 assert.ok(result.receipts.some(r=>r.path==='cards/Cardone.mjs'&&r.content==='source!'));
 assert.ok(requests.find(r=>r.url.includes('repo%3Awww-infinity4%2FQuantaPhi')));
 assert.ok(requests.every(r=>r.method==='GET'));
});

test('repository scope refuses foreign repository names and never searches publicly on failure',async()=>{
 let calls=0;
 const result=await githubOperation({GITHUB_TOKEN:'fixture-token'},
  {action:'search_github_code',scope:'repository',repository:'another-owner/repo',query:'Cardone'},
  async()=>{calls++;throw Error('should not search')});
 assert.equal(result.ok,false);
 assert.equal(result.error,'invalid_repository_scope');
 assert.equal(calls,0);
 assert.ok(directGithubTools('write').some(t=>t.function.name==='search_code'));
});

test('a model saying finish before any GitHub operation cannot claim source inspection',async()=>{
 let calls=0;
 const result=await directGithubAgent({GITHUB_TOKEN:'fixture-token',WRITER_AI:{run:async()=>tool('finish',{summary:'All done.'})}},
  {repository,request:'Inspect current card source',mode:'read'},async url=>{
   calls++;assert.equal(url,'https://api.github.com/repos/'+repository);
   return Response.json({default_branch:'main',permissions:{push:true}});
  });
 assert.equal(calls,1,'only the initial capability probe may run');
 assert.equal(result.ok,false);
 assert.equal(result.status,'blocked');
 assert.equal(result.error,'no_verified_github_operation');
 assert.deepEqual(result.receipts,[]);
});

test('a read receipt cannot satisfy an owner-requested write or workflow dispatch',async()=>{
 for(const [mode,steps,error] of [
  ['write',[tool('read_repository'),tool('finish',{summary:'Fixed card.'})],'requested_write_not_committed'],
  ['actions',[tool('list_workflows'),tool('finish',{summary:'Workflow completed.'})],'requested_workflow_not_dispatched']
 ]){
  const network=async url=>{
   if(url.endsWith('/git/ref/heads/main'))return Response.json({object:{sha}});
   if(url.endsWith('/actions/workflows?per_page=100&page=1'))return Response.json({workflows:[],total_count:0});
   if(url==='https://api.github.com/repos/'+repository)return Response.json({default_branch:'main',permissions:{push:true}});
   throw Error('unexpected request: '+url);
  };
  const env={GITHUB_TOKEN:'fixture-token',WRITER_AI:{run:async()=>steps.shift()}};
  const result=await directGithubAgent(env,{repository,request:'Complete the requested '+mode+' task',mode},network);
  assert.equal(result.ok,false);
  assert.equal(result.status,'blocked');
  assert.equal(result.error,error);
  assert.equal(result.receipts.length,1,'real read receipt remains visible');
  assert.equal(result.testsVerified,false);
  assert.equal(result.deploymentVerified,false);
 }
});

test('exhausting eight real GitHub reads returns partial receipts, never successful completion',async()=>{
 let modelCalls=0;
 const env={GITHUB_TOKEN:'fixture-token',WRITER_AI:{run:async()=>{modelCalls++;return tool('read_repository')}}};
 const result=await directGithubAgent(env,{repository,request:'Inspect repository and finish the source audit',mode:'read'},async url=>{
  if(url.endsWith('/git/ref/heads/main'))return Response.json({object:{sha}});
  if(url==='https://api.github.com/repos/'+repository)return Response.json({default_branch:'main',permissions:{push:true}});
  throw Error('unexpected request: '+url);
 });
 assert.equal(modelCalls,8);
 assert.equal(result.receipts.length,8);
 assert.ok(result.receipts.every(r=>r.ok&&r.headSha===sha));
 assert.equal(result.ok,false);
 assert.equal(result.status,'tool_limit_reached');
 assert.equal(result.error,'direct_engineer_tool_limit_reached');
 assert.equal(result.testsVerified,false);
 assert.equal(result.deploymentVerified,false);
});
