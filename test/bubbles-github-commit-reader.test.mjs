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


test('public GitHub Atom and SHA patch recover a verified commit when REST returns 403',async()=>{
 const commit='b'.repeat(40),repo='www-infinity4/QuantaPhi',seen=[];
 const fetcher=async(url,opts)=>{
  seen.push({url,redirect:opts?.redirect});
  if(url.startsWith('https://api.github.com/'))return Response.json({message:'rate limit'},{status:403});
  if(url==='https://github.com/'+repo+'/commits/main.atom')
   return new Response('<feed><entry><link href="https://github.com/'+repo+'/commit/'+commit+'" rel="alternate"/></entry></feed>',{headers:{'Content-Type':'application/atom+xml'}});
  if(url==='https://github.com/'+repo+'/commit/'+commit+'.patch')
   return new Response('From '+commit+' Mon Sep 17 00:00:00 2001\nSubject: [PATCH] Fix real Bubbles\n\n---\ndiff --git a/bubbles-ai.js b/bubbles-ai.js\nindex 123..234 100644\n--- a/bubbles-ai.js\n+++ b/bubbles-ai.js\n@@ -1 +1 @@\n-old\n+new\n',{headers:{'Content-Type':'text/plain'}});
  throw Error('unexpected '+url);
 };
 const res=await readGithubCommit(new Request('https://tools'),{request:'Show latest commit in '+repo},{id:'s'},fetcher);
 const v=await res.json();
 assert.equal(v.receipt.status,'complete');assert.equal(v.receipt.sourceReadVerified,true);
 assert.equal(v.receipt.provider,'github-public-patch');
 assert.equal(v.commitSha,commit);assert.equal(v.files[0].path,'bubbles-ai.js');
 assert.equal(v.walletCredited,false);
 assert.ok(seen.every(x=>x.redirect==='manual'),'never follow untrusted redirect');
});
test('public patch fallback rejects forged SHA, redirects, empty files and foreign feed links',async()=>{
 const commit='c'.repeat(40),bad='d'.repeat(40),repo='www-infinity4/QuantaPhi';
 for(const mode of ['spoofed','redirect','empty','foreign-feed']){
  const fetcher=async(url)=>{
   if(url.startsWith('https://api.github.com/'))return Response.json({message:'limited'},{status:429});
   if(url.endsWith('.atom'))return new Response('<feed><entry><link href="'+(mode==='foreign-feed'?'https://evil.example/x':'https://github.com/'+repo+'/commit/'+commit)+'"/></entry></feed>');
   if(url.endsWith('.patch'))return mode==='redirect'?new Response(null,{status:302,headers:{Location:'https://evil.example/'}}):new Response(mode==='empty'?'From '+commit+' Mon Sep 17 00:00:00 2001\nSubject: [PATCH] Missing diff':'From '+bad+' Mon Sep 17 00:00:00 2001\nSubject: [PATCH] forged\n\ndiff --git a/evil.js b/evil.js\n');
   throw Error('unapproved url '+url);
  };
  const res=await readGithubCommit(new Request('https://tools'),{request:'Show latest commit in '+repo},{id:'f'},fetcher);
  const v=await res.json();
  assert.notEqual(v.receipt.status,'complete',mode);
  assert.equal(v.receipt.sourceReadVerified,false,mode);
  assert.equal(v.walletCredited,undefined,mode);
 }
});
