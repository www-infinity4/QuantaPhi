const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const bubbles=fs.readFileSync('bubbles-ai.js','utf8');
const brain=fs.readFileSync('workers/infinity-brain-clock/worker.js','utf8');
const home=fs.readFileSync('index.html','utf8');
const studio=fs.readFileSync('bubbles.html','utf8');

test('Owner commands are parsed and client JavaScript compiles',()=>{
 assert.doesNotThrow(()=>new Function(bubbles));
 assert.match(bubbles,/start_immediately:true/);
 assert.doesNotMatch(bubbles,/requestRunner\(result\.ticket\.id/);
 assert.match(bubbles,/\/work\/run-next/);
 assert.match(bubbles,/queued_for_runner/);
 assert.match(bubbles,/ownerMode\.textContent='Owner mode connected/);
});
test('Brain action dispatch is server-authorized and only enqueues a runner cycle',()=>{
 const gate=brain.indexOf("if(path==='/work/run-next'");
 const end=brain.indexOf("if(path==='/work/earnings/connect'",gate);
 const segment=brain.slice(gate,end);
 assert.ok(gate>0&&end>gate);
 assert.match(segment,/ownerAuthorized\(env,token\)/);
 assert.match(segment,/\/run-next/);
 assert.match(segment,/origin_not_allowed/);
 assert.match(bubbles,/brainTools.executionMessage/);
});
test('Independent visitors are never granted the owner tools',()=>{
 assert.match(bubbles,/if\(embedded\)throw Error\('Guest embed bubbles cannot access the owner Robot Brain/);
 assert.match(bubbles,/if\(!embedded&&\/\^/);
 assert.match(bubbles,/gptConnect\.hidden=!nativeOverlay/);
});
test('First-party site and studio both use new verified owner command assets',()=>{
 for(const page of [home,studio]){
  assert.match(page,/bubbles-ai\.js\?v=2026\d{4}-[A-Za-z0-9-]+/);
  assert.match(page,/bubbles-ai\.css\?v=2026\d{4}-[A-Za-z0-9-]+/);
 }
});

test('An ordinary owner request to add a copy button uses a real code route',()=>{
 const pattern=bubbles.match(/const codeTask=(\/.*?\/i)\.test\(request\);/);
 assert.ok(pattern,'direct code request matcher exists');
 const matches=new Function('request','return '+pattern[1]+'.test(request);');
 assert.equal(matches('Add copy button to owner approval'),true);
 assert.equal(matches('Please add a copy button to Bubbles owner approval'),true);
 assert.equal(matches('Tell me about copying paintings'),false);
 assert.match(bubbles,/owner\[- \]approval/);
 assert.match(bubbles,/const copy=create\('button','ba-owner-copy','Copy request'\)/);
 assert.match(bubbles,/navigator\.clipboard\?\.writeText\(summary\)/);
 assert.match(bubbles,/result\.textContent='Owner approval details copied\.'/);
});
test('Quant-AI selling preferences cannot hijack a normal owner chat',()=>{
 const rule=bubbles.match(/const privateSellerRequest=(.*);/);
 assert.ok(rule,'private seller-only request guard exists');
 const isSeller=new Function('config','nativeOverlay','request','return '+rule[1]+';');
 const enabled={privateContext:true};
 assert.equal(isSeller(enabled,false,'Add copy button to owner approval'),false);
 assert.equal(isSeller(enabled,false,'Fix Bubbles owner mode'),false);
 assert.equal(isSeller(enabled,false,'Sell this old coin using my selling defaults'),true);
 assert.equal(isSeller(enabled,true,'Sell this old coin'),false);
 assert.match(bubbles,/else if\(privateSellerRequest\)/);
 assert.doesNotMatch(bubbles,/else if\(config\.privateContext&&!nativeOverlay\)/);
});
