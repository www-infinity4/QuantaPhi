import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {chatgptLoginExpression} from '../workers/bubbles-tools/chatgpt-login.mjs';
import {browserAction} from '../workers/bubbles-tools/browser-cdp.mjs';

const expected='owner@example.com';
function fixture({origin='https://accounts.google.com',accounts=[],password=false,google=false,emailInput=false,menu='',profile=false}={}){
 const clicks=[];
 const el=(label,attrs={})=>({innerText:label,getClientRects:()=>[{}],getAttribute:k=>attrs[k]||null,
  click:()=>clicks.push(label),dispatchEvent(){}});
 const input=el('email');input.value='';
 function HTMLInputElement(){}
 Object.defineProperty(HTMLInputElement.prototype,'value',{set(v){input.value=v;}});
 const next=el('Next'),provider=el('Continue with Google'),profileButton=el('Profile');
 const document={
  querySelectorAll:selector=>selector.startsWith('button,')?(google?[provider]:emailInput?[next]:[]):
   selector.includes('input[type="password"]')?(password?[el('password')]:[]):
   selector==='[data-identifier],[data-email]'?accounts.map(email=>el(email,{'data-identifier':email})):
   selector==='input[type="email"]'?(emailInput?[input]:[]):
   selector.startsWith('[role="menu"]')?(menu?[el(menu)]:[]):[],
  querySelector:selector=>selector.startsWith('[data-testid="accounts-profile-button"]')&&profile?profileButton:null
 };
 return {run:()=>vm.runInNewContext(chatgptLoginExpression(expected),{document,location:{origin},HTMLInputElement,Event:class{}}),clicks,input};
}

test('chooses only the configured Google account among multiple visible accounts',()=>{
 const f=fixture({accounts:['other@example.com',expected]});assert.equal(f.run().state,'progress');
 assert.deepEqual(f.clicks,[expected]);
 const wrong=fixture({accounts:['other@example.com']});assert.equal(wrong.run().state,'needs_owner');
 assert.equal(wrong.clicks.length,0);
});
test('email entry and Google sign-in are bounded to official sign-in origins',()=>{
 const f=fixture({emailInput:true});assert.equal(f.run().state,'progress');assert.equal(f.input.value,expected);
 assert.deepEqual(f.clicks,['Next']);
 const provider=fixture({origin:'https://auth.openai.com',google:true});provider.run();
 assert.deepEqual(provider.clicks,['Continue with Google']);
 const bad=fixture({origin:'https://example.net',google:true});assert.equal(bad.run().error,'unexpected_signin_origin');
 assert.equal(bad.clicks.length,0);
});
test('password and verification fields stop automatic sign-in without touching credentials',()=>{
 const f=fixture({password:true,accounts:[expected],emailInput:true});
 assert.equal(f.run().state,'needs_owner');assert.equal(f.input.value,'');assert.equal(f.clicks.length,0);
});
test('an already signed-in ChatGPT account must expose the exact expected email',()=>{
 const f=fixture({origin:'https://chatgpt.com',profile:true,menu:'Owner\n'+expected+'\nSettings'});
 assert.equal(f.run().accountVerified,true);
 const wrong=fixture({origin:'https://chatgpt.com',profile:true,menu:'other@example.com'});
 assert.equal(wrong.run().error,'different_chatgpt_account');assert.equal(wrong.clicks.length,0);
 const unknown=fixture({origin:'https://chatgpt.com'});assert.equal(unknown.run().state,'needs_owner');
});

test('account configuration is available only through the verified owner endpoint',async()=>{
 const source=fs.readFileSync('workers/bubbles-cloud-browser/worker.mjs','utf8')
  .replace(/^export \{BrowserConsentStore\}.*$/m,'')
  .replace(/from '(\.[^']+)'/g,(_,path)=>'from '+JSON.stringify(new URL('../workers/bubbles-cloud-browser/'+path,import.meta.url).href));
 const worker=(await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'))).default;
 const email='configured@example.com';
 const env={CHATGPT_LOGIN_EMAIL:email,BRAIN:{fetch:async()=>new Response('ok')},
  CONSENT:{idFromName:()=>'',get:()=>({})},BRIDGE_DB:{}};
 const request=(auth,origin='https://quantaphi.org')=>new Request('https://browser.example/v1/browser/chatgpt/account',{
  method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(auth?{Authorization:'Bearer rb_'+'a'.repeat(64)}:{})},body:'{}'});
 assert.equal((await worker.fetch(request(false),env,{})).status,403);
 assert.equal((await worker.fetch(request(true,'https://example.net'),env,{})).status,403);
 const owner=await worker.fetch(request(true),env,{});
 assert.equal(owner.status,200);assert.equal((await owner.json()).email,email);
 const health=await worker.fetch(new Request('https://browser.example/health'),env,{});
 assert.equal(JSON.stringify(await health.json()).includes(email),false);
});

function cdpFixture({currentCount=8,assistantText='Pending verification',observedUrl='https://chatgpt.com/c/12345678-1234-4123-8123-123456789abc'}={}){
 const calls=[];let listener,reads=0;
 const snapshot={authenticatedConversation:true,conversationUrl:observedUrl,latestRole:'assistant',messageCount:currentCount,
  latestAssistantText:assistantText,editorReady:true,alreadyNudged:false,recentNudgeCount:0,
  draftPresent:false,generating:false};
 const socket={accept(){},close(){},addEventListener(type,fn){if(type==='message')listener=fn;},removeEventListener(){},
  send(raw){
   const call=JSON.parse(raw);calls.push(call);let value={ok:true};
   if(call.params.expression?.includes('recentNudgeCount:')){
    value=++reads===1?snapshot:{...snapshot,messageCount:10,latestUserText:'*',latestUserIndex:8};
   }
   queueMicrotask(()=>listener?.({data:JSON.stringify({id:call.id,result:{result:{value}}})}));
  }};
 return {calls,env:{BROWSER:{devtools:{listTargets:async()=>[{id:'TAB',type:'page'}]},
  connectSession:async()=>({webSocket:{fetch:async()=>({webSocket:socket})}})}}};
}
test('actual CDP send rejects a changed turn and can verify a star followed by a fast assistant reply',async()=>{
 const conversationUrl='https://chatgpt.com/c/12345678-1234-4123-8123-123456789abc';
 const args={sessionId:'SESSION',action:'chatgpt_resume',conversationUrl,text:'*',messageCount:8};
 const changed=cdpFixture({currentCount:10});
 assert.equal((await browserAction(changed.env,args)).error,'conversation_turn_changed');
 assert.equal(changed.calls.some(c=>c.method==='Input.insertText'),false);
 const f=cdpFixture();const receipt=await browserAction(f.env,args);
 assert.equal(receipt.submissionVerified,true);assert.equal(receipt.answerVerified,false);
 assert.deepEqual(f.calls.find(c=>c.method==='Input.insertText').params,{text:'*'});
});

test('actual CDP route rejects finished or owner-blocked chats before inserting a star',async()=>{
 const conversationUrl='https://chatgpt.com/c/12345678-1234-4123-8123-123456789abc';
 const args={sessionId:'SESSION',action:'chatgpt_resume',conversationUrl,text:'*',messageCount:8};
 for(const assistantText of ['Everything is complete.','Please provide your account approval.']){
  const f=cdpFixture({assistantText});
  const receipt=await browserAction(f.env,args);
  assert.equal(receipt.error,'continuation_not_eligible');
  assert.equal(f.calls.some(c=>c.method==='Input.insertText'),false);
 }
});
