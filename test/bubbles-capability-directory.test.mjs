import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker from '../workers/bubbles-tools/worker.mjs';
import {capabilityCatalog,findCapabilities,explainCapabilities} from '../workers/bubbles-tools/capability-catalog.mjs';

test('Bubbles capability directory exposes existing tools, their real files and authorization scope',()=>{
 const rows=capabilityCatalog();
 for(const id of ['cloudflare-chat','gemma-image','speech-transcription','web-search',
  'github-public-read','github-owner-work','quick-cards','browser-owner','owner-memory',
  'weather','news','claude-steward']){
  const row=rows.find(x=>x.id===id);
  assert.ok(row,'missing '+id);
  assert.ok(row.source.startsWith('workers/')||row.source==='bubbles-ai.js');
  assert.ok(['public-read','owner-gated','client-session','provider-gated'].includes(row.scope));
  assert.ok(row.status==='registered_not_live_verified');
 }
 assert.equal(rows.find(x=>x.id==='github-owner-work').scope,'owner-gated');
 assert.equal(rows.find(x=>x.id==='browser-owner').scope,'owner-gated');
 assert.equal(rows.find(x=>x.id==='claude-steward').scope,'provider-gated');
 assert.ok(rows.every(x=>!JSON.stringify(x).includes('sk-test')));
});

test('capability lookup points coding request to authenticated adapter, not generic MCP reads',()=>{
 const hits=findCapabilities('Please fix the GitHub repository and run tests');
 assert.equal(hits[0].id,'github-owner-work');
 assert.match(explainCapabilities('where do I find my GitHub tools'),/owner.authenticated|owner-gated/i);
 assert.match(explainCapabilities('how do I use quick cards'),/quick.cards/i);
 assert.ok(findCapabilities('read a public webpage').some(x=>x.id==='web-search'));
 assert.deepEqual(findCapabilities('gibberishwithnomatches'),[]);
});

test('tool directory in Bubbles chat returns truthful registered vs verified states without AI calls',async()=>{
 let called=false;
 const r=await worker.fetch(new Request('https://tools/v1/assist',{
  method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
  body:JSON.stringify({request:'Bubbles, where can I find your existing tools?',mcp:true})
 }),{AI:{run:async()=>{called=true;return {response:'fake'}}}});
 const data=await r.json();
 assert.equal(r.status,200);
 assert.equal(data.receipt.tool,'capabilities.catalog');
 assert.equal(data.receipt.status,'complete');
 assert.equal(data.receipt.executed,false,'catalog is discovery, not a completed action');
 assert.equal(data.receipt.repositoryActionsVerified,false);
 assert.ok(data.capabilities.some(x=>x.id==='github-owner-work'));
 assert.match(data.output,/not a live execution receipt/i);
 assert.equal(called,false);
});

test('GPT-OSS gets job-scoped tool map without changing the original Bubbles answer engine',async()=>{
 let calls=0,body;
 const r=await worker.fetch(new Request('https://tools/v1/assist',{
  method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
  body:JSON.stringify({request:'Explain how Bubbles could find the GitHub tool to repair a repository',mcp:false})
 }),{AI:{run:async(model,options)=>{calls++;body={model,options};return {response:'Use the separately authorized GitHub writer with an actual receipt.'}}}});
 const data=await r.json();
 assert.equal(data.provider,'cloudflare-workers-ai');
 assert.equal(body.model,'@cf/openai/gpt-oss-120b');
 assert.ok(body.options.messages.some(m=>m.role==='system'&&/github-owner-work/.test(m.content)));
 assert.ok(body.options.messages.some(m=>m.role==='system'&&/owner-gated/.test(m.content)));
 assert.equal(calls,1);
});

test('Claude Steward includes shared Bubbles tool directory as READ-ONLY locator',()=>{
 const src=readFileSync(new URL('../workers/infinity-rogers/claude-steward.mjs',import.meta.url),'utf8');
 assert.match(src,/list_bubbles_tools/);
 assert.match(src,/findCapabilities/);
 assert.match(src,/capability-catalog\.mjs/);
 assert.doesNotMatch(src,/case 'list_bubbles_tools'.*?start_immediately/s);
});
