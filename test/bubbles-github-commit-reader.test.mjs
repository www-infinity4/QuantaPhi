import test from 'node:test';
import assert from 'node:assert/strict';
import {chooseTool,readGithubCommit} from '../workers/bubbles-tools/worker.mjs';
const sha='a'.repeat(40);
function fetcher(url){
 if(url.endsWith('?per_page=1'))return Promise.resolve(Response.json([{sha}]));
 if(url.endsWith('/'+sha))return Promise.resolve(Response.json({sha,commit:{message:'Repair Bubbles accessibility\nTested fixes'},
  files:[{filename:'bubbles-ai.js',status:'modified',additions:3,deletions:1}]}));
 return Promise.resolve(Response.json({message:'Not Found'},{status:404}));
}
test('ordinary Bubbles request selects public GitHub commit receipt, not narration',()=>{
 assert.equal(chooseTool('Show latest commit in www-infinity4/QuantaPhi on GitHub'),'github.read_commit');
 assert.equal(chooseTool('Read a GitHub commit for www-infinity4/QuantaPhi'),'github.read_commit');
 assert.notEqual(chooseTool('Create a new repository in GitHub'),'github.read_commit');
});
test('verified commit reader includes changed files, immutable URL and unpaid boundary',async()=>{
 const r=await readGithubCommit(new Request('https://bubbles-tools/v1/assist'),{request:'Show latest commit in www-infinity4/QuantaPhi'}, {id:'x'},fetcher);
 const data=await r.json();
 assert.equal(data.receipt.status,'complete');
 assert.equal(data.receipt.tool,'github.read_commit');
 assert.equal(data.receipt.sourceReadVerified,true);
 assert.equal(data.receipt.repositoryActionsVerified,false);
 assert.equal(data.walletCredited,false);
 assert.equal(data.candidateAsset,'STARCOIN');
 assert.equal(data.commitSha,sha);
 assert.equal(data.sourceUrl,'https://github.com/www-infinity4/QuantaPhi/commit/'+sha);
 assert.equal(data.files[0].path,'bubbles-ai.js');
 assert.match(data.output,/did not pay a token/);
});
test('new HTML index commit is candidate only, never an automatic Infinity credit',async()=>{
 const f=async url=>Response.json({sha,commit:{message:'Create project'},files:[{filename:'new/index.html',status:'added',additions:45}]});
 const r=await readGithubCommit(new Request('https://tools/'),{request:'Read commit '+sha+' in www-infinity4/QuantaPhi',commitSha:sha},{id:'r'},f);
 const data=await r.json();
 assert.equal(data.candidateAsset,'INFINITY');
 assert.equal(data.walletCredited,false);
 assert.match(data.output,/separate search, published HTML and verified build receipts/);
});
test('GitHub 429 and missing repo never become fake balances or commit receipts',async()=>{
 const slow=async()=>Response.json({message:'rate limited'},{status:429});
 for(const args of [{request:'Read commit for www-infinity4/QuantaPhi',commitSha:sha},{request:'Read commit',repository:'?' }]){
  const r=await readGithubCommit(new Request('https://tools/'),args,{id:'z'},slow);
  const data=await r.json();
  assert.equal(data.receipt.sourceReadVerified,false);
  assert.equal(data.receipt.walletCredited,false);
  assert.notEqual(data.receipt.status,'complete');
 }
});
