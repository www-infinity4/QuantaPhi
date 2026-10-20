import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/bubbles-tools/worker.mjs';
import {parseMcpFunctionCall} from '../workers/bubbles-tools/mcp.mjs';

const call=(name,args)=>({choices:[{message:{tool_calls:[{type:'function',function:{
 name,arguments:JSON.stringify(args)
}}]}}]});

const assist=async(request,run)=>{
 const response=await worker.fetch(new Request('https://tools/v1/assist',{
  method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
  body:JSON.stringify({request})
 }),{AI:{run}});
 assert.equal(response.status,200);
 return response.json();
};

test('same semantic goal across differently worded requests executes the same read-only tool and keeps its receipt',async()=>{
 const paraphrases=[
  'If I have 10 microhenries of inductance with 22 picofarads, what natural frequency should I expect?',
  'With a 10 uH coil and 22 pF capacitor, find the oscillation rate.',
  'My setup uses 10 microhenry and 22 picofarad; how fast does it oscillate?',
  'Could you work out the frequency for 22 picofarads coupled to 10 microhenries?'
 ];
 const outcomes=[];
 for(const request of paraphrases){
  let modelCalls=0;
  const result=await assist(request,async(model,options)=>{
   modelCalls++;
   assert.equal(model,'@cf/openai/gpt-oss-120b');
   assert.equal(options.tool_choice,'auto');
   assert.ok(options.tools.some(t=>t.function.name==='resonance_calculate'));
   assert.ok(options.tools.every(t=>!/(?:github|browser|write|deploy)/i.test(t.function.name)));
   return call('resonance_calculate',{l:10,lUnit:'uH',c:22,cUnit:'pF'});
  });
  assert.equal(modelCalls,1,'no second model is needed to explain the deterministic evidence');
  assert.equal(result.receipt.tool,'resonance.calculate');
  assert.equal(result.receipt.status,'complete');
  assert.equal(result.receipt.repositoryActionsVerified,false);
  assert.equal(result.receipt.minted,false);
  assert.equal(result.semantic.state,'finished');
  assert.equal(result.semantic.goal,'resonance_calculate');
  assert.match(result.output,/Ideal LC resonance:/);
  assert.match(result.output,/MHz/);
  assert.ok(result.receipt.id);
  assert.equal(result.result.model,'ideal-resonance-v1');
  outcomes.push(result);
 }
 const frequencies=outcomes.map(x=>x.result.engineering.frequencyHz);
 assert.ok(frequencies.every(x=>x===frequencies[0]));
 assert.equal(new Set(outcomes.map(x=>x.receipt.id)).size,paraphrases.length,
  'a real invocation produces its own receipt');
});

test('ambiguous subjects and ungrounded model parameters never execute tools',async()=>{
 const ambiguous=[
  ['What frequency is it?',call('resonance_calculate',{l:10,lUnit:'uH',c:22,cUnit:'pF'}),'resonance_values_not_grounded'],
  ['Find the frequency with 10 microhenries.',call('resonance_calculate',{l:10,lUnit:'uH',c:22,cUnit:'pF'}),'resonance_values_not_grounded'],
  ['For 10 microhenries and 22 picofarads, calculate it.',call('resonance_calculate',{l:20,lUnit:'uH',c:22,cUnit:'pF'}),'resonance_parameters_mismatch'],
  ['Is it chilly over there?',call('weather_current',{location:'Omaha, Nebraska'}),'weather_location_not_grounded'],
  ['Find that thing for me.',call('web_search',{query:'Omaha restaurants'}),'search_subject_not_grounded'],
  ['Delete my repository.',call('github.delete_repository',{repo:'QuantaPhi'}),'unresolved_or_invalid_tool_request']
 ];
 for(const [question,decision,reason] of ambiguous){
  let invocations=0;
  const result=await assist(question,async()=>{
   invocations++;
   return decision;
  });
  assert.equal(invocations,1);
  assert.equal(result.semantic.state,'waiting',question);
  assert.equal(result.semantic.reason,reason,question);
  assert.equal(result.receipt.status,'needs_input');
  assert.equal(result.receipt.repositoryActionsVerified,false);
  assert.equal(result.result,undefined,'no calculator/search/weather action ran');
  assert.doesNotMatch(result.output,/Ideal LC resonance:|Current weather for|Live results from/);
 }
});

test('model tools remain an exact read-only allowlist; fake prose and write actions are inert',()=>{
 assert.equal(parseMcpFunctionCall({response:'{"name":"weather_current","arguments":{"location":"Ottumwa"}}'}),null);
 assert.equal(parseMcpFunctionCall(call('github.create_repository',{name:'anything'})),null);
 assert.equal(parseMcpFunctionCall(call('web_search',{query:'test',url:'https://example.com'})),null);
 assert.equal(parseMcpFunctionCall({choices:[{message:{tool_calls:[
  {function:{name:'news_headlines',arguments:'{}'}},
  {function:{name:'news_headlines',arguments:'{}'}}
 ]}}]}),null);
 assert.deepEqual(parseMcpFunctionCall(call('weather_current',{location:'Albia, Iowa'})),
  {name:'weather_current',location:'Albia, Iowa'});
});

test('ordinary conversation keeps the fast one-model-turn path',async()=>{
 let count=0;
 const r=await worker.fetch(new Request('https://tools/v1/assist',{
  method:'POST',headers:{Origin:'https://quantaphi.org'},
  body:JSON.stringify({request:'Tell me a friendly greeting'})
 }),{AI:{run:async()=>{count++;return {response:'Hello!'}}}});
 assert.equal(r.status,200);
 assert.equal(count,1);
 assert.equal((await r.json()).output,'Hello!');
});
