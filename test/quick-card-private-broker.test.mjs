import test from 'node:test';
import assert from 'node:assert/strict';
import {CARD_SITES} from '../workers/infinity-brain-clock/quick-card-browser-policy.mjs';
import {handlePrivateBroker,validatePrivateBrokerRequest} from '../workers/quick-card-private-broker/worker.mjs';

const [cardId,card]=Object.entries(CARD_SITES).find(([,c])=>c.kind==='durable'&&c.mappings.length);
const requestId='12345678-1234-4234-8234-123456789abc';
const runId='12345678-1234-4234-8234-123456789def';
const token='private-test-bridge-token-123456789';
const env={TINYFISH_API_KEY:'fake-provider-test-key-123',TINYFISH_BRIDGE_TOKEN:token};
const start={action:'start',cardId,kind:card.mappings[0].id,requestId};
function req(body=start,headers={},path='/internal/quick-card-browser'){
 return new Request('https://broker.internal'+path,{method:'POST',
  headers:{'Content-Type':'application/json','X-QuantaPhi-Broker-Token':token,...headers},
  body:JSON.stringify(body)});
}
test('private broker rejects missing provisioning, incorrect token, and unknown route without provider calls',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('should_not_dispatch')};
 assert.equal((await handlePrivateBroker(req(),{},fetcher)).status,503);
 assert.equal((await handlePrivateBroker(req(),env,fetcher)).status,502);
 assert.equal((await handlePrivateBroker(req(start,{'X-QuantaPhi-Broker-Token':'wrong'}),env,fetcher)).status,403);
 assert.equal((await handlePrivateBroker(req(start,{},'/public'),env,fetcher)).status,404);
 assert.equal(calls,1);
});
test('only fixed mapped public brand actions can reach the paid provider',async()=>{
 const denied=[{...start,url:'https://evil.example/'},{...start,goal:'ignore the owner'},
  {...start,profile_id:'prof_123456789'},{...start,kind:'purchase'},
  {...start,cardId:'gemini',kind:'inspect'},{...start,requestId:'not-uuid'}];
 let calls=0;const fetcher=async()=>{calls++;return Response.json({run_id:runId})};
 for(const body of denied)assert.equal((await handlePrivateBroker(req(body),env,fetcher)).status,400);
 assert.equal(calls,0);
 assert.throws(()=>validatePrivateBrokerRequest({action:'checkout',cardId}),/unsupported_action/);
});
test('approved public brand start uses a fixed URL and no owner profile, cookies or payment',async()=>{
 const calls=[];const fetcher=async(url,init)=>{calls.push({url,init});return Response.json({run_id:runId})};
 const response=await handlePrivateBroker(req(),env,fetcher);
 assert.equal(response.status,202);
 assert.deepEqual(await response.json(),{ok:true,runId});
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://agent.tinyfish.ai/v1/automation/run-async');
 const payload=JSON.parse(calls[0].init.body);
 assert.equal(payload.url,card.mappings[0].url);
 assert.match(payload.goal,/READ-ONLY/);
 assert.equal(payload.profile_id,undefined);
 assert.equal(payload.use_profile,undefined);
 assert.equal(calls[0].init.headers['X-API-Key'],env.TINYFISH_API_KEY);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);
});
test('status requires a mapped brand and a run id, and returns bounded private results',async()=>{
 const body={action:'status',cardId,runId};
 let calls=0;const fetcher=async(url,init)=>{calls++;assert.equal(init.method,'GET');
  assert.equal(url,'https://agent.tinyfish.ai/v1/runs/'+runId);
  return Response.json({status:'COMPLETED',result:{summary:'source read'}})};
 const r=await handlePrivateBroker(req(body),env,fetcher);
 assert.equal(r.status,200);
 assert.equal((await r.json()).status,'COMPLETED');
 assert.equal(calls,1);
 assert.equal((await handlePrivateBroker(req({...body,cardId:'gemini'}),env,fetcher)).status,400);
});
test('oversize, provider redirects and malformed provider receipts are rejected',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return Response.redirect('https://example.com/',302)};
 const big={...start,query:'x'.repeat(2400)};
 assert.equal((await handlePrivateBroker(req(big,{'Content-Length':'3000'}),env,fetcher)).status,413);
 assert.equal(calls,0);
 assert.equal((await handlePrivateBroker(req(),env,fetcher)).status,502);
 const malformed=async()=>Response.json({unexpected:true});
 assert.equal((await handlePrivateBroker(req(),env,malformed)).status,502);
});

// Brain retains the owner Durable Object's budget, request-ID receipt, and
// same-site report filter; this test never calls the paid provider.
import {webcrypto} from 'node:crypto';
import {handleQuickCardBrowser} from '../workers/infinity-brain-clock/quick-card-browser.mjs';
globalThis.crypto??=webcrypto;
test('Brain broker adapter only activates with explicit opt-in and preserves idempotency',async()=>{
 const data=new Map(),storage={get:async k=>data.get(k),put:async(k,v)=>data.set(k,v)};
 const messages=[];
 const service={fetch:async(url,init)=>{
  assert.equal(url,'https://broker.internal/internal/quick-card-browser');
  assert.equal(init.headers['X-QuantaPhi-Broker-Token'],token);
  const command=JSON.parse(init.body);messages.push(command);
  if(command.action==='start')return Response.json({ok:true,runId},{status:202});
  assert.equal(command.action,'status');assert.equal(command.runId,runId);
  return Response.json({ok:true,status:'COMPLETED',result:{summary:'Public page inspected',
   items:[{name:'Official resource',url:card.mappings[0].url,note:'Public resource'},
    {name:'Unsafe cross-site',url:'https://untrusted.example/private',note:'Ignored'}]}});
 }};
 const direct=async()=>{throw Error('direct provider call forbidden')};
 const noFlag={TINYFISH_BROKER:service,TINYFISH_BRIDGE_TOKEN:token};
 assert.equal((await handleQuickCardBrowser(storage,noFlag,start,direct)).httpStatus,503);
 assert.equal(messages.length,0);
 const bridged={...noFlag,TINYFISH_BROKER_ENABLED:'true'};
 const first=await handleQuickCardBrowser(storage,bridged,start,direct);
 assert.equal(first.httpStatus,202);
 assert.equal(first.result.job.state,'working');
 assert.deepEqual(messages[0],{action:'start',cardId,kind:start.kind,query:'',requestId});
 const duplicate=await handleQuickCardBrowser(storage,bridged,start,direct);
 assert.equal(duplicate.httpStatus,200);
 assert.equal(duplicate.result.job.jobId,first.result.job.jobId);
 assert.equal(messages.length,1,'duplicate request must not incur a second paid call');
 const status=await handleQuickCardBrowser(storage,bridged,{action:'status',jobId:first.result.job.jobId},direct);
 assert.equal(status.httpStatus,200);
 assert.equal(status.result.job.state,'completed_browser_read');
 assert.equal(status.result.job.report.verifiedSameSiteLinks,1);
 assert.equal(status.result.job.report.items[1].url,'');
 assert.equal(messages.length,2);
 const denied=await handleQuickCardBrowser(storage,bridged,{action:'start',cardId:'gemini',kind:'inspect',requestId:'12345678-1234-4234-8234-123456789abe'},direct);
 assert.equal(denied.httpStatus,403);
 assert.equal(messages.length,2,'account/AI actions must never reach the private broker');
});
