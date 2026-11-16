import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collaborate,handleCollaboration,ownerVerified,COLLAB_PATH} from '../workers/infinity-rogers/ai-collaboration.mjs';
import {QUICK_CARD_SOURCES,PUBLIC_SOURCE_IDS,aiCardMode} from '../source-quick-cards.mjs';
import {cardProvider,quickCardManifest} from '../quanta-card-provider.mjs';
const prompt='Plan and test a safe Bubbles GitHub Quick Card repair';
const env={GEMINI_API_KEY:'private-google-test',ANTHROPIC_API_KEY:'private-claude-test'};
const calls=[];
const fakeFetch=async(url,opts)=>{
 calls.push({url,opts});
 if(url.includes('generativelanguage.googleapis.com'))return Response.json({candidates:[{content:{parts:[{text:'Plan: inspect source, add test, sandbox then review.'}]}}]});
 if(url.includes('api.anthropic.com'))return Response.json({content:[{type:'text',text:'Review: require GitHub PR and signed deploy receipt.'}]});
 throw Error('Unexpected provider');
};
test('Gemini first, Claude second; neither output is an execution receipt',async()=>{
 calls.length=0;
 const result=await collaborate({question:prompt,mode:'gemini_claude_review'},env,fakeFetch);
 assert.equal(result.ok,true);
 assert.deepEqual(result.stages.map(s=>s.provider),['Gemini','Claude']);
 assert.equal(result.receipt.githubChanges,false);
 assert.equal(result.receipt.deploymentVerified,false);
 assert.equal(result.receipt.storedByService,false);
 assert.equal(calls.length,2);
 assert.match(calls[0].url,/generativelanguage.googleapis.com/);
 assert.match(calls[1].url,/api.anthropic.com/);
 const review=JSON.parse(calls[1].opts.body).messages[0].content;
 assert.match(review,/Plan: inspect source/);
 assert.match(review,/untrusted suggestions/i);
 assert.equal(calls[0].opts.headers['x-goog-api-key'],'private-google-test');
 assert.equal(calls[1].opts.headers['x-api-key'],'private-claude-test');
 assert.ok(!JSON.stringify(result).includes('private-google-test'));
});
test('Gemini-only is first default; fallback never claims a successful unavailable model',async()=>{
 const only=await collaborate({question:prompt},env,fakeFetch);
 assert.deepEqual(only.stages.map(s=>s.provider),['Gemini']);
 const failure=await collaborate({question:prompt,mode:'gemini_claude_review'},
  {...env,GEMINI_API_KEY:''},fakeFetch);
 assert.equal(failure.ok,false);
 assert.equal(failure.error,'gemini_not_configured');
 assert.equal(failure.receipt.status,'blocked');
 assert.equal(failure.stages.length,0);
});
test('owner gate denies unverified users before network or model billing',async()=>{
 const request=new Request('https://infinity-rogers.marvaseater.workers.dev'+COLLAB_PATH,{
  method:'POST',body:JSON.stringify({question:prompt,mode:'gemini_first'})});
 const denied=await handleCollaboration(request,env,{verifyOwner:async()=>false,fetcher:()=>assert.fail('No model call')});
 assert.equal(denied.status,403);
 assert.equal((await denied.json()).error,'owner_authorization_required');
});
test('verified owner Gemini request returns actual model evidence',async()=>{
 const request=new Request('https://infinity-rogers.marvaseater.workers.dev'+COLLAB_PATH,{
  method:'POST',body:JSON.stringify({question:prompt,mode:'gemini_first'})});
 const response=await handleCollaboration(request,env,{verifyOwner:async()=>true,fetcher:fakeFetch});
 assert.equal(response.status,200);
 assert.equal((await response.json()).stages[0].provider,'Gemini');
});
test('owner verification requires existing Brain session, never browser login alone',async()=>{
 const noToken=new Request('https://quantaphi.org/',{method:'GET'});
 assert.equal(await ownerVerified(noToken,{BRAIN:{fetch:()=>assert.fail('No bearer')} }),false);
 const req=new Request('https://quantaphi.org/',{headers:{Authorization:'Bearer abcdefghijklmnopqrstuvwxyz012345'}});
 assert.equal(await ownerVerified(req,{BRAIN:{fetch:async()=>({ok:true})}}),true);
 assert.equal(await ownerVerified(req,{BRAIN:{fetch:async()=>({ok:false})}}),false);
});
test('Gemini Claude Copilot are honest independent official quick cards',()=>{
 for(const id of ['gemini','claude','copilot']){
  const card=QUICK_CARD_SOURCES.find(c=>c.id===id);
  assert.ok(card);
  assert.ok(PUBLIC_SOURCE_IDS.includes(id));
  assert.equal(cardProvider(card)?.id,id);
  assert.equal(quickCardManifest(card).apiAccess,'not-granted-by-card');
 }
 assert.equal(aiCardMode('gemini'),'gemini_first');
 assert.equal(aiCardMode('claude'),'gemini_claude_review');
 assert.equal(aiCardMode('copilot'),null);
});
