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


test('private Gemini writer adapter is disabled by default and validates input before any network call',async()=>{
 const {consultGeminiWriter}=await import('../workers/infinity-rogers/ai-collaboration.mjs');
 const options={messages:[{role:'system',content:'Return one JSON object.'},{role:'user',content:'Synthetic fixture.'}],max_tokens:1000};
 const never=()=>assert.fail('unexpected external model call');
 await assert.rejects(consultGeminiWriter(env,options,never),/gemini_writer_disabled/);
 const active={...env,GEMINI_WRITER_ENABLED:'1'};
 await assert.rejects(consultGeminiWriter(active,{...options,max_tokens:16001},never),/invalid_writer_input/);
 await assert.rejects(consultGeminiWriter(active,{...options,messages:[{role:'tool',content:'fixture'}]},never),/invalid_writer_input/);
});

test('private Gemini writer adapter preserves structured output and performs a single bounded request',async()=>{
 const {consultGeminiWriter}=await import('../workers/infinity-rogers/ai-collaboration.mjs');
 const active={...env,GEMINI_WRITER_ENABLED:'1'};
 const options={messages:[{role:'system',content:'Return one JSON object.'},{role:'user',content:'Synthetic fixture.'}],max_tokens:1200};
 let count=0;
 const result=await consultGeminiWriter(active,options,async(url,opts)=>{
  count++;
  assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  assert.equal(opts.redirect,'manual');
  assert.equal(opts.headers['x-goog-api-key'],env.GEMINI_API_KEY);
  const body=JSON.parse(opts.body);
  assert.equal(body.systemInstruction.parts[0].text,'Return one JSON object.');
  assert.deepEqual(body.contents,[{role:'user',parts:[{text:'Synthetic fixture.'}]}]);
  assert.equal(body.generationConfig.maxOutputTokens,1200);
  assert.equal(body.generationConfig.responseMimeType,'application/json');
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"fixture":true}'}]}}]});
 });
 assert.equal(count,1);
 assert.equal(result.response,'{"fixture":true}');
 assert.equal(result.provider,'gemini');
 assert.equal(result.executionVerified,false);
 assert.equal(result.productionVerified,false);
 assert.ok(!JSON.stringify(result).includes(env.GEMINI_API_KEY));
});

test('private Gemini writer adapter rejects refusal, incomplete or invalid JSON and does not retry quota errors',async()=>{
 const {consultGeminiWriter}=await import('../workers/infinity-rogers/ai-collaboration.mjs');
 const active={...env,GEMINI_WRITER_ENABLED:'1'};
 const options={messages:[{role:'system',content:'Return JSON.'},{role:'user',content:'Fixture.'}],max_tokens:100};
 for(const candidate of [{finishReason:'MAX_TOKENS',content:{parts:[{text:'{"fixture":true}'}]}},
 {finishReason:'STOP',content:{parts:[{text:'not JSON'}]}},{finishReason:'STOP',content:{parts:[{text:'[]'}]}}]){
  await assert.rejects(consultGeminiWriter(active,options,async()=>Response.json({candidates:[candidate]})),/gemini_writer_output_invalid/);
 }
 let count=0;
 await assert.rejects(consultGeminiWriter(active,options,async()=>{count++;return new Response('private provider body',{status:429});}),/gemini_writer_rate_limited/);
 assert.equal(count,1);
});


test('private BrainModels RPC delegates to the gated Gemini writer and does not expose a public HTTP route',async()=>{
 const {readFile}=await import('node:fs/promises');
 const sourceUrl=new URL('../workers/infinity-rogers/brain-models.js',import.meta.url);
 const adapterUrl=new URL('../workers/infinity-rogers/ai-collaboration.mjs',import.meta.url).href;
 const source=(await readFile(sourceUrl,'utf8')).replace("import { WorkerEntrypoint } from 'cloudflare:workers';","class WorkerEntrypoint { constructor(ctx,env){this.env=env;} }").replace('./ai-collaboration.mjs',adapterUrl);
 const {BrainModels}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
 const options={messages:[{role:'system',content:'Return JSON.'},{role:'user',content:'Synthetic fixture.'}],max_tokens:100};
 let calls=0;
 const previous=globalThis.fetch;
 globalThis.fetch=async(url,opts)=>{
  calls++;
  assert.equal(opts.redirect,'manual');
  return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'{"fixture":true}'}]}}]});
 };
 try{
  await assert.rejects(new BrainModels({},env).writer(options),/gemini_writer_disabled/);
  assert.equal(calls,0);
  const receipt=await new BrainModels({},{...env,GEMINI_WRITER_ENABLED:'1'}).writer(options);
  assert.equal(receipt.provider,'gemini');
  assert.equal(receipt.executionVerified,false);
  assert.equal(receipt.productionVerified,false);
  assert.equal(calls,1);
 }finally{globalThis.fetch=previous;}
});

test('private Gemini writer refuses redirects without following provider Location',async()=>{
 const {consultGeminiWriter}=await import('../workers/infinity-rogers/ai-collaboration.mjs');
 let calls=0;
 await assert.rejects(consultGeminiWriter({...env,GEMINI_WRITER_ENABLED:'1'},
  {messages:[{role:'system',content:'Return JSON.'},{role:'user',content:'Fixture.'}],max_tokens:100},async(url,opts)=>{
   calls++;assert.equal(opts.redirect,'manual');
   return new Response(null,{status:302,headers:{Location:'https://example.invalid/'}});
  }),/gemini_writer_provider_unavailable/);
 assert.equal(calls,1);
});
