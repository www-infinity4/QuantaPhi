'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=fs.readFileSync('bubbles-ai.js','utf8');

test('reasoning-service failures become persisted assistant replies for the GPT bridge',async()=>{
 const start=source.indexOf("}catch(error){\n  failedTurn=true;\n  const message=workEvidence||(");
 const end=source.indexOf('\n finally{',start);
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


test('five-day GPT bridge treats a displayed failed chat response as failed, not completed',async()=>{
 const start=source.indexOf("window.addEventListener('bubbles:chatgpt-bridge'");
 const end=source.indexOf("if(!embedded)tools.append(repositoryPicker)",start);
 assert.ok(start>0&&end>start);
 const listener=source.slice(start,end);
 const check=async assistant=>{
  const messages=[];let handler;
  const context={window:{addEventListener:(event,fn)=>{if(event==='bubbles:chatgpt-bridge')handler=fn}},
   embedded:false,busy:false,turnPending:false,messages,
   sendMessage:async()=>{messages.push(assistant)},Promise,String};
  vm.runInNewContext(listener,context);
  return new Promise(resolve=>handler({detail:{text:'Check Bubbles tool work',respond:resolve}}));
 };
 const failure=await check({role:'assistant',text:'I could not complete the response: network down.',failed:true});
 assert.equal(failure.ok,false);
 assert.equal(failure.error,'bubbles_chat_request_failed');
 const success=await check({role:'assistant',text:'Verified weather results',failed:false});
 assert.equal(success.ok,true);
 assert.equal(success.reply,'Verified weather results');
});

test('reasoning and preflight failures are tagged as failed assistant replies rather than successful GPT bridge work',()=>{
 const start=source.indexOf("}catch(error){\n  failedTurn=true;\n  const message=workEvidence||(");
 const end=source.indexOf('\n finally{',start);
 const reasoning=source.slice(start,end);
 const preflight=source.slice(source.indexOf('Bubbles could not finish the chat turn'),source.indexOf("window.addEventListener('bubbles:chatgpt-ready'"));
 assert.match(reasoning,/messages\.push\(\{role:'assistant',text:message,failed:true\}\)/);
 assert.match(preflight,/messages\.push\(\{role:'assistant',text:message,failed:true\}\)/);
});


test('invalid calculation inputs and partial research cannot be reported as completed GPT work',()=>{
 const main=source.slice(source.indexOf('const finalAnswer=describeBubblesToolOutcome'),source.indexOf('if(json.receipt?.tool===',source.indexOf('const finalAnswer=describeBubblesToolOutcome')+350));
 assert.match(main,/\\['failed','blocked','invalid_input'\\]/);
 assert.match(main,/json\.answerStatus==='partial'/);
 assert.match(main,/if\(receiptFailed\)failedTurn=true/);
});

test('failed memory saves and failed public source reads carry explicit unsuccessful reply metadata',()=>{
 const memory=source.slice(source.indexOf('if(rememberMatch){'),source.indexOf('const nativeDirective=',source.indexOf('if(rememberMatch){')));
 const reader=source.slice(source.indexOf('if(!embedded&&(sourceReadRequested||publicPageReadRequested))'),source.indexOf('// Explicit code discovery is a read-only tool call',source.indexOf('if(!embedded&&(sourceReadRequested||publicPageReadRequested))'));
 assert.match(memory,/memorySaved/);
 assert.match(memory,/failed:true/);
 assert.match(reader,/readVerified\?\{\}:\{failed:true\}/);
});
