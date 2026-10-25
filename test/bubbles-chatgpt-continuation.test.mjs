import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {chatgptInspectExpression,chatgptPrepareExpression,chatgptSendExpression,scopedChatGPTExpression} from '../workers/bubbles-tools/chatgpt-dom.mjs';
import {browserSpeechIntent} from '../bubbles-cloud-browser.mjs';
import {chooseContinuation,classifyReply,snapshotKey} from '../bubbles-chatgpt-continuity.mjs';

const ID='12345678-1234-4123-8123-123456789abc';
function page({origin='https://chatgpt.com',pathname='/c/'+ID,role='assistant',lastText='Work is pending verification.',draft='',generating=false,textarea=false,sidebarPresent=true}={}){
 let clicks=0;
 const editor={dataset:{},...(textarea?{value:draft}:{innerText:draft}),getClientRects:()=>[{}],focus(){document.activeElement=editor},contains:()=>false};
 const message={getAttribute:()=>role,innerText:lastText};
 const messages=[message];
 const anchor={href:'https://chatgpt.com/c/'+ID,innerText:'QuantaPhi repair',getClientRects:()=>[{}],getAttribute:()=>null};
 const send={disabled:false,getClientRects:()=>[{}],getAttribute:()=>null,click(){clicks++}};
 const document={title:'ChatGPT conversation',activeElement:null,documentElement:{dataset:{}},
  querySelectorAll(selector){
   if(selector==='[data-message-author-role]')return messages;
   if(selector.includes('#prompt-textarea'))return [editor];
   if(selector==='a[href]')return [anchor];
   if(selector.startsWith('button[data-testid="send-button"]'))return [send];
   return [];
  },
  querySelector(selector){
   if(selector.startsWith('#ds-sidebar'))return sidebarPresent?{querySelectorAll:()=>[anchor]}:null;
   return generating&&selector.startsWith('button[data-testid="stop-button"]')?{}:null;
  }
 };
 const location={origin,pathname};
 return {run:expression=>vm.runInNewContext(expression,{document,location,URL}),get clicks(){return clicks},editor,
  location,messages};
}
test('owner can inspect visible signed-in conversations without fetching private APIs',()=>{
 const browser=page();
 const data=browser.run(chatgptInspectExpression);
 assert.equal(data.authenticatedConversation,true);
 assert.equal(data.needsAttention,true);
 assert.equal(data.messageCount,1);
 assert.equal(data.recentNudgeCount,0);
 assert.deepEqual(JSON.parse(JSON.stringify(data.conversations)),[{url:'https://chatgpt.com/c/'+ID,title:'QuantaPhi repair'}]);
 assert.equal(data.latestAssistantText,'Work is pending verification.');
});
test('transcript conversation links cannot replace a missing history sidebar',()=>{
 const data=page({sidebarPresent:false}).run(chatgptInspectExpression);
 assert.equal(data.conversations.length,0);
});
test('requires exact ChatGPT conversation, no active generation, and no unsent owner draft',()=>{
 assert.equal(page({origin:'https://example.org'}).run(chatgptPrepareExpression).error,'not_a_chatgpt_conversation');
 assert.equal(page({generating:true}).run(chatgptPrepareExpression).error,'chatgpt_still_generating');
 assert.equal(page({draft:'Owner typing already'}).run(chatgptPrepareExpression).error,'owner_draft_present');
 assert.equal(page({role:'user',lastText:'*'}).run(chatgptPrepareExpression).error,'continuation_already_sent');
});
test('ChatGPT send requires focused composer; does not click generic submit buttons',()=>{
 const browser=page();
 assert.equal(browser.run(chatgptSendExpression).error,'composer_not_focused');
 assert.equal(browser.clicks,0);
 assert.equal(browser.run(chatgptPrepareExpression).ready,true);
 browser.editor.innerText='*';
 assert.equal(browser.run(chatgptSendExpression).sendDispatched,true);
 assert.equal(browser.clicks,1);
});
test('CDP only sends a continuation after guarded inspection and verifies owner-visible message',()=>{
 const cdp=fs.readFileSync('workers/bubbles-tools/browser-cdp.mjs','utf8');
 const tool=fs.readFileSync('workers/bubbles-tools/browser.mjs','utf8');
 const worker=fs.readFileSync('workers/bubbles-cloud-browser/worker.mjs','utf8');
 const ui=fs.readFileSync('bubbles-cloud-browser.mjs','utf8');
 assert.match(cdp,/Input\.insertText/);
 assert.match(cdp,/submissionVerified:true/);
 assert.match(cdp,/import \{chooseContinuation\} from '\.\.\/\.\.\/bubbles-chatgpt-continuity\.mjs'/);
 assert.match(cdp,/chooseContinuation\(current,\{allowRevisit:true\}\)/);
 assert.match(cdp,/continuation_not_eligible/);
 assert.match(tool,/chatgpt_resume/);
 assert.match(worker,/chatgpt_resume/);
 assert.match(ui,/Continue latest 8 ChatGPT conversations/);
 assert.match(ui,/Stop conversation follow-ups/);
 assert.match(ui,/bridgeCall\('continuity'/);
 assert.match(ui,/chatgpt_signin/);
 assert.match(ui,/new ChatGPT replies observed/);
 assert.match(ui,/continues when Bubbles closes/);
 assert.doesNotMatch(ui,/localStorage\.setItem\(['"]chatgpt/);
});

test('natural Bubbles command triggers continuation without per-chat clicks',()=>{
 const intent=browserSpeechIntent('Bubbles, continue unfinished ChatGPT conversations');
 assert.equal(intent.action,'continue_chatgpt');
 assert.equal(intent.show,true);
 assert.equal(browserSpeechIntent('Finish my ChatGPT conversations').action,'continue_chatgpt');
});

test('only explicit unfinished assistant work qualifies for automatic continuation',()=>{
 const base={authenticatedConversation:true,conversationUrl:'https://chatgpt.com/c/'+ID,
  latestRole:'assistant',editorReady:true,generating:false,draftPresent:false,
  alreadyNudged:false,recentNudgeCount:0,messageCount:8,latestAssistantText:'The deployment is pending verification.'};
 assert.equal(chooseContinuation(base).state,'ready');
 assert.equal(chooseContinuation({...base,latestAssistantText:'Everything is now ready.'}).state,'review');
 assert.equal(chooseContinuation({...base,latestAssistantText:'Please provide your account authorization.'}).state,'needs_details');
 assert.equal(chooseContinuation({...base,latestRole:'user',latestUserText:'Fix the card'}).state,'waiting');
 assert.equal(chooseContinuation({...base,recentNudgeCount:1}).reason,'recent_continuation_already_sent');
 assert.equal(chooseContinuation(base,{sentKeys:new Set([snapshotKey(base)])}).reason,'already_continued_in_this_session');
 assert.equal(chooseContinuation({...base,conversationUrl:'https://example.net/c/'+ID}).state,'blocked');
});
test('new replies require a different verified assistant turn, not stale page text',()=>{
 const base={authenticatedConversation:true,conversationUrl:'https://chatgpt.com/c/'+ID,
  latestRole:'assistant',messageCount:8,latestAssistantText:'Pending verification'};
 assert.equal(classifyReply({...base},base).state,'unverified');
 assert.equal(classifyReply({...base,messageCount:9,latestAssistantText:'Done'},base).state,'unverified');
 assert.equal(classifyReply({...base,messageCount:10,latestAssistantText:'Done'},base).state,'answered_unverified');
 assert.equal(classifyReply({...base,messageCount:10,latestAssistantText:'Still pending review'},base).state,'awaiting_evidence');
 assert.equal(classifyReply({...base,messageCount:10,latestAssistantText:'Please send your files'},base).state,'needs_details');
 assert.equal(classifyReply({...base,messageCount:10,conversationUrl:'https://chatgpt.com/c/other'},base).state,'unverified');
});

test('Bubbles single-star command delegates to signed-in ChatGPT, never to its own code runner',()=>{
 const source=fs.readFileSync('bubbles-ai.js','utf8');
 const send=source.slice(source.indexOf('async function sendMessage('));
 const begin=send.indexOf("if(spoken==='*')");
 assert.notEqual(begin,-1,'literal star must have a dedicated route');
 const end=send.indexOf('return;',begin);
 const branch=send.slice(begin,end+7);
 assert.match(branch,/browserConversation\('continue unfinished ChatGPT conversations'/);
 assert.match(branch,/ownerHeaders:verifiedOwnerHeaders/);
 assert.doesNotMatch(branch,/continueSavedWork|\/work\/run-next|directGithubOperation|submitRepositoryWork/);
 assert.match(branch,/No message or build was confirmed/);
});


test('mobile textarea preserves an owner draft and requires a literal star in its value',()=>{
 const browser=page({textarea:true,draft:'Keep my draft'});
 assert.equal(browser.run(chatgptInspectExpression).draftPresent,true);
 assert.equal(browser.run(chatgptPrepareExpression).error,'owner_draft_present');
 browser.editor.value='';
 assert.equal(browser.run(chatgptPrepareExpression).ready,true);
 browser.editor.value='another message';
 assert.equal(browser.run(chatgptSendExpression).error,'literal_star_only');
 browser.editor.value='*';
 assert.equal(browser.run(chatgptSendExpression).sendDispatched,true);
});

test('final synchronous Send rejects navigation, a changed turn, or a replaced composer claim',()=>{
 const scope={conversationUrl:'https://chatgpt.com/c/'+ID,messageCount:1,claim:'fixed-fixture-claim'};
 for(const change of ['navigation','turn','claim']){
  const browser=page();
  assert.equal(browser.run(scopedChatGPTExpression(chatgptPrepareExpression,scope)).ready,true);
  browser.editor.innerText='*';
  if(change==='navigation')browser.location.pathname='/c/another-valid-conversation';
  if(change==='turn')browser.messages.push({getAttribute:()=> 'assistant',innerText:'Another turn'});
  if(change==='claim')browser.editor.dataset.bubblesContinuationClaim='another-claim';
  assert.equal(browser.run(scopedChatGPTExpression(chatgptSendExpression,scope)).ok,false);
  assert.equal(browser.clicks,0);
 }
});
