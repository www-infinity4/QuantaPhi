import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readGithubRepository,readGithubFile,authenticatedGithubSource} from '../workers/bubbles-tools/worker.mjs';
import {githubOperation} from '../workers/infinity-brain-clock/direct-github.mjs';

const repo='www-infinity4/QuantaPhi',sha='a'.repeat(40),treeSha='b'.repeat(40),fileSha='c'.repeat(40);
const token='Bearer rb_'+'7'.repeat(64);
const req=(auth=token)=>new Request('https://bubbles-tools.example/v1/assist',{headers:{Origin:'https://quantaphi.org',...(auth?{Authorization:auth}:{})}});
const receipt={id:'owner-read-probe',tool:'github.read_repository',status:'started',minted:false};
test('verified StarQuest session uses the Brain authenticated root reader and avoids public REST 429',async()=>{
 const calls=[],publicCalls=[];
 const env={BRAIN:{fetch:async(url,options)=>{
  calls.push({url,options});
  return Response.json({ok:true,repository:repo,defaultBranch:'main',headSha:sha,
   sourceUrl:'https://github.com/'+repo+'/tree/'+sha,
   rootListingVerified:true,rootEntryCount:3,
   contents:[{name:'README.md',type:'file'},{name:'workers',type:'dir'},{name:'bubbles-ai.js',type:'file'}]});
 }}};
 const r=await readGithubRepository(req(),{request:'Read '+repo,repository:repo},receipt,async url=>{
  publicCalls.push(url);return new Response('rate limited',{status:429});
 },env);
 const result=await r.json();
 assert.equal(result.receipt.status,'complete');
 assert.equal(result.receipt.provider,'github-owner-authenticated');
 assert.equal(result.receipt.rootListingVerified,true);
 assert.equal(result.receipt.headSha,sha);
 assert.equal(result.contents.length,3);
 assert.match(result.output,/Actual root entries: 3/);
 assert.doesNotMatch(result.output,/README excerpt|NOT verified/);
 assert.equal(publicCalls.length,0);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://brain.internal/work/github/read');
 assert.deepEqual(JSON.parse(calls[0].options.body),{action:'read_repository',repository:repo});
 assert.equal(calls[0].options.headers.Authorization,token);
 assert.equal(calls[0].options.headers.Origin,'https://quantaphi.org');
});
test('verified StarQuest read of a named source returns immutable file SHA and content instead of README fallback',async()=>{
 const calls=[];
 const env={BRAIN:{fetch:async(url,options)=>{
  calls.push(JSON.parse(options.body));
  return Response.json({ok:true,repository:repo,path:'bubbles-ai.js',ref:sha,sha:fileSha,
   content:'// actual verified Bubbles source',truncated:false,
   sourceUrl:'https://github.com/'+repo+'/blob/'+sha+'/bubbles-ai.js'});
 }}};
 const r=await readGithubFile(req(),{request:'Read bubbles-ai.js',repository:repo,path:'bubbles-ai.js'},receipt,async()=>{throw Error('no public call')},env);
 const result=await r.json();
 assert.equal(result.receipt.provider,'github-owner-authenticated');
 assert.equal(result.receipt.sourceReadVerified,true);
 assert.equal(result.receipt.repositoryActionsVerified,false);
 assert.equal(result.path,'bubbles-ai.js');
 assert.equal(result.content,'// actual verified Bubbles source');
 assert.deepEqual(calls,[{action:'read_file',repository:repo,path:'bubbles-ai.js'}]);
});
test('foreign repositories and absent owner sessions never use Brain credential',async()=>{
 let calls=0;
 const env={BRAIN:{fetch:async()=>{calls++;throw Error('owner boundary violated')}}};
 for(const auth of ['', 'Bearer attacker', 'Bearer rb_'+'x'.repeat(64)]){
  const source=await authenticatedGithubSource(req(auth),env,{action:'read_repository',repository:repo});
  assert.equal(source,null);
 }
 assert.equal(await authenticatedGithubSource(req(),env,{action:'read_repository',repository:'third-party/Other'}),null);
 assert.equal(calls,0);
});
test('unverified owner service responses cannot forge verified root or file receipts',async()=>{
 const env={BRAIN:{fetch:async()=>Response.json({ok:true,repository:repo,headSha:sha,contents:[{name:'README.md',type:'file'}]})}};
 assert.equal(await authenticatedGithubSource(req(),env,{action:'read_repository',repository:repo}),null);
 const env2={BRAIN:{fetch:async()=>Response.json({ok:true,repository:repo,path:'README.md',ref:sha,sha:fileSha,content:'# ok'})}};
 assert.equal(await authenticatedGithubSource(req(),env2,{action:'read_file',repository:repo,path:'AGENTS.md'}),null);
});
test('GitHub owner adapter reads an actual pinned root tree and rejects truncated trees',async()=>{
 const calls=[];
 const mock=async(url,options)=>{
  calls.push({url,auth:options.headers.Authorization});
  const base='https://api.github.com/repos/'+repo;
  if(url===base)return Response.json({default_branch:'main'});
  if(url===base+'/git/ref/heads/main')return Response.json({object:{sha}});
  if(url===base+'/git/commits/'+sha)return Response.json({tree:{sha:treeSha}});
  if(url===base+'/git/trees/'+treeSha)return Response.json({sha:treeSha,truncated:false,tree:[
   {path:'README.md',type:'blob'},{path:'workers',type:'tree'},{path:'bubbles-ai.js',type:'blob'},{path:'deep/source.js',type:'blob'}]});
  throw Error('unexpected URL: '+url);
 };
 const r=await githubOperation({GITHUB_TOKEN:'server-only-mock'},{action:'read_repository',repository:repo,includeRoot:true},mock);
 assert.equal(r.rootListingVerified,true);
 assert.equal(r.rootEntryCount,3);
 assert.deepEqual(r.contents,[{name:'README.md',type:'file'},{name:'workers',type:'dir'},{name:'bubbles-ai.js',type:'file'}]);
 assert.equal(r.headSha,sha);
 assert.ok(calls.every(x=>x.auth==='Bearer server-only-mock'));
 const old=await githubOperation({GITHUB_TOKEN:'server-only-mock'},{action:'read_repository',repository:repo},mock);
 assert.equal(old.rootListingVerified,undefined);
 assert.equal(old.headSha,sha);
});
test('Bubbles chat uses verified owner bearer for explicit GitHub reads without exposing it to public site reads',()=>{
 const ui=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const tools=readFileSync(new URL('../workers/bubbles-tools/worker.mjs',import.meta.url),'utf8');
 const brain=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
 assert.match(ui,/!publicPageReadRequested&&!embedded&&ownerReady&&ownerHeaders\?\.Authorization/);
 assert.match(tools,/brain\.internal\/work\/github\/read/);
 assert.match(brain,/path==='\/work\/github\/read'/);
 assert.match(brain,/ownerAuthorized\(env,token\)/);
 assert.match(brain,/path==="\/work\/github\/read"|pathname==='\/github\/read'/);
});
