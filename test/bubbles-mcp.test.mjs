import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/bubbles-tools/worker.mjs';
import {MCP_VERSION,validateCall,mcpTools} from '../workers/bubbles-tools/mcp.mjs';
const endpoint='https://bubbles-tools.marvaseater.workers.dev/mcp';
const secret='integration-test-only-32-chars-not-for-production';
const rpc=(method,params={},id=1)=>new Request(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',Authorization:'Bearer '+secret,'MCP-Protocol-Version':MCP_VERSION},body:JSON.stringify({jsonrpc:'2.0',id,method,params})});
test('MCP is closed until provisioned and rejects wrong bearer',async()=>{
 const off=await worker.fetch(rpc('tools/list'),{});
 assert.equal(off.status,503);
 const bad=await worker.fetch(new Request(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',Authorization:'Bearer wrong','MCP-Protocol-Version':MCP_VERSION},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}),{BUBBLES_MCP_TOKEN:secret});
 assert.equal(bad.status,401);
 const noOrigin=await worker.fetch(new Request(endpoint,{method:'POST',headers:{Origin:'https://attacker.invalid','Content-Type':'application/json',Accept:'application/json, text/event-stream',Authorization:'Bearer '+secret},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:MCP_VERSION}})}),{BUBBLES_MCP_TOKEN:secret});
 assert.equal(noOrigin.status,403);
});
test('MCP initialization and tool inventory never expose owner writers',async()=>{
 const env={BUBBLES_MCP_TOKEN:secret};
 const init=await worker.fetch(rpc('initialize',{protocolVersion:MCP_VERSION,capabilities:{},clientInfo:{name:'test',version:'1.0.0'}}),env);
 assert.equal(init.status,200);assert.equal((await init.json()).result.protocolVersion,MCP_VERSION);
 const list=await (await worker.fetch(rpc('tools/list'),env)).json();
 assert.deepEqual(list.result.tools.map(x=>x.name),mcpTools.map(x=>x.name));
 assert.ok(list.result.tools.every(x=>x.annotations?.readOnlyHint===true));
 assert.ok(!list.result.tools.some(x=>/github|brain|shell|deploy|write/i.test(x.name)));
 const unknown=await worker.fetch(rpc('tools/call',{name:'github_create_repository',arguments:{name:'surprise'}}),env);
 assert.equal(unknown.status,400);assert.equal((await unknown.json()).error.code,-32602);
});
test('MCP resonance tool returns actual calculator output and receipt',async()=>{
 const result=await worker.fetch(rpc('tools/call',{name:'resonance_calculate',arguments:{l:10,lUnit:'uH',c:22,cUnit:'pF'}},8),{BUBBLES_MCP_TOKEN:secret});
 assert.equal(result.status,200);
 const json=await result.json();
 assert.equal(json.id,8);
 assert.equal(json.result.isError,false);
 assert.match(json.result.content[0].text,/resonan|frequency|MHz|kHz/i);
 assert.equal(json.result.structuredContent.receipt.tool,'resonance.calculate');
 assert.equal(json.result.structuredContent.receipt.repositoryActionsVerified,false);
});
test('reject malformed MCP schema and notification misuse',async()=>{
 assert.throws(()=>validateCall('web_search',{query:'hello',owner:true}),/invalid_arguments/);
 assert.throws(()=>validateCall('resonance_calculate',{l:-10,lUnit:'uH',c:22,cUnit:'pF'}),/invalid_arguments/);
 const env={BUBBLES_MCP_TOKEN:secret};
 const wrongVersion=await worker.fetch(new Request(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',Authorization:'Bearer '+secret,'MCP-Protocol-Version':'2025-03-26'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})}),env);
 assert.equal(wrongVersion.status,400);
 const verb=await worker.fetch(new Request(endpoint,{method:'GET'}),env);assert.equal(verb.status,405);
});
test('Bubbles can select a read-only MCP function using structured LLM tool call',async()=>{
 let calls=0;
 const env={AI:{run:async(model,options)=>{
  calls++;
  assert.equal(model,'@cf/openai/gpt-oss-120b');
  if(calls===1){assert.equal(options.tools.length,4);return{choices:[{message:{tool_calls:[{type:'function',function:{name:'resonance_calculate',arguments:JSON.stringify({l:10,lUnit:'uH',c:22,cUnit:'pF'})}}]}}]};}
  throw Error('Unexpected extra model call');
 }}};
 const req=new Request('https://bubbles-tools.marvaseater.workers.dev/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},body:JSON.stringify({request:'Bubbles use MCP tools to calculate 10 microhenries and 22 picofarads',mcp:true})});
 const res=await worker.fetch(req,env);const json=await res.json();
 assert.equal(res.status,200);assert.equal(calls,1);
 assert.equal(json.receipt.interface,'MCP');assert.equal(json.receipt.selection,'structured_function_call');
 assert.equal(json.receipt.tool,'resonance.calculate');
 assert.equal(json.receipt.repositoryActionsVerified,false);
});
test('unstructured model text is never run as a tool',async()=>{
 let calls=0;
 const req=new Request('https://bubbles-tools.marvaseater.workers.dev/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},body:JSON.stringify({request:'Bubbles, use MCP tools to help me',mcp:true})});
 const res=await worker.fetch(req,{AI:{run:async(model,opts)=>{calls++;return{response:calls===1?'{"name":"web_search","arguments":{"query":"secret"}}':'No external tool was executed.'}}}});
 assert.equal(res.status,200);
 const json=await res.json();assert.equal(json.receipt.tool,'oracle.chat');
 assert.equal(json.receipt.interface,undefined);
});
