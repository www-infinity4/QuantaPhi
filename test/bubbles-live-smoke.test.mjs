import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runSmoke} from '../scripts/bubbles-live-smoke.mjs';

const healthy={ok:true,service:'bubbles-tools',tools:{chat:true,speech:true}};
function stub({authorizedLeak=false,chatAnswer='The smallest next step is to run the owner adapter tests; no code was edited.',staleAdapter=false}={}){
 const calls=[];
 return {
  calls,
  fetcher:async (url,options={})=>{
   const path=new URL(url).pathname;
   calls.push({path,method:options.method||'GET',origin:options.headers?.Origin,authorization:options.headers?.Authorization});
   if(path==='/health')return Response.json(healthy);
   if(path==='/work/tickets/list')return Response.json(authorizedLeak?{ok:true,tickets:[]}:{ok:false,error:'forbidden'},{status:authorizedLeak?200:404});
   if(path==='/bubbles.html')return new Response('<script src="/bubbles-ai.js?v=new"></script><script src="/bubbles-brain-actions.js?v=new"></script>',{status:200});
   if(path==='/bubbles-brain-actions.js')return new Response(staleAdapter?'outdated':'resolveFollowupRequest makeJobs',{status:200});
   if(path==='/v1/assist'&&options.headers?.Origin?.includes('untrusted'))return Response.json({ok:false,error:'origin_not_allowed'},{status:403});
   if(path==='/v1/assist')return Response.json({ok:true,model:'@cf/openai/gpt-oss-120b',output:chatAnswer,receipt:{status:'complete',minted:false,repositoryActionsVerified:false}});
   throw Error('Unexpected '+path);
  }
 };
}

test('credential-free health and denial checks cannot write jobs or tokens',async()=>{
 const mock=stub();const report=await runSmoke({fetcher:mock.fetcher});
 assert.equal(report.status,'pass');
 assert.equal(report.ownerCredentialProvided,false);
 assert.equal(report.walletWrites,0);
 assert.equal(report.verifiedBrainJobReceipts,0);
 assert.equal(mock.calls.length,3);
 assert.ok(mock.calls.every(x=>!x.authorization));
 assert.ok(!mock.calls.some(x=>x.path==='/work/tickets/create'||x.path==='/work/tickets/update'));
});

test('a successful uncredentialed Brain read fails closed',async()=>{
 const mock=stub({authorizedLeak:true});
 const report=await runSmoke({fetcher:mock.fetcher});
 assert.equal(report.status,'failed');
 assert.match(report.error,/was not denied/);
});

test('real-mode public site, checked owner adapter and concrete GPT response must all agree',async()=>{
 const mock=stub();const report=await runSmoke({fetcher:mock.fetcher,full:true});
 assert.equal(report.status,'pass');
 assert.equal(mock.calls.length,6);
 assert.ok(report.checks.some(x=>x.name==='live_gpt_reply'&&x.result==='pass'));
});

test('generic GPT reply or stale live owner adapter is a detectable regression',async()=>{
 for(const mock of [stub({chatAnswer:'Where should we focus our attention next?'}),stub({staleAdapter:true})]){
  const result=await runSmoke({fetcher:mock.fetcher,full:true});
  assert.equal(result.status,'failed');
 }
});

test('live smoke fails on invented completion even with HTTP 200 and GPT model',async()=>{
 const fake=stub({chatAnswer:'**Completed ✅** The owner job adapter has been added to the codebase and merged into main.'});
 const result=await runSmoke({fetcher:fake.fetcher,full:true});
 assert.equal(result.status,'failed');
 assert.match(result.error,/claimed repository edits/);
});

test('live Bubbles must not suggest invented Python owner-adapter modules',async()=>{
 const mock=stub({chatAnswer:'The next step is to create tests/test_owner_ticket_adapter.py with pytest and run that suite.'});
 const result=await runSmoke({fetcher:mock.fetcher,full:true});
 assert.equal(result.status,'failed');
 assert.match(result.error,/fabricated Python module/);
});
