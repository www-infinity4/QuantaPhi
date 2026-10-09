const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const file = name => fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const gatewaySource=file('workers/infinity-rogers/worker.js');

test('Infinite Book uses Cloudflare-native AI endpoint, not the general GPT gateway', () => {
 const writer=file('infinite-book-discovery.js');
 const reader=file('infinite-book.js');
 assert.match(writer,/const AI='https:\/\/infinity-rogers\.marvaseater\.workers\.dev\/v1\/book\/generate'/);
 assert.match(gatewaySource,/if \(url\.pathname === "\/v1\/book\/generate"\) return runBookNative/);
 const dedicated=gatewaySource.split('async function runBookNative(')[1].split('async function runReason(')[0];
 assert.match(dedicated,/await workersAI\(env,/);
 assert.doesNotMatch(dedicated,/CARD_MANAGER_MODEL|runGatewayModel|\benv\.Gpt\b|ANTHROPIC_API_KEY|GPT_API_KEY/);
 assert.match(gatewaySource,/const BOOK_CF_MODEL = "@cf\/meta\/llama-3\.1-8b-instruct-fast"/);
 assert.match(reader,/Writing a fresh Reads & Realms story/);
 assert.match(reader,/root\.dataset\.context==='search'/);
 assert.doesNotMatch(reader,/The daily AI story-writing allowance has been reached/);
});

test('direct Cloudflare AI binding responds to story requests without any external GPT API key', async () => {
 const mod=await import('data:text/javascript;base64,'+Buffer.from(gatewaySource).toString('base64'));
 const calls=[];
 const env={AI:{run:async(model,options)=>{
  calls.push({model,options});
  return {choices:[{message:{content:'{"title":"Fresh story","summary":"A source-backed original narrative"}'}}]};
 }}};
 const req=new Request('https://infinity-rogers.marvaseater.workers.dev/v1/book/generate',{
  method:'POST',
  headers:{origin:'https://quantaphi.org','content-type':'application/json'},
  body:JSON.stringify({input:'Write a sourced new narrative in JSON',context:{application:'QuantaPhi',task:'infinite-book-deep-story'}})
 });
 const resp=await mod.default.fetch(req,env);
 assert.equal(resp.status,200);
 const json=await resp.json();
 assert.equal(json.provider,'cloudflare-workers-ai');
 assert.equal(json.route,'native-workers-ai-binding');
 assert.equal(json.model,'@cf/meta/llama-3.1-8b-instruct-fast');
 assert.match(json.output_text,/Fresh story/);
 assert.equal(calls.length,1);
 assert.equal(calls[0].options.max_tokens,2600);
 assert.equal(calls[0].model,json.model);
});

test('invalid requests cannot turn dedicated story endpoint into a general AI proxy', async () => {
 const mod=await import('data:text/javascript;base64,'+Buffer.from(gatewaySource).toString('base64'));
 let invocations=0;
 const env={AI:{run:async()=>{invocations++;return {response:'unexpected'}}}};
 const req=new Request('https://infinity-rogers.marvaseater.workers.dev/v1/book/generate',{
  method:'POST',headers:{origin:'https://quantaphi.org','content-type':'application/json'},
  body:JSON.stringify({input:'Hello',context:{task:'non-book-task'}})
 });
 const resp=await mod.default.fetch(req,env);
 assert.equal(resp.status,400);
 assert.equal((await resp.json()).error,'unsupported_book_task');
 assert.equal(invocations,0);
});
