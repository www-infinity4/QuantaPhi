import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {parseIntegraCommand,executeIntegraCommand} from '../bubbles-integra-x.mjs';
import {validateIntegraX,handleIntegraX} from '../workers/infinity-brain-clock/integra-x.mjs';
globalThis.crypto??=webcrypto;

const jobId='12345678-1234-4234-8234-123456789abc';
const runId='12345678-1234-4234-8234-123456789def';
function storage(){
 const m=new Map();
 return {m,async get(k){return m.get(k)},async put(k,v){m.set(k,structuredClone(v))}};
}
const env={TINYFISH_API_KEY:'sample-secret-for-testing-only',TINYFISH_PROFILE_ID:'prof_5300ab1bb4c74ce6'};
const mockFetch=(calls,final=false)=>async(url,opts)=>{
 calls.push({url,opts});
 if(url.endsWith('/run-async'))return Response.json({run_id:runId});
 return Response.json({status:'COMPLETED',result:final
  ?'Posted and verified https://x.com/IntegraAI/status/2114992507222425732'
  :{posts:[{url:'https://x.com/a/status/2114992507222425732',summary:'relevant source'}]}});
};
test('explicit Integra parser is narrow; sources are fixed',()=>{
 assert.deepEqual(parseIntegraCommand('Bubbles, Integra read #bubbles'),{action:'read',source:'bubbles'});
 assert.deepEqual(parseIntegraCommand('Integra read @YahooPingcwlz'),{action:'read',source:'yahoo'});
 assert.deepEqual(parseIntegraCommand('ask Integra connection'),{action:'health'});
 assert.deepEqual(parseIntegraCommand('Integra post: Hello #QuantaPhi'),{action:'draft',text:'Hello #QuantaPhi',wantPublish:true});
 assert.equal(parseIntegraCommand('Please show me a news article about Integra'),null);
 assert.ok(parseIntegraCommand('Integra read https://evil.example').error);
});
test('server rejects arbitrary URLs, extra keys and unapproved publishing',()=>{
 assert.throws(()=>validateIntegraX({action:'read',source:'bubbles',url:'https://example.com'}));
 assert.throws(()=>validateIntegraX({action:'read',source:'https://evil.example'}));
 assert.throws(()=>validateIntegraX({action:'confirm',jobId,approval:'yes'}));
 assert.throws(()=>validateIntegraX({action:'draft',text:'x'.repeat(281)}));
});
test('disabled credentials fail closed and do not call provider',async()=>{
 const s=storage(),calls=[];
 const res=await handleIntegraX(s,{}, {action:'read',source:'bubbles'},mockFetch(calls));
 assert.equal(res.httpStatus,503);assert.equal(calls.length,0);
 const health=await handleIntegraX(s,{}, {action:'health'},mockFetch(calls));
 assert.equal(health.result.ready,false);
});
test('read starts a single fixed-source browser job; status is read-only',async()=>{
 const s=storage(),calls=[],fetcher=mockFetch(calls);
 const start=await handleIntegraX(s,env,{action:'read',source:'bubbles'},fetcher);
 assert.equal(start.result.job.state,'working');
 assert.equal(start.result.job.kind,'read');
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://agent.tinyfish.ai/v1/automation/run-async');
 const submitted=JSON.parse(calls[0].opts.body);
 assert.equal(submitted.profile_id,env.TINYFISH_PROFILE_ID);
 assert.equal(submitted.use_profile,true);
 assert.equal(submitted.url,'https://x.com/search?q=%23bubbles&src=typed_query&f=live');
 assert.match(submitted.goal,/DO NOT publish/);
 const status=await handleIntegraX(s,env,{action:'status',jobId:start.result.job.jobId},fetcher);
 assert.equal(status.result.job.state,'completed_read');
 assert.match(status.result.job.summary,/relevant source/);
});
test('draft by itself cannot publish; a confirmed post is dispatched only once',async()=>{
 const s=storage(),calls=[],fetcher=mockFetch(calls,true);
 const draft=await handleIntegraX(s,env,{action:'draft',text:'Hello from Integra AI.'},fetcher);
 assert.equal(draft.result.job.state,'draft');assert.equal(calls.length,0);
 const id=draft.result.job.jobId;
 const bad=await handleIntegraX(s,env,{action:'confirm',jobId:id,approval:'something'},fetcher);
 assert.equal(bad.httpStatus,400);assert.equal(calls.length,0);
 const submitted=await handleIntegraX(s,env,{action:'confirm',jobId:id,approval:'publish_once'},fetcher);
 assert.equal(submitted.result.job.state,'working');assert.equal(calls.length,1);
 assert.equal(JSON.parse(calls[0].opts.body).url,'https://x.com/compose/post');
 const duplicate=await handleIntegraX(s,env,{action:'confirm',jobId:id,approval:'publish_once'},fetcher);
 assert.equal(duplicate.result.job.state,'working');assert.equal(calls.length,1);
 const status=await handleIntegraX(s,env,{action:'status',jobId:id},fetcher);
 assert.equal(status.result.job.state,'verified_published');
 assert.match(status.result.job.url,/^https:\/\/x\.com\/IntegraAI\/status\/\d+$/);
});
test('confirmation in client never happens without real approve callback',async()=>{
 const requests=[];
 const fetcher=async(_u,opts)=>{
  const body=JSON.parse(opts.body);requests.push(body);
  if(body.action==='draft')return Response.json({ok:true,job:{jobId,kind:'post',state:'draft'}});
  return Response.json({ok:true,job:{jobId,kind:'post',state:'working'}});
 };
 const command={action:'draft',text:'Test post',wantPublish:true};
 const no=await executeIntegraCommand(command,{url:'https://brain/work/integra-x',headers:{},fetcher,approve:()=>false});
 assert.match(no,/draft saved/);assert.deepEqual(requests.map(x=>x.action),['draft']);
 await executeIntegraCommand(command,{url:'https://brain/work/integra-x',headers:{},fetcher,approve:()=>true});
 assert.deepEqual(requests.slice(1).map(x=>x.action),['draft','confirm']);
});
