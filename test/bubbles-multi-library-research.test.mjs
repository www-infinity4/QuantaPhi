import test from 'node:test';
import assert from 'node:assert/strict';
import {needsReadAgent,runReadAgent} from '../workers/bubbles-tools/read-agent.mjs';
const tool=(name,args)=>({function:{name,arguments:JSON.stringify(args)}});
test('multiple documentation libraries are READS, not Python code execution',()=>{
 assert.equal(needsReadAgent('Research the actual Python libraries html5lib, lxml and BeautifulSoup and the JavaScript tree-sitter parser. Explain which recover malformed HTML and which parse program syntax.'),true);
 assert.equal(needsReadAgent('Research the actual Python libraries lxml and html5lib, then compare their parsing limitations.'),true);
 assert.equal(needsReadAgent('Run Python and shell commands to modify files'),false);
 assert.equal(needsReadAgent('Create an app and deploy it'),false);
});
test('a multistep library comparison requires independent observed read receipts',async()=>{
 let i=0;const calls=[];
 const result=await runReadAgent({
  question:'Research Python HTML parsers and JavaScript parser libraries',
  plan:async()=>i++===0?{tool_calls:[
   tool('web_search',{query:'html5lib lxml BeautifulSoup documentation'}),
   tool('web_search',{query:'tree-sitter JavaScript parsing documentation'})]}:{tool_calls:[]},
  invoke:async step=>{calls.push(step.query);return {ok:true,
    output:'Verified source excerpt for '+step.query,
    sources:[{title:'Documented parser',url:'https://example.org/'+calls.length}],
    receipt:{tool:'web.search',status:'complete'}}}
 });
 assert.equal(calls.length,2);
 assert.equal(result.receipt.status,'complete');
 assert.equal(result.sources.length,2);
 assert.equal(result.receipt.repositoryActionsVerified,false);
});
test('unavailable second source remains partial, not a made-up research success',async()=>{
 let i=0;
 const result=await runReadAgent({
  question:'Research Python HTML parsers and JavaScript parser libraries',
  plan:async()=>i++===0?{tool_calls:[
   tool('web_search',{query:'html5lib documentation'}),
   tool('web_search',{query:'tree-sitter documentation'})]}:{tool_calls:[]},
  invoke:async step=>({ok:true,output:'Observed read result',receipt:{tool:'web.search',status:step.query.startsWith('html5lib')?'complete':'failed'}})
 });
 assert.equal(result.receipt.status,'partial');
});
