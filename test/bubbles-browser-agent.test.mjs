import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {browserSpeechIntent} from '../bubbles-cloud-browser.mjs';
import {browserAction} from '../workers/bubbles-tools/browser-cdp.mjs';

test('Bubbles routes actual spoken Chrome research commands',()=>{
 assert.deepEqual(browserSpeechIntent('open StarQuest in the cloud browser'),{action:'navigate',url:'https://quantaphi.org/starquest/'});
 assert.deepEqual(browserSpeechIntent('open Cloudflare in the cloud browser'),{action:'navigate',url:'https://dash.cloudflare.com/'});
 assert.deepEqual(browserSpeechIntent('plug cloud browser into Bubbles'),{action:'navigate',url:'https://quantaphi.org/bubbles.html'});
 assert.deepEqual(browserSpeechIntent('connect the cloud browser'),{action:'navigate',url:'https://quantaphi.org/bubbles.html'});
 assert.deepEqual(browserSpeechIntent('start cloud browser'),{action:'navigate',url:'https://quantaphi.org/bubbles.html'});
 assert.deepEqual(browserSpeechIntent('read the page in the cloud browser'),{action:'read'});
 assert.deepEqual(browserSpeechIntent('click "Watch" in the cloud browser'),{action:'click',label:'Watch'});
 assert.deepEqual(browserSpeechIntent('type "Rocket" into Search in the cloud browser'),{action:'type',value:'Rocket',field:'Search'});
 assert.deepEqual(browserSpeechIntent('open Gemini'),{action:'navigate',url:'https://gemini.google.com/'});
 assert.deepEqual(browserSpeechIntent('open Cloudflare'),{action:'navigate',url:'https://dash.cloudflare.com/'});
 assert.deepEqual(browserSpeechIntent('search for Android neural speech in the cloud browser'),{action:'navigate',url:'https://www.google.com/search?q=Android%20neural%20speech'});
 assert.deepEqual(browserSpeechIntent('use the cloud browser to search for weather in Albia Iowa'),{action:'navigate',url:'https://www.google.com/search?q=weather%20in%20Albia%20Iowa'});
 assert.equal(browserSpeechIntent('Why is Gemini useful?'),null);
 assert.equal(browserSpeechIntent('read my Github repository'),null);
});

function fakeBrowser(){
 const calls=[];
 let handlers={};
 const socket={
  accept(){},
  close(){},
  addEventListener(type,callback){handlers[type]=callback},
  removeEventListener(type,callback){if(handlers[type]===callback)delete handlers[type]},
  send(raw){
   const data=JSON.parse(raw);calls.push(data);
   const response=data.method==='Page.navigate'?{frameId:'frame-ok'}:
    {result:{value:{title:'StarQuest',url:'https://quantaphi.org/starquest/',text:'Watch StarQuest movies'}}};
   queueMicrotask(()=>handlers.message?.({data:JSON.stringify({id:data.id,result:response})}));
  }
 };
 return {env:{BROWSER:{
  devtools:{listTargets:async()=>[{type:'page',id:'ABC123',title:'StarQuest',url:'https://quantaphi.org/starquest/'}]},
  connectSession:async(sessionId,{targetId})=>{
   assert.equal(sessionId,'11111111-1111-4111-8111-111111111111');assert.equal(targetId,'ABC123');
   return {webSocket:{fetch:async()=>({webSocket:socket})}}
  }
 }},calls};
}
test('Bubbles page read genuinely uses Runtime.evaluate over Chrome CDP',async()=>{
 const {env,calls}=fakeBrowser();
 const result=await browserAction(env,{sessionId:'11111111-1111-4111-8111-111111111111',action:'read'});
 assert.equal(result.title,'StarQuest');
 assert.equal(result.text,'Watch StarQuest movies');
 assert.equal(result.targetId,'ABC123');
 assert.equal(calls.length,1);
 assert.equal(calls[0].method,'Runtime.evaluate');
 assert.match(calls[0].params.expression,/document\.body/);
});
test('Navigation is a real Page.navigate command and click/type are bounded',async()=>{
 const {env,calls}=fakeBrowser();
 const navigated=await browserAction(env,{sessionId:'11111111-1111-4111-8111-111111111111',action:'navigate',url:'https://quantaphi.org/starquest/'});
 assert.equal(navigated.navigationRequested,true);assert.equal(calls[0].method,'Page.navigate');
 await browserAction(env,{sessionId:'11111111-1111-4111-8111-111111111111',action:'click',label:'Watch'});
 assert.match(calls[1].params.expression,/owner_manual_approval_required/);
 await browserAction(env,{sessionId:'11111111-1111-4111-8111-111111111111',action:'type',field:'Search',value:'Serenity'});
 assert.match(calls[2].params.expression,/type=password/);
 await assert.rejects(()=>browserAction(env,{sessionId:'11111111-1111-4111-8111-111111111111',action:'type',field:'Search',value:'X'.repeat(501)}),/browser_field_invalid/);
});
test('actual responsive website viewport is set through Chrome CDP with a separate Android-device boundary',async()=>{
 const {env,calls}=fakeBrowser();
 const sessionId='11111111-1111-4111-8111-111111111111';
 const phone=await browserAction(env,{sessionId,action:'viewport',mode:'phone'});
 assert.equal(phone.width,360);assert.equal(phone.height,800);
 assert.equal(phone.physicalAndroidScreen,false);assert.equal(phone.mobileWebPreview,true);
 assert.equal(calls[0].method,'Emulation.setDeviceMetricsOverride');
 assert.equal(calls[0].params.width,360);assert.equal(calls[0].params.mobile,true);
 assert.equal(calls[1].method,'Emulation.setTouchEmulationEnabled');
 assert.equal(calls[1].params.enabled,true);
 const desktop=await browserAction(env,{sessionId,action:'viewport',mode:'desktop'});
 assert.equal(desktop.width,1280);assert.equal(desktop.mobileWebPreview,false);
 assert.equal(desktop.physicalAndroidScreen,false);
 assert.equal(calls[2].params.mobile,false);
 assert.equal(calls[3].params.enabled,false);
 await assert.rejects(()=>browserAction(env,{sessionId,action:'viewport',mode:'android_screen'}),/unsupported_browser_viewport/);
});
test('Chrome viewport switch is behind owner authorization and separately approved browser control',()=>{
 const worker=fs.readFileSync('workers/bubbles-cloud-browser/worker.mjs','utf8');
 const tool=fs.readFileSync('workers/bubbles-tools/browser.mjs','utf8');
 const ui=fs.readFileSync('bubbles-cloud-browser.mjs','utf8');
 assert.match(worker,/\['read','navigate','click','type','viewport'\]/);
 assert.match(tool,/\['navigate','read','click','type','viewport'\]/);
 assert.match(worker,/consentStore\(env\)\.status\(\)/);
 assert.match(ui,/call\('viewport',\{mode\}\)/);
 assert.match(ui,/Open Cloudflare/);
 assert.match(ui,/physical Android screen/);
});
test('Browser automation never bypasses owner authentication or opens wallet and Github tokens',()=>{
 const gateway=fs.readFileSync('workers/bubbles-tools/browser.mjs','utf8');
 const worker=fs.readFileSync('workers/bubbles-cloud-browser/worker.mjs','utf8');
 const ai=fs.readFileSync('bubbles-ai.js','utf8');
 assert.match(gateway,/ownerAllowed\(request,env\)/);
 assert.match(worker,/browserTool\(request,env\)/);
 assert.match(ai,/browserConversation\(spoken/);
 assert.doesNotMatch(gateway,/bcb_|durable_object_namespace|GRANTS\.get/);
});
test('website and Android chats dispatch named browser commands before model-only advice',()=>{
 const chat=fs.readFileSync('bubbles-ai.js','utf8');
 assert.match(chat,/\(\?:cloudflare\|gemini\|claude\|starquest\|bubbles/);
 assert.match(chat,/browserConversation\(spoken/);
});
