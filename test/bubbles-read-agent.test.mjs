import test from 'node:test';
import assert from 'node:assert/strict';
import {runReadAgent,validateReadStep,needsReadAgent} from '../workers/bubbles-tools/read-agent.mjs';
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
 for(const q of ['hello','What is the weather?','Build a website and deploy it','Read a repo and commit a repair','Run Python and search the web'])assert.equal(needsReadAgent(q),false,q);
});
