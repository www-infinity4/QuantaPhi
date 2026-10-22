import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{finishSearchReply} from '../workers/bubbles-tools/worker.mjs';
const original=()=>Response.json({ok:true,output:'SearXNG result: Lovilia is in Iowa.',sources:[{title:'Lovilia',url:'https://example.org'}],receipt:{tool:'web.search',status:'complete'}});
for(const [name,summarize] of [
 ['model throws',()=>{throw Error('provider unavailable')}],
 ['model fails HTTP',()=>Response.json({error:'failed'},{status:502})],
 ['model gives acknowledgement only',()=>Response.json({output:'On it.'})],
 ['model stalls',()=>new Promise(()=>{})]
])test(name+' preserves real search output and receipt',async()=>{
 const result=await finishSearchReply(original(),summarize,5),data=await result.json();
 assert.match(data.output,/Lovilia is in Iowa/);assert.equal(data.receipt.status,'complete');assert.equal(data.sources.length,1);
});
test('valid summary is returned',async()=>{
 const result=await finishSearchReply(original(),()=>Response.json({output:'According to the search result, Lovilia is in Iowa.'}),20);
 assert.match((await result.json()).output,/According to/);
});
test('model planning JSON is not a completed source-backed answer',async()=>{
 const draft='Attempt to fetch a snippet.\nSearch for that phrase.\n{"query":"hydrogen energy","top_n":5}';
 const result=await finishSearchReply(original(),()=>Response.json({output:draft}),20,'Research hydrogen and make a project plan');
 const data=await result.json();
 assert.doesNotMatch(data.output,/top_n|Attempt to fetch/);
 assert.match(data.output,/Lovilia is in Iowa/);
 assert.equal(data.answerStatus,'partial');assert.equal(data.analysisVerified,false);
 assert.equal(data.receipt.status,'complete');assert.equal(data.sources.length,1);
});
test('synthesis timeout preserves sources and explicitly reports the missing requested plan',async()=>{
 const result=await finishSearchReply(original(),()=>new Promise(()=>{}),5,'Research hydrogen and include next steps');
 const data=await result.json();assert.equal(data.answerStatus,'partial');assert.match(data.output,/plan is not complete/);
});

test('real research tool produces a grounded explanation, not just search excerpts',async()=>{
 const originalFetch=globalThis.fetch;
 let modelCalls=0;
 globalThis.fetch=async()=>Response.json({results:[{
  title:'Hydrogen storage official research',url:'https://energy.gov/hydrogen',
  content:'Compressed gas and cold liquid hydrogen storage are physical approaches.',engine:'web'
 }]});
 try{
  const result=await worker.fetch(new Request('https://tools/v1/assist',{method:'POST',
   headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
   body:JSON.stringify({request:'hydrogen storage',tool:'web.search',
    researchContext:'Research hydrogen storage and explain how it works using credible sources.'})}),{
    AI:{run:async(_model,options)=>{
     modelCalls++;
     assert.match(options.messages[1].content,/Compressed gas and cold liquid hydrogen/);
     assert.match(options.messages[1].content,/Research hydrogen storage/);
     return {response:'Hydrogen can be stored as compressed gas or cooled into a liquid. These methods need pressure vessels or refrigeration, according to the source excerpt. The full paper was not read.'};
    }}
   });
  const body=await result.json();
  assert.equal(modelCalls,1);
  assert.equal(body.receipt.tool,'web.search');
  assert.equal(body.receipt.status,'complete');
  assert.equal(body.sources.length,1);
  assert.match(body.output,/stored as compressed gas/);
  assert.doesNotMatch(body.output,/^Live results from /);
  assert.equal(body.sources[0].readScope,'Search result excerpt; full article not fetched');
  assert.equal(body.receipt.repositoryActionsVerified,false);
 }finally{globalThis.fetch=originalFetch}
});
test('unavailable research synthesis keeps genuine search sources and marks explanation partial',async()=>{
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({results:[{
  title:'Energy research',url:'https://energy.gov/hydrogen',content:'Compressed storage.',engine:'web'
 }]});
 try{
  const result=await worker.fetch(new Request('https://tools/v1/assist',{method:'POST',
   headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
   body:JSON.stringify({request:'Research hydrogen storage',tool:'web.search'})}),{
    AI:{run:async()=>{throw Error('model failed')}}
   });
  const body=await result.json();
  assert.equal(body.receipt.tool,'web.search');
  assert.equal(body.receipt.status,'complete');
  assert.equal(body.sources.length,1);
  assert.equal(body.answerStatus,'partial');
  assert.equal(body.analysisVerified,false);
  assert.match(body.output,/not complete/i);
 }finally{globalThis.fetch=originalFetch}
});

test('fabricated id-first web.read JSON never reaches Bubbles chat or voice',async()=>{
 const bad='We will fetch the DARPA page. {"id":"read1","tool":"web.read","url":"https://www.darpa.mil/research/programs/o-circuit"}';
 const {hasModelToolLeak}=await import('../workers/bubbles-tools/worker.mjs');
 assert.equal(hasModelToolLeak(bad),true);
 const source=Response.json({ok:true,output:'Live results from source excerpts: example.',
  sources:[{title:'O-Circuit - DARPA',url:'https://www.darpa.mil/research/programs/o-circuit',excerpt:'DARPA program goals involve biological processing units.'}],
  receipt:{tool:'web.search',status:'complete'}});
 const result=await finishSearchReply(source,()=>Response.json({ok:true,output:bad}),20,'Research DARPA O-Circuit using sources and explain the findings');
 const data=await result.json();
 assert.equal(data.answerStatus,'partial');
 assert.equal(data.receipt.status,'complete'); // the search succeeded, explanation did not
 assert.match(data.output,/I found source excerpts/);
 assert.match(data.output,/could not finish a reliable explanation/);
 assert.doesNotMatch(data.output,/\{"id"|"tool"|We will fetch|Live results from/);
 assert.equal(data.sources[0].url,'https://www.darpa.mil/research/programs/o-circuit');
});
test('generated draft cannot pass even if model reports success',async()=>{
 const prior=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({results:[{title:'O-Circuit DARPA',url:'https://www.darpa.mil/research/programs/o-circuit',
  content:'DARPA researchers propose an organoid processing research program.',engine:'web'}]});
 try{
  const bad='We will fetch the page {"id":"read1","tool":"web.read","url":"https://www.darpa.mil/research/programs/o-circuit"}';
  const res=await worker.fetch(new Request('https://bubbles-tools.test/v1/assist',{method:'POST',
   headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
   body:JSON.stringify({request:'Research DARPA O-Circuit and explain what is demonstrated',tool:'web.search'})}),{
   AI:{run:async()=>({response:bad})}});
  const data=await res.json();
  assert.equal(data.answerStatus,'partial');
  assert.equal(data.analysisVerified,false);
  assert.equal(data.receipt.tool,'web.search');
  assert.doesNotMatch(data.output,/web.read|read1|\{"id"/);
 }finally{globalThis.fetch=prior;}
});
