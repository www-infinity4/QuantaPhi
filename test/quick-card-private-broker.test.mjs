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
