import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/bubbles-tools/worker.mjs';
import {parseMcpFunctionCall} from '../workers/bubbles-tools/mcp.mjs';

const call=(name,args)=>({choices:[{message:{tool_calls:[{type:'function',function:{
 name,arguments:JSON.stringify(args)
}}]}}]});

test('Bubbles reads intended meaning with a model-selected tool, without a magic MCP phrase',async()=>{
 let count=0;
 const request=new Request('https://tools/v1/assist',{method:'POST',headers:{
  Origin:'https://quantaphi.org','Content-Type':'application/json'
 },body:JSON.stringify({request:'If I have 10 microhenries of inductance with 22 picofarads, what natural frequency should I expect?'})});
 const r=await worker.fetch(request,{AI:{run:async(model,options)=>{
  assert.equal(model,'@cf/openai/gpt-oss-120b');
  count++;
  if(count===1){
   assert.equal(options.tool_choice,'auto');
   assert.ok(options.tools.some(t=>t.function.name==='resonance_calculate'));
   assert.ok(options.tools.every(t=>!/(?:github|browser|write|deploy)/i.test(t.function.name)));
   return call('resonance_calculate',{l:10,lUnit:'uH',c:22,cUnit:'pF'});
  }
  assert.equal(options.tools,undefined,'one safe read is followed by a tool-free summary');
  assert.match(options.messages[1].content,/Actual tool result/);
  return {response:'The ideal LC resonance result is based on the requested inductance and capacitance.'};
 }}});
 const body=await r.json();
 assert.equal(r.status,200);
 assert.equal(count,2);
 assert.match(body.output,/ideal LC resonance result/);
 assert.equal(body.receipt.status,'complete');
 assert.equal(body.receipt.repositoryActionsVerified,false);
 assert.equal(body.receipt.minted,false);
 assert.ok(Math.abs(body.result.engineering.inductanceHenries-1e-5)<1e-15);
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
