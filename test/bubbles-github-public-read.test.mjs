import test from 'node:test';import assert from 'node:assert/strict';
import {chooseTool,readGithubRepository} from '../workers/bubbles-tools/worker.mjs';
const req=new Request('https://bubbles-tools.example/v1/assist',{headers:{Origin:'https://quantaphi.org'}});
const receipt={id:'test-ground',tool:'github.read_repository',status:'started',minted:false};
test('spoken open/read repo no longer triggers CREATE repository workflow',()=>{
 assert.equal(chooseTool('Pull up the repository www-infinity4/QuantaPhi'),'github.read_repository');
 assert.equal(chooseTool('Open a GitHub repository called QuantaPhi'),'github.read_repository');
 assert.equal(chooseTool('Create a GitHub repo called NewPhi'),'github.create_repository');
});
test('a real public GitHub read names verified files, never creates anything',async()=>{
 const seen=[];
 const fetcher=async url=>{
  seen.push(url);
  if(url==='https://api.github.com/repos/www-infinity4/QuantaPhi')return Response.json({full_name:'www-infinity4/QuantaPhi',default_branch:'main'});
  if(url==='https://api.github.com/repos/www-infinity4/QuantaPhi/contents')return Response.json([{name:'bubbles-ai.js',type:'file'},{name:'test-ground-ai',type:'dir'},{name:'index.html',type:'file'}]);
  throw Error('unexpected_external_url');
 };
 const res=await readGithubRepository(req,{request:'Pull up repository www-infinity4/QuantaPhi and identify Bubbles files.'},receipt,fetcher);
 const data=await res.json();
 assert.equal(data.receipt.status,'complete');assert.equal(data.receipt.sourceReadVerified,true);
 assert.equal(data.receipt.repositoryActionsVerified,false);
 assert.equal(data.receipt.minted,false);
 assert.match(data.output,/bubbles-ai\.js/);
 assert.deepEqual(seen,['https://api.github.com/repos/www-infinity4/QuantaPhi','https://api.github.com/repos/www-infinity4/QuantaPhi/contents']);
});
test('denied or private reads fail closed with no forged GitHub evidence',async()=>{
 const fail=async()=>new Response('Forbidden',{status:403});
 const res=await readGithubRepository(req,{request:'Read repository www-infinity4/PrivateCoin'},receipt,fail);
 const data=await res.json();assert.equal(data.receipt.status,'failed');
 assert.equal(data.receipt.repositoryActionsVerified,false);
 assert.equal(data.receipt.sourceReadVerified,undefined);
});
