import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {handlePrivateTinyfishBridge} from '../workers/continuity-session-coordinator/tinyfish-agent-bridge.mjs';
import {handleQuickCardBrowser} from '../workers/infinity-brain-clock/quick-card-browser.mjs';
globalThis.crypto??=webcrypto;
const TOKEN='a-private-bridge-token-in-test-not-a-real-secret';
const env={TINYFISH_BRIDGE_TOKEN:TOKEN,TINYFISH_API_KEY:'fixture-tinyfish-api-key'};
const req=(path,body,token=TOKEN)=>new Request('https://coordinator.internal/internal/tinyfish'+path,{
 method:body?'POST':'GET',headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
 ...(body?{body:JSON.stringify(body)}:{})});
const runBody={url:'https://frame.work/',goal:'You are the QuantaPhi TinyFish READ-ONLY Quick Card navigation worker. Inspect the official website; do not interact with personal accounts.',
 browser_profile:'lite',agent_config:{max_duration_seconds:120}};
test('private bridge rejects unsolicited callers and unknown endpoints without spending',async()=>{
 let upstream=0;const fetcher=()=>{upstream++;throw Error('should not call')};
 const denied=await handlePrivateTinyfishBridge(req('/v1/automation/run-async',runBody,'wrong-token'),env,{fetcher});
 assert.equal(denied.status,403);assert.equal(upstream,0);
 const unknown=await handlePrivateTinyfishBridge(req('/v1/dangerous-route',runBody),env,{fetcher});
 assert.equal(unknown.status,405);assert.equal(upstream,0);
});
test('private bridge enforces read-only goal and public HTTPS target',async()=>{
 for(const url of ['http://frame.work','http://127.0.0.1','https://localhost/','https://service.internal/']){
  const res=await handlePrivateTinyfishBridge(req('/v1/automation/run-async',{...runBody,url}),env);
  assert.equal(res.status,400,url);
 }
 const notRead=await handlePrivateTinyfishBridge(req('/v1/automation/run-async',{...runBody,goal:'Buy everything and check out'}),env);
 assert.equal(notRead.status,400);
});
test('private bridge forwards only to TinyFish API and keeps shared secrets private',async()=>{
 let target='',headers;
 const fetcher=async(url,opts)=>{target=url;headers=opts.headers;return Response.json({run_id:'12345678-1234-4234-8234-123456789def'})};
 const response=await handlePrivateTinyfishBridge(req('/v1/automation/run-async',runBody),env,{fetcher});
 assert.equal(response.status,200);
 assert.equal(target,'https://agent.tinyfish.ai/v1/automation/run-async');
 assert.equal(headers['X-API-Key'],env.TINYFISH_API_KEY);
 assert.ok(!JSON.stringify(await response.json()).includes(env.TINYFISH_API_KEY));
});
test('Brain uses existing coordinator service binding rather than needing its own TinyFish key',async()=>{
 const saved=new Map(),storage={get:async k=>saved.get(k),put:async(k,v)=>saved.set(k,v)};
 let brokerCalled=0,header='';
 const bridged={TINYFISH_BROKER:{fetch:async(url,opts)=>{
  brokerCalled++;header=opts.headers.Authorization;
  assert.match(url,/continuity-session-coordinator\.internal/);
  return Response.json({run_id:'12345678-1234-4234-8234-123456789def'});
 }},TINYFISH_BRIDGE_TOKEN:TOKEN};
 const c=await handleQuickCardBrowser(storage,bridged,{action:'capabilities'});
 assert.equal(c.result.configured,true);
 const r=await handleQuickCardBrowser(storage,bridged,{action:'start',cardId:'durable-framework-computers',kind:'parts',
  query:'',requestId:'12345678-1234-4234-8234-123456789abc'});
 assert.equal(r.httpStatus,202);assert.equal(brokerCalled,1);assert.equal(header,'Bearer '+TOKEN);
});
