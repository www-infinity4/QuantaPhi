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


const vm=require('node:vm');
test('copies each user and assistant message in the shared Android/web chat',async()=>{
 const source=fs.readFileSync('bubbles-ai.js','utf8');
 const start=source.indexOf('async function copyBubblesMessage(');
 const end=source.indexOf('function display(',start);
 assert.ok(start>0&&end>start,'copy function must appear before display');
 const display=source.slice(end,source.indexOf('for(const item of messages)',end));
 assert.match(display,/row\.append\(copy\)/);
 assert.match(display,/line\.append\(row\)/);
 assert.match(display,/copyBubblesMessage\(text,bubble,copy\)/);
 const writes=[],status={},button={textContent:'Copy',isConnected:true};
 const sandbox={navigator:{clipboard:{writeText:async value=>writes.push(value)}},status,setTimeout(){}};
 vm.createContext(sandbox);vm.runInContext(source.slice(start,end),sandbox);
 assert.equal(await sandbox.copyBubblesMessage('Full text, including URL https://example.com',{},button),true);
 assert.equal(writes[0],'Full text, including URL https://example.com');
 assert.equal(button.textContent,'Copied');
 assert.match(status.textContent,/copied/i);
});
test('Android WebView falls back to selectable message and legacy copy command',async()=>{
 const source=fs.readFileSync('bubbles-ai.js','utf8');
 const start=source.indexOf('async function copyBubblesMessage('),end=source.indexOf('function display(',start);
 let selected=false,copied=false,retainedSelection=false;
 const selection={removeAllRanges(){retainedSelection=false},addRange(){selected=true;retainedSelection=true}};
 const sandbox={navigator:{clipboard:{writeText:async()=>{throw Error('permission denied')}}},
   window:{getSelection:()=>selection},status:{},setTimeout(){},
   document:{createRange:()=>({selectNodeContents(node){assert.equal(node.id,'visible')}}),
     execCommand(name){assert.equal(name,'copy');copied=true;return true}}};
 vm.createContext(sandbox);vm.runInContext(source.slice(start,end),sandbox);
 assert.equal(await sandbox.copyBubblesMessage('Message',{id:'visible'},{textContent:'Copy'}),true);
 assert.equal(selected,true);assert.equal(copied,true);assert.equal(retainedSelection,false);
 sandbox.document.execCommand=()=>false;
 const fallbackButton={textContent:'Copy'};
 assert.equal(await sandbox.copyBubblesMessage('Message',{id:'visible'},fallbackButton),false);
 assert.equal(retainedSelection,true,'failed copy must leave the real message selected');
 assert.match(sandbox.status.textContent,/Android selection menu/i);
});
