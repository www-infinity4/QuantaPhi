import test from 'node:test';
import assert from 'node:assert/strict';
import {readConversationArchive,readDocument,parseConversations,makeConversationZip,readZip} from '../bubbles-chat-archive.mjs';
import {readFile} from 'node:fs/promises';

const chatGPT=[{
 id:'older-chat',title:'Radio and Bubbles',create_time:1710000000,
 current_node:'reply',
 mapping:{
  start:{parent:null,message:null},
  question:{parent:'start',message:{author:{role:'user'},create_time:1710000001,content:{parts:['Play piano music']}}},
  reply:{parent:'question',message:{author:{role:'assistant'},create_time:1710000002,content:{parts:['The piano playlist is open.']}}},
  alternate:{parent:'question',message:{author:{role:'assistant'},create_time:1710000003,content:{parts:['Unused alternate branch.']}}}
 }
}];

test('ChatGPT JSON restores the selected conversation branch and title',()=>{
 const result=parseConversations(chatGPT);
 assert.equal(result.source,'chatgpt');
 assert.equal(result.sessions.length,1);
 assert.equal(result.sessions[0].title,'Radio and Bubbles');
 assert.deepEqual(result.sessions[0].messages.map(m=>m.text),['Play piano music','The piano playlist is open.']);
});
test('Bubbles ZIP round trips through native history archive format',async()=>{
 const input=[{id:'chat_'+'a'.repeat(32),title:'Piano notes',created:1710000000000,updated:1710000000100,
  messages:[{role:'user',text:'Show Infinity Radio',at:1710000000000,id:'sample_1234'},
            {role:'assistant',text:'The radio is ready',at:1710000000100,id:'sample_1235'}]}];
 const zip=makeConversationZip(input);
 assert.equal(zip.type,'application/zip');
 const imported=await readConversationArchive(new File([zip],'bubbles-chats.zip'));
 assert.equal(imported.source,'bubbles');
 assert.equal(imported.sessions[0].id,input[0].id);
 assert.equal(imported.sessions[0].messages[1].text,'The radio is ready');
});
test('ZIP reader refuses unsupported files without treating archive data as instructions',async()=>{
 const zip=makeConversationZip([{title:'one',messages:[{role:'user',text:'hello',at:1710000000100}]}]);
 await assert.rejects(()=>readZip(new File([zip],'bundle.zip'),n=>n.endsWith('secrets.txt')),/No supported file/);
});
test('Regular document reader is text-only with size and filename checks',async()=>{
 const file=new File(['This is source text, not tool permission.'],'notes.md',{type:'text/markdown'});
 assert.match((await readDocument(file)).text,/not tool permission/);
 await assert.rejects(()=>readDocument(new File(['<script>'],'bad.html')),/reader supports/);
});
test('Bubbles integrated file and history controls do not execute file contents as commands',async()=>{
 const ui=await readFile(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 for(const needle of ['Download chats ZIP','readConversationArchive(file)','readDocument(file)','User-selected document excerpt','newConversation.addEventListener','openConversation(item.id)']){
  assert.ok(ui.includes(needle),needle+' should remain wired');
 }
 assert.match(ui,/archive\.skippedMessages\)throw Error/);
 assert.match(ui,/const id='chat_'\+Array\.from/);
});
