import test from 'node:test';
import assert from 'node:assert/strict';
import {continuityPreview} from '../workers/bubbles-cloud-browser/preview.mjs';
const pin='a'.repeat(40),base='https://quantaphi.org/bubbles-continuity-preview/';
test('preview serves immutable public source while preserving same-origin owner/authentication adapters',async()=>{
 const requested=[];
 const response=await continuityPreview(new Request(base+'bubbles.html?ref=malicious'),pin,{fetcher:async(url,options)=>{
  requested.push(url);assert.equal(options.redirect,'error');
  return new Response('<script src="/bubbles-ai.js?v=old"></script><script src="/robot-brain-owner.js"></script>');
 }});
 assert.equal(response.status,200);assert.equal(response.headers.get('X-Preview-Source'),pin);
 assert.match(await response.text(),/src="\/bubbles-continuity-preview\/bubbles-ai.js/);
 assert.equal(requested[0],'https://raw.githubusercontent.com/www-infinity4/QuantaPhi/'+pin+'/bubbles.html');
});
test('root-relative Bubbles imports share the preview and API/provider destinations remain unchanged',async()=>{
 const response=await continuityPreview(new Request(base+'bubbles-ai.js'),pin,{fetcher:async()=>new Response(
  "import('/bubbles-cloud-browser.mjs?v=revision');const api='https://bubbles-tools.example/v1/browser';const owner='/robot-brain-owner.js';")});
 const source=await response.text();assert.match(source,/import\('\/bubbles-continuity-preview\/bubbles-cloud-browser.mjs/);
 assert.match(source,/https:\/\/bubbles-tools.example\/v1\/browser/);assert.match(source,/owner='\/robot-brain-owner.js'/);
});
test('preview cannot select arbitrary paths, source revisions, methods, or unbounded upstream data',async()=>{
 let fetched=0;const options={fetcher:async()=>{fetched++;return new Response('x');}};
 assert.equal((await continuityPreview(new Request(base+'../private'),pin,options)),null);
 assert.equal((await continuityPreview(new Request(base+'nested/bubbles-ai.js'),pin,options)).status,404);
 assert.equal((await continuityPreview(new Request(base+'bubbles.html',{method:'POST'}),pin,options)).status,405);
 assert.equal((await continuityPreview(new Request(base+'bubbles.html'),'',options)).status,503);
 assert.equal(fetched,0);
 const large=await continuityPreview(new Request(base+'bubbles.html'),pin,{fetcher:async()=>new Response('x'.repeat(1500001))});
 assert.equal(large.status,502);
});
