const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const bubbles=fs.readFileSync('bubbles-ai.js','utf8');
const brain=fs.readFileSync('workers/infinity-brain-clock/worker.js','utf8');
const home=fs.readFileSync('index.html','utf8');
const studio=fs.readFileSync('bubbles.html','utf8');

test('Owner commands are parsed and client JavaScript compiles',()=>{
 assert.doesNotThrow(()=>new Function(bubbles));
 assert.match(bubbles,/\brequestRunner\(result\.ticket\.id,jobs\[0\]\?\.id/);
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
 assert.match(bubbles,/Execution and deployment are not yet proven/);
});
test('Independent visitors are never granted the owner tools',()=>{
 assert.match(bubbles,/if\(embedded\)throw Error\('Guest embed bubbles cannot access the owner Robot Brain/);
 assert.match(bubbles,/if\(!embedded&&\/\^/);
 assert.match(bubbles,/gptConnect\.hidden=!nativeOverlay/);
});
test('First-party site and studio both use new verified owner command assets',()=>{
 for(const page of [home,studio]){
  assert.match(page,/bubbles-ai\.js\?v=20261014-owner-runner4/);
  assert.match(page,/bubbles-ai\.css\?v=20261014-owner-runner4/);
 }
});
