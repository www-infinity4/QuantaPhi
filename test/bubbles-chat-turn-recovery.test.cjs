'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('bubbles-ai.js','utf8');

test('reasoning-service failures become persisted assistant replies for the GPT bridge',async()=>{
 const start=source.indexOf("}catch(error){\n  failedTurn=true;\n  const message=workEvidence||(");
 const end=source.indexOf('\n  finally{',start);
 assert.ok(start>0&&end>start,'main reasoning catch remains inspectable');
 const handler=source.slice(start,end);
 const replies=[],events=[];
 const context={workEvidence:'',cardoneResearch:false,request:'Hi',nativeOverlay:false,nativeSpeechPending:false,fromVoice:false,config:{voice:false},status:{},
  display:(message,kind)=>events.push({message,kind}),messages:replies,
  persistChat:()=>{},String,Error};
 vm.createContext(context);
 await vm.runInContext("(async()=>{try{throw Error('reasoning offline')"+handler+"})()",context);
 assert.ok(replies.some(x=>x.role==='assistant'&&/could not complete/i.test(x.text)));
 assert.equal(events.length,1);
});

test('a failure before the reasoning request never strands Bubbles in busy mode',()=>{
 const start=source.indexOf('async function sendMessage(');
 const end=source.indexOf("window.addEventListener('bubbles:chatgpt-ready'",start);
 const send=source.slice(start,end);
 assert.match(send,/catch\(error\)\s*\{[\s\S]*?Bubbles could not finish the chat turn/);
 assert.match(send,/finally\s*\{[\s\S]*?busy=false;send\.disabled=false;turnPending=false/);
 assert.match(send,/type:'turn_finished',failed:failedTurn/);
});

test('the verified five-day ChatGPT bridge still uses replies from the current sendMessage turn',()=>{
 const start=source.indexOf("window.addEventListener('bubbles:chatgpt-bridge'");
 const end=source.indexOf("if(!embedded)tools.append(repositoryPicker)",start);
 const body=source.slice(start,end);
 assert.match(body,/Promise\.resolve\(sendMessage\(text,false\)\)/);
 assert.match(body,/messages\.slice\(before\)\.filter\(x=>x\.role==='assistant'\)/);
 assert.match(body,/bubbles_did_not_return_a_confirmed_answer/);
 assert.doesNotMatch(body,/refresh.*token|write.*wallet|checkout/i);
});
