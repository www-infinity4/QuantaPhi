import test from 'node:test';
import assert from 'node:assert/strict';
import {readGithubFile,readGithubRepository,readPublicGithubRawMain,chooseTool} from '../workers/bubbles-tools/worker.mjs';
import {needsReadAgent} from '../workers/bubbles-tools/read-agent.mjs';
const origin='https://quantaphi.org';
const req=new Request('https://bubbles-tools.example/v1/assist',{headers:{Origin:origin}});
const receipt={id:'synthetic_403_probe',tool:'github.read_file',status:'started'};
const repo='www-infinity4/QuantaPhi';
const api='https://api.github.com/repos/'+repo;
const raw='https://raw.githubusercontent.com/'+repo+'/refs/heads/main/README.md';
const source='# QuantaPhi\n\nBubbles provides Oracle chat and shared search.';
function mockPublic({rawStatus=200,rawBody=source,rawContentType='text/plain',apiStatus=403}={}){
 const seen=[];
 const fetcher=async (url,options)=>{
  seen.push({url,options});
  if(url.startsWith(api))return new Response('API temporarily blocked',{status:apiStatus});
  if(url===raw)return new Response(rawBody,{status:rawStatus,headers:{'content-type':rawContentType}});
  throw Error('unexpected_external_host');
 };
 return {seen,fetcher};
}
test('after REST 403 the direct file reader verifies real public raw README text',async()=>{
 const {seen,fetcher}=mockPublic();
 const r=await readGithubFile(req,{request:'Read README.md',repository:repo,path:'README.md'},receipt,fetcher);
 const x=await r.json();
 assert.equal(x.receipt.status,'complete');
 assert.equal(x.receipt.sourceReadVerified,true);
 assert.equal(x.receipt.provider,'github-raw-public');
 assert.equal(x.receipt.repositoryActionsVerified,false);
 assert.equal(x.content,source);
 assert.equal(x.sourceUrl,'https://github.com/'+repo+'/blob/main/README.md');
 assert.deepEqual(seen.map(x=>x.url),[api+'/contents/README.md',raw]);
 assert.ok(seen.every(x=>x.options?.redirect==='manual'));
 assert.ok(seen.every(x=>!x.options?.headers?.Authorization));
});
test('when REST repository listing fails, only README is verified; root is explicitly unverified',async()=>{
 const {seen,fetcher}=mockPublic();
 const r=await readGithubRepository(req,{request:'Read repo '+repo,repository:repo},receipt,fetcher);
 const x=await r.json();
 assert.equal(x.receipt.status,'complete');
 assert.equal(x.receipt.provider,'github-raw-public');
 assert.equal(x.receipt.rootListingVerified,false);
 assert.deepEqual(x.contents,[{name:'README.md',type:'file'}]);
 assert.match(x.output,/Root directory listing and other files were NOT verified/);
 assert.deepEqual(seen.map(x=>x.url),[api,api+'/contents',raw]);
});
test('a private or absent raw source is not upgraded to a success',async()=>{
 const {fetcher}=mockPublic({rawStatus:404});
 const file=await (await readGithubFile(req,{request:'Read README.md',repository:repo,path:'README.md'},receipt,fetcher)).json();
 assert.equal(file.receipt.status,'failed');
 assert.equal(file.receipt.sourceReadVerified,undefined);
 const root=await (await readGithubRepository(req,{request:'Read repo '+repo,repository:repo},receipt,fetcher)).json();
 assert.equal(root.receipt.status,'failed');
 assert.equal(root.receipt.sourceReadVerified,undefined);
});
test('raw reader rejects redirects, HTML impostors, bad paths and excessive bytes',async()=>{
 for(const variant of [
  {rawStatus:302,rawBody:'moved'},
  {rawContentType:'text/html',rawBody:'<html>login</html>'},
  {rawBody:'x'.repeat(400001)}
 ]){
  const {fetcher}=mockPublic(variant);
  await assert.rejects(()=>readPublicGithubRawMain(repo,'README.md',fetcher));
 }
 const mock=mockPublic();
 await assert.rejects(()=>readPublicGithubRawMain('someone/../../owner','.env',mock.fetcher),/github_raw_path_invalid/);
 await assert.rejects(()=>readPublicGithubRawMain(repo,'src/../credentials.json',mock.fetcher),/github_raw_path_invalid/);
 assert.equal(mock.seen.length,0);
});
test('403 fallback does not activate for 404 or falsely claim repo listing',async()=>{
 const {seen,fetcher}=mockPublic({apiStatus:404});
 const x=await (await readGithubFile(req,{request:'Read README.md',repository:repo,path:'README.md'},receipt,fetcher)).json();
 assert.equal(x.receipt.status,'failed');
 assert.deepEqual(seen.map(x=>x.url),[api+'/contents/README.md']);
});

test('explicit single README read avoids speculative root listing; true multi-source still plans reads',()=>{
 const q='Bubbles, read the actual README.md from GitHub repository www-infinity4/QuantaPhi, then tell me one detail the file contains.';
 assert.equal(needsReadAgent(q),false);
 assert.equal(chooseTool(q),'github.read_file');
 assert.equal(needsReadAgent('Inspect www-infinity4/QuantaPhi and read its main documentation'),true);
 assert.equal(needsReadAgent('Read the GitHub README and get the weather in Albia Iowa'),true);
});
