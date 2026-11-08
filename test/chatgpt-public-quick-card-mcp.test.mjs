import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/bubbles-tools/worker.mjs';
import {cleanPublicCardDraft,readPublicCardDraft,encodePublicCardDraft} from '../quick-card-gpt-draft.mjs';
import {PUBLIC_MCP_TOOLS} from '../workers/bubbles-tools/public-gpt-mcp.mjs';
const base='https://bubbles-tools.marvaseater.workers.dev/mcp/public-cards';
const rpc=(method,params={},id=1)=>new Request(base,{
 method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-06-18'},
 body:JSON.stringify({jsonrpc:'2.0',id,method,params})
});
const draft={title:'Antique Radio Finder',website:'https://example.org/radios',description:'Find original-source vintage radio records.',interactionRequest:'Let the reader search verified radio listings.',kind:'visit'};

test('anonymous ChatGPT discovery endpoint provides only static public noauth tools',async()=>{
 const init=await worker.fetch(rpc('initialize',{protocolVersion:'2025-06-18'}),{});
 assert.equal(init.status,200);
 assert.equal((await init.json()).result.protocolVersion,'2025-06-18');
 const response=await worker.fetch(rpc('tools/list'),{});
 assert.equal(response.status,200);
 const tools=(await response.json()).result.tools;
 assert.deepEqual(tools.map(x=>x.name),PUBLIC_MCP_TOOLS.map(x=>x.name));
 assert.ok(tools.every(x=>x.annotations.readOnlyHint===true&&x.securitySchemes?.[0]?.type==='noauth'));
 assert.ok(!tools.some(x=>/owner|wallet|deploy|git_write|purchase|execute/i.test(x.name)));
});

test('public plugin catalogs verified on-site Bubbles and Quick Card tools, without account claims',async()=>{
 const res=await worker.fetch(rpc('tools/call',{name:'quanta_public_builders',arguments:{}}),{});
 assert.equal(res.status,200);
 const body=(await res.json()).result;
 assert.equal(body.isError,false);
 assert.ok(body.structuredContent.builders.some(x=>x.url==='https://quantaphi.org/quick-card-builder.html'));
 assert.ok(body.structuredContent.builders.some(x=>x.url==='https://quantaphi.org/bubbles.html'));
 assert.equal(body.structuredContent.chatgptWebsiteSignInConnected,false);
 assert.equal(body.structuredContent.privilegedActionsAvailable,false);
});

test('GPT can prepare a real, reversible in-card site draft without publishing',async()=>{
 const res=await worker.fetch(rpc('tools/call',{name:'quanta_prepare_card_draft',arguments:draft}),{});
 const value=(await res.json()).result.structuredContent;
 assert.equal(res.status,200);
 assert.equal(value.draft.website,'https://example.org/radios');
 assert.equal(value.published,false);
 assert.equal(value.reviewRequired,true);
 assert.ok(value.openOnQuantaPhi.startsWith('https://quantaphi.org/quick-card-builder.html#chatgpt-draft='));
 assert.deepEqual(readPublicCardDraft(new URL(value.openOnQuantaPhi).hash),cleanPublicCardDraft(draft));
 assert.equal(value.openOnQuantaPhi.includes('interactionRequest'),false);
});

test('draft cannot include unsafe URL, credentials, invalid kind or executable submit',()=>{
 for(const website of ['http://example.org','https://user:pass@example.org','https://localhost','https://127.0.0.1','https://example.org:8443','javascript:alert(1)'])
 assert.throws(()=>cleanPublicCardDraft({...draft,website}),/invalid_draft/);
 assert.throws(()=>cleanPublicCardDraft({...draft,kind:'deploy'}),/invalid_draft/);
 assert.throws(()=>cleanPublicCardDraft({...draft,interactionRequest:''}),/invalid_draft/);
 assert.equal(readPublicCardDraft('#chatgpt-draft=not-valid'),null);
 assert.equal(readPublicCardDraft('#not-a-draft=bad'),null);
 assert.equal(readPublicCardDraft('#chatgpt-draft='+ 'A'.repeat(9000)),null);
 const link=encodePublicCardDraft(draft);
 assert.equal(new URL(link).search,'','private prompt must not enter request query');
});

test('public plugin enforces strict JSON RPC and denies privileged tools',async()=>{
 const forbidden=await worker.fetch(rpc('tools/call',{name:'github_write',arguments:{repo:'www-infinity4/QuantaPhi'}}),{});
 assert.equal(forbidden.status,400);
 assert.equal((await forbidden.json()).error.code,-32602);
 const extra=await worker.fetch(rpc('tools/call',{name:'quanta_prepare_card_draft',arguments:{...draft,owner:true}}),{});
 assert.equal(extra.status,400);
 const method=await worker.fetch(rpc('tools/call',{name:'quanta_public_builders',arguments:{}}),{});
 assert.equal(method.status,200);
 const secret=await worker.fetch(new Request('https://bubbles-tools.marvaseater.workers.dev/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream','MCP-Protocol-Version':'2025-06-18'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}),{});
 assert.equal(secret.status,503,'legacy owner-independent private MCP stays closed');
 const bad=await worker.fetch(new Request(base,{method:'GET'}),{});
 assert.equal(bad.status,405);
});
