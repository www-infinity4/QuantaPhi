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
