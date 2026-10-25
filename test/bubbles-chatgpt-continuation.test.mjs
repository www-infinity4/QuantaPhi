import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {chatgptInspectExpression,chatgptPrepareExpression,chatgptSendExpression} from '../workers/bubbles-tools/chatgpt-dom.mjs';
import {browserSpeechIntent} from '../bubbles-cloud-browser.mjs';

const ID='12345678-1234-4123-8123-123456789abc';
function page({origin='https://chatgpt.com',pathname='/c/'+ID,role='assistant',lastText='Work is pending verification.',draft='',generating=false}={}){
 let clicks=0;
 const editor={innerText:draft,getClientRects:()=>[{}],focus(){document.activeElement=editor},contains:()=>false};
 const message={getAttribute:()=>role,innerText:lastText};
 const anchor={href:'https://chatgpt.com/c/'+ID,innerText:'QuantaPhi repair',getClientRects:()=>[{}],getAttribute:()=>null};
 const send={disabled:false,getClientRects:()=>[{}],getAttribute:()=>null,click(){clicks++}};
 const document={title:'ChatGPT conversation',activeElement:null,
  querySelectorAll(selector){
   if(selector==='[data-message-author-role]')return [message];
   if(selector.includes('#prompt-textarea'))return [editor];
   if(selector==='a[href]')return [anchor];
   if(selector.startsWith('button[data-testid="send-button"]'))return [send];
   return [];
  },
  querySelector(selector){return generating&&selector.startsWith('button[data-testid="stop-button"]')?{}:null;}
 };
 const location={origin,pathname};
 return {run:expression=>vm.runInNewContext(expression,{document,location,URL}),get clicks(){return clicks},editor};
}
test('owner can inspect visible signed-in conversations without fetching private APIs',()=>{
 const browser=page();
 const data=browser.run(chatgptInspectExpression);
 assert.equal(data.authenticatedConversation,true);
 assert.equal(data.needsAttention,true);
 assert.deepEqual(JSON.parse(JSON.stringify(data.conversations)),[{url:'https://chatgpt.com/c/'+ID,title:'QuantaPhi repair'}]);
 assert.equal(data.latestAssistantText,'Work is pending verification.');
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
 assert.match(tool,/chatgpt_resume/);
 assert.match(worker,/chatgpt_resume/);
 assert.match(ui,/Continue unfinished ChatGPT conversations/);
 assert.match(ui,/Stop conversation follow-ups/);
 assert.match(ui,/needsAttention/);
 assert.match(ui,/slice\(0,20\)/);
 assert.doesNotMatch(ui,/localStorage\.setItem\(['"]chatgpt/);
});

test('natural Bubbles command triggers continuation without per-chat clicks',()=>{
 const intent=browserSpeechIntent('Bubbles, continue unfinished ChatGPT conversations');
 assert.equal(intent.action,'continue_chatgpt');
 assert.equal(intent.show,true);
 assert.equal(browserSpeechIntent('Finish my ChatGPT conversations').action,'continue_chatgpt');
});
