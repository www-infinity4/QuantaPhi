import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chooseTool,readPublicPage} from '../workers/bubbles-tools/worker.mjs';

test('Bubbles reads named public README through real source receipt before generic conversational model',async()=>{
 const src=await readFile(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const first=src.indexOf("const sourceReadRequested=");
 const generic=src.indexOf("if(!embedded&&/\\bgithub\\b/i.test(request))");
 assert.ok(first>0&&generic>first,'verified source-read route must precede generic GitHub discovery');
 const part=src.slice(first,generic);
 assert.match(part,/receipt\?\.tool!==expectedReadTool/);
 assert.match(part,/receipt\?\.sourceReadVerified!==true/);
 assert.match(part,/result\.sourceUrl/);
 assert.match(part,/bubblesFetch\(AI/);
 assert.match(part,/status\.textContent='Bubbles · '\+expectedReadTool\+' · verified'/);
 assert.match(part,/No source content or repository change is being claimed/);
 assert.doesNotMatch(part,/submitRepositoryWork|startRunner|requestRunner|createGithubRepository/);
});

test('Bubbles routes public QuantaPhi HTML to webpage reading, not GitHub file reading',async()=>{
 const question='Read https://quantaphi.org/bubbles.html and tell me what account connection requirements it actually states. Use the page content and say if you cannot fetch it.';
 assert.equal(chooseTool(question),'web.read_page');
 assert.equal(chooseTool('Read the QuantaPhi README from www-infinity4/QuantaPhi'),'github.read_file');
 const src=await readFile(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.match(src,/const publicPageReadRequested=/);
 assert.match(src,/const sourceReadRequested=!publicPageReadRequested/);
 assert.match(src,/const expectedReadTool=publicPageReadRequested\?'web\.read_page':'github\.read_file'/);
 assert.match(src,/result\.receipt\?\.tool!==expectedReadTool/);
});
test('bounded first-party HTML reader verifies actual page text and no model-only GitHub claim',async()=>{
 const request=new Request('https://bubbles-tools.example/v1/assist');
 const question='Read https://quantaphi.org/bubbles.html and explain it';
 const html='<!doctype html><html><head><title>Bubbles &amp; QuantaPhi</title>'+
  '<style>hidden style</style><script>malicious_instruction()</script></head>'+
  '<body><h1>Bubbles owner connection</h1><p>Owner consent requires verified access.</p></body></html>';
 const calls=[];
 const fetcher=async (url,opts)=>{
  calls.push({url,opts});
  return new Response(html,{status:200,headers:{'content-type':'text/html; charset=utf-8'}});
 };
 const result=await (await readPublicPage(request,{request:question},{id:'fixture'},fetcher)).json();
 assert.equal(result.receipt.tool,'web.read_page');
 assert.equal(result.receipt.status,'complete');
 assert.equal(result.receipt.sourceReadVerified,true);
 assert.equal(result.receipt.repositoryActionsVerified,false);
 assert.equal(result.url,'https://quantaphi.org/bubbles.html');
 assert.match(result.content,/Owner consent requires verified access/);
 assert.match(result.output,/server-delivered public HTML/);
 assert.match(result.title,/Bubbles & QuantaPhi/);
 assert.doesNotMatch(result.content,/malicious_instruction|hidden style/);
 assert.equal(calls[0].url,'https://quantaphi.org/bubbles.html');
 assert.equal(calls[0].opts.redirect,'manual');
 assert.equal(calls.length,1);
});
test('webpage reader rejects external URLs and redirects instead of accepting spoofed content',async()=>{
 const request=new Request('https://bubbles-tools.example/v1/assist');
 let count=0;
 const external=await (await readPublicPage(request,
  {request:'Read https://example.com/account.html'},{id:'fixture'},async()=>{count++;throw Error('external fetch was attempted')})).json();
 assert.equal(external.receipt.status,'failed');
 assert.equal(external.receipt.reason,'public_html_url_required');
 assert.equal(count,0);
 const redirected=await (await readPublicPage(request,
  {request:'Read https://quantaphi.org/bubbles.html'},{id:'fixture'},
  async()=>new Response('',{status:302,headers:{Location:'https://example.com/'}}))).json();
 assert.equal(redirected.receipt.status,'failed');
 assert.equal(redirected.receipt.sourceReadVerified,false);
 const wrongType=await (await readPublicPage(request,
  {request:'Read https://quantaphi.org/bubbles.html'},{id:'fixture'},
  async()=>new Response('{"secret":"not html"}',{status:200,headers:{'content-type':'application/json'}}))).json();
 assert.equal(wrongType.receipt.status,'failed');
});
