import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{chooseTool} from '../workers/bubbles-tools/worker.mjs';
import {calculateOrganicBenchmark,organicArgs,organicSpeechArgs} from '../workers/bubbles-tools/organic-benchmark.mjs';
import {validateCall,mcpTools,MCP_VERSION} from '../workers/bubbles-tools/mcp.mjs';

const origin='https://quantaphi.org';
test('same data and seed produce repeatable fair results',()=>{
 const a=calculateOrganicBenchmark({seed:111,trials:100,flippedBits:1});
 assert.deepEqual(a,calculateOrganicBenchmark({seed:111,trials:100,flippedBits:1}));
 assert.equal(a.patternCount,2);
 assert.equal(a.patternBits,6);
 assert.equal(a.metrics.identity.correct,0);
 assert.ok(a.metrics.hopfield.correct<=a.trials);
 assert.ok(a.metrics.nearest_template.correct<=a.trials);
 assert.match(a.limitations.join(' '),/No end-to-end energy/);
});
test('zero-noise recalls the known training templates',()=>{
 const a=calculateOrganicBenchmark({seed:222,trials:100,flippedBits:0});
 for(const value of Object.values(a.metrics))assert.equal(value.correct,100);
});
test('strict read-only parameters and spoken input',()=>{
 assert.deepEqual(organicSpeechArgs('Compare organic computation memory recall with one flipped bit, 40 trials, seed 17'),
   {seed:17,trials:40,flippedBits:1});
 assert.deepEqual(organicSpeechArgs('Simulate pattern recall with 2 flipped bits'),
   {seed:111,trials:250,flippedBits:2});
 for(const invalid of [{trials:0},{trials:1001},{flippedBits:7},{seed:-1},{write:true},{tokens:'secret'},{trials:'20'}]){
  assert.throws(()=>organicArgs(invalid),/invalid_arguments/);
  assert.throws(()=>validateCall('organic_memory_benchmark',invalid),/invalid_arguments/);
 }
});
test('natural Bubbles chat uses deterministic receipt, not an LLM tool claim',async()=>{
 assert.equal(chooseTool('Compare organic computation memory recall with one flipped bit'),'organic.memory_benchmark');
 assert.equal(chooseTool('Create a repo for organic computation'),'github.create_repository');
 const request=new Request('https://bubbles-tools.marvaseater.workers.dev/v1/assist',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({request:'Compare organic computation memory recall with one flipped bit, 40 trials, seed 17'})});
 const res=await worker.fetch(request,{});
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.receipt.tool,'organic.memory_benchmark');
 assert.equal(data.receipt.status,'complete');
 assert.equal(data.receipt.softwareOnly,true);
 assert.equal(data.receipt.repositoryActionsVerified,false);
 assert.equal(data.result.trials,40);
 assert.equal(data.result.flippedBits,1);
 assert.match(data.output,/not a living biological processor/i);
});
test('signed MCP client can invoke software benchmark but cannot gain write tools',async()=>{
 const token='integration-test-only-32-chars-not-for-production';
 const req=(args)=>new Request('https://bubbles-tools.marvaseater.workers.dev/mcp',{method:'POST',headers:{
  Origin:origin,'Content-Type':'application/json',Accept:'application/json, text/event-stream',
  Authorization:'Bearer '+token,'MCP-Protocol-Version':MCP_VERSION},
  body:JSON.stringify({jsonrpc:'2.0',id:5,method:'tools/call',params:{name:'organic_memory_benchmark',arguments:args}})});
 assert.ok(mcpTools.some(x=>x.name==='organic_memory_benchmark'&&x.annotations.readOnlyHint));
 const accepted=await worker.fetch(req({seed:111,trials:50,flippedBits:2}),{BUBBLES_MCP_TOKEN:token});
 const body=await accepted.json();
 assert.equal(body.result.structuredContent.receipt.status,'complete');
 assert.equal(body.result.structuredContent.receipt.tool,'organic.memory_benchmark');
 assert.equal(body.result.isError,false);
 assert.match(body.result.structuredContent.output,/software simulation/i);
 const denied=await worker.fetch(req({trials:2001}),{BUBBLES_MCP_TOKEN:token});
 assert.equal(denied.status,400);
 assert.equal((await denied.json()).error.code,-32602);
 const noToken=await worker.fetch(req({}),{});
 assert.equal(noToken.status,503);
});
