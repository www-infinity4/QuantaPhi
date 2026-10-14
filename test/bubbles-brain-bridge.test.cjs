const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const page=fs.readFileSync('bubbles.html','utf8');
const js=fs.readFileSync('bubbles-ai.js','utf8');
test('standalone Bubbles loads wallet and verified Robot Brain ahead of chat',()=>{
 const wallet=page.indexOf('/cloud-wallet-client.js?v=');
 const gate=page.indexOf('/robot-brain-owner.js?v=');
 const ai=page.indexOf('/bubbles-ai.js?v=');
 assert.ok(wallet>0&&gate>wallet&&ai>gate);
 assert.match(page,/id="robotBrainOwner"/);
 assert.match(page,/QuantaCloudConnectionDisableAutoRecovery=true/);
});
test('work is routed only for explicit requests outside embedded mode',()=>{
 assert.match(js,/function isOwnerWorkRequest\(text\)/);
 assert.match(js,/if\(!embedded&&isOwnerWorkRequest\(request\)\)/);
 assert.match(js,/submitWork\(request,'explicit-user-command'\)/);
 assert.match(js,/window\.QuantaBrainOwner\?await window\.QuantaBrainOwner\.ready/);
});

test('the public /bubbles/ route loads the same authenticated Brain adapter as bubbles.html',()=>{
 const route=fs.readFileSync('bubbles/index.html','utf8');
 for(const html of [page,route]){
  const wallet=html.indexOf('/cloud-wallet-client.js?v=');
  const owner=html.indexOf('/robot-brain-owner.js?v=');
  const actions=html.indexOf('/bubbles-brain-actions.js?v=');
  const chat=html.indexOf('/bubbles-ai.js?v=');
  assert.ok(wallet>0&&owner>wallet&&actions>owner&&chat>actions);
  assert.match(html,/id="robotBrainOwner"/);
 }
});

