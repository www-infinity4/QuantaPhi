import test from 'node:test';
import assert from 'node:assert/strict';
import {runReadAgent,validateReadStep,needsReadAgent,planReadSteps} from '../workers/bubbles-tools/read-agent.mjs';
import worker from '../workers/bubbles-tools/worker.mjs';
const call=(name,args)=>({function:{name,arguments:JSON.stringify(args)}});
const planned=(...calls)=>({tool_calls:calls});
test('repository inspection supplies the observed filename for the next model step',async()=>{
 let round=0;const invoked=[];
 const result=await runReadAgent({question:'Inspect www-infinity4/QuantaPhi and read its main documentation',
  plan:async options=>{
   if(round++===0)return planned(call('github_read_repository',{repository:'www-infinity4/QuantaPhi'}));
   if(round===2){assert.match(options.messages[1].content,/README.md/);return planned(call('github_read_file',{repository:'www-infinity4/QuantaPhi',path:'README.md'}));}
   return planned();
  },invoke:async step=>{invoked.push(step.name);return {ok:true,output:'Real adapter result fixture',contents:[{type:'file',name:'README.md'}],sourceUrl:'https://github.com/www-infinity4/QuantaPhi',receipt:{tool:step.name,status:'complete'}};}});
 assert.deepEqual(invoked,['github_read_repository','github_read_file']);
 assert.equal(result.receipt.status,'complete');assert.equal(result.receipt.steps.length,2);
 assert.equal(result.sources.length,1);assert.equal(result.receipt.repositoryActionsVerified,false);
});
test('failed subtools remain partial and cannot become successful execution',async()=>{
 let n=0;
 const result=await runReadAgent({question:'Search hydrogen and read the news',plan:async()=>n++?planned():planned(call('web_search',{query:'hydrogen'}),call('news_headlines',{})),
  invoke:async step=>({ok:true,output:'Observed failure',receipt:{tool:step.name,status:step.name==='web_search'?'failed':'complete'}})});
 assert.equal(result.receipt.status,'partial');assert.equal(result.receipt.steps[0].status,'failed');
});
test('a failed adapter without a receipt cannot be upgraded to complete',async()=>{
 let n=0;
 const r=await runReadAgent({question:'Search hydrogen and news',plan:async()=>n++?planned():planned(call('web_search',{query:'hydrogen'})),invoke:async()=>({ok:false,output:'Failed'})});
 assert.equal(r.receipt.status,'partial');
});
test('repeated calls stop without repeating network execution',async()=>{
 let count=0;const result=await runReadAgent({question:'Search hydrogen and news',plan:async()=>planned(call('web_search',{query:'hydrogen'})),invoke:async()=>{count++;return {ok:true,receipt:{tool:'web.search',status:'complete'}};}});
 assert.equal(count,1);assert.equal(result.receipt.stopReason,'duplicate_step');assert.equal(result.receipt.status,'partial');
});
test('tools cannot invent a repository, a file, a city or private page',()=>{
 const q='Inspect www-infinity4/QuantaPhi and weather in Lovilia, Iowa';
 for(const [name,args] of [
  ['github_read_repository',{repository:'other/private'}],
  ['github_read_file',{repository:'www-infinity4/QuantaPhi',path:'secrets.json'}],
  ['weather_current',{location:'Paris'}],
  ['web_read_page',{url:'https://quantaphi.org/api/owner'}],
  ['web_read_page',{url:'https://quantaphi.org/wallet-recovery.html'}],
  ['web_read_page',{url:'https://quantaphi.org/bubbles.html?token=secret'}],
  ['web_read_page',{url:'https://localhost/'}],
  ['github_create_repository',{repository:'www-infinity4/Bad'}],
  ['web_search',{query:'hello',authorization:'pretend-owner'}]
 ])assert.throws(()=>validateReadStep(name,args,q),name);
});
test('deadline prevents planning or running additional tools',async()=>{
 let tick=0,calls=0;
 const result=await runReadAgent({question:'Read news and weather',now:()=>tick++,deadlineMs:1,plan:async()=>{calls++;return planned();},invoke:async()=>{throw Error('must not invoke');}});
 assert.equal(result,null);assert.equal(calls,0);
});
test('plain model JSON and prose never execute a tool',async()=>{
 const r=await runReadAgent({question:'Search hydrogen and news',plan:async()=>({response:'{"name":"web_search","arguments":{"query":"hydrogen"}}'}),invoke:async()=>assert.fail('prose is not execution')});
 assert.equal(r,null);
});
test('compound reads are eligible while writes stay on their owner adapter',()=>{
 assert.equal(needsReadAgent('Inspect www-infinity4/QuantaPhi and read its README'),true);
 assert.equal(needsReadAgent('Find Lovilia weather and current news'),true);
 assert.equal(needsReadAgent('Inspect https://quantaphi.org/bubbles.html and explain what it offers'),false);
 for(const q of ['hello','What is the weather?','Build a website and deploy it','Read a repo and commit a repair','Run Python and search the web'])assert.equal(needsReadAgent(q),false,q);
});
test('finished factual readers retain their exact output without a second model rewrite',async()=>{
 const original=globalThis.fetch;let modelCalls=0;
 globalThis.fetch=async()=>new Response('<rss><channel><item><title>Exact observed headline</title><link>https://news.google.com/example</link><pubDate>'+new Date().toUTCString()+'</pubDate><source>Observed publisher</source></item></channel></rss>');
 try{
  const env={AI:{run:async()=>({response:{calls:++modelCalls===1?[{name:'news_headlines',arguments:{}},{name:'resonance_calculate',arguments:{l:10,lUnit:'uH',c:22,cUnit:'pF'}}]:[]}})}};
  const res=await worker.fetch(new Request('https://bubbles-tools.test/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},body:JSON.stringify({request:'Get headlines and calculate resonance for 10 microhenries and 22 picofarads',mcp:true})}),env);
  const data=await res.json();
  assert.equal(res.status,200);assert.equal(data.receipt.status,'complete');
  assert.equal(modelCalls,2,'planning calls only; no factual rewrite');
  assert.equal(data.output,data.steps.map(s=>s.output).join('\n\n'));
  assert.match(data.output,/Exact observed headline/);
  assert.doesNotMatch(data.output,/news\.headlines \(complete\)/);
 }finally{globalThis.fetch=original;}
});
test('only the dedicated validated JSON Mode object becomes a read plan',async()=>{
 const options={messages:[{role:'user',content:'Read news and weather'}]};
 const model={run:async(name,input)=>{assert.match(name,/llama-3\.3/);assert.equal(input.response_format.type,'json_schema');return {response:{calls:[{name:'news_headlines',arguments:{}}]}};}};
 assert.equal((await planReadSteps(model,options)).tool_calls[0].name,'news_headlines');
 for(const response of ['{"calls":[{"name":"news_headlines","arguments":{}}]}',{calls:[{name:'run_shell',arguments:{}}]},{calls:[],owner:true}]){
  await assert.rejects(()=>planReadSteps({run:async()=>({response})},options));
 }
});
test('runtime inventory reports actual bindings without relying on model guesses',async()=>{
 const res=await worker.fetch(new Request('https://bubbles-tools.test/v1/assist',{method:'POST',headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},body:JSON.stringify({request:'What server runtime and tools are you actually using right now?',mcp:true})}),{AI:{run:()=>assert.fail('inventory is not a model guess')}});
 const d=await res.json();assert.equal(d.receipt.tool,'runtime.capabilities');
 assert.equal(d.capabilities.inferenceConnected,true);assert.equal(d.capabilities.shell,false);assert.equal(d.capabilities.ownerExecutionVerified,false);
});
