'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ai=fs.readFileSync('bubbles-ai.js','utf8');
const bubblePage=fs.readFileSync('bubbles.html','utf8');
const embed=fs.readFileSync('bubbles-embed.js','utf8');
const cardone=fs.readFileSync('cardone-capital.html','utf8');

test('embed mounts a real touch-scroll thread with Chat history above messages',()=>{
 assert.match(ai,/const chatScroll=create\('div','ba-thread'\)/);
 assert.match(ai,/if\(embedded\)\{\s*\/\/ Chats and messages share a dedicated touch-scrolling viewport\.[\s\S]*?panel\.insertBefore\(chatScroll,conversation\);\s*chatScroll\.append\(conversation\)/);
 assert.match(ai,/chatScroll\.insertBefore\(chatsPanel,conversation\)/);
 assert.doesNotMatch(ai,/chatScroll\.insertBefore\(chatsPanel,chatScroll\)/);
 assert.match(ai,/launcher\.addEventListener\('click'/);
 assert.match(ai,/window\.parent\.postMessage\(\{type:'quantaphi:bubbles:size'/);
});

test('named card chat keeps locally scoped history, resumes, and never auto-clears on reopen',()=>{
 assert.match(ai,/let keepChat=data\(KEEP_HISTORY,true\)===true/);
 assert.match(ai,/const embeddedResume=embedded&&keepChat/);
 assert.match(ai,/const THREAD_INDEX='quantaphi:bubbles:threads:v2'/);
 assert.match(ai,/if\(reopening&&!nativeOverlay&&!embedded\)void startConversation/);
 assert.match(ai,/clearChat\.textContent=embedded\?'New card chat'/);
 assert.match(ai,/chatScroll\.insertBefore\(chatsPanel,conversation\)/);
});

test('recognized speech cannot erase an in-progress typed message',()=>{
 assert.match(ai,/const clearSentComposer=\(\)=>\{if\(!fromVoice&&input\.value\.trim\(\)===spoken\)input\.value='';\}/);
 assert.match(ai,/display\(spoken,'you'\);clearSentComposer\(\)/);
 assert.match(ai,/requireWakeEveryTurn:embedded/);
 assert.match(ai,/if\(embedded\)\{toggle\(!showing\);return\}/);
});

test('Cardone iframe is the existing specialist assistant with versioned scripts',()=>{
 assert.match(cardone,/src="\/bubbles-embed\.js"/);
 assert.match(cardone,/data-bubble-id="cardone-westshore-research"/);
 assert.match(cardone,/data-bubble-role="specialist"/);
 assert.match(embed,/iframe\.src=ORIGIN\+'\/bubbles\.html\?'/);
 assert.match(embed,/quantaphi:bubbles:size/);
 assert.match(bubblePage,/bubbles-voice-gate\.js\?v=20261023-cardone-wake1/);
 assert.match(bubblePage,/bubbles-ai\.js\?v=20261023-cardone-history1/);
});

test('public specialist ignores background transcripts even within a conversation window',()=>{
 const sandbox={};sandbox.window=sandbox;
 vm.runInNewContext(fs.readFileSync('bubbles-voice-gate.js','utf8'),sandbox);
 const gate=sandbox.BubblesVoiceGate.create({name:'Real Estate Bubbles',followupMs:30000,requireWakeName:true,requireWakeEveryTurn:true});
 assert.equal(gate.accept('the television says invest now',1000).type,'ignore');
 assert.equal(gate.accept('Bubbles explain the risk',1200).type,'message');
 assert.equal(gate.accept('buy those shares immediately',1250).type,'ignore');
 assert.equal(gate.accept('Real Estate Bubbles what fees are involved',1400).type,'message');
 assert.equal(gate.accept('Bubbles stop listening',1500).type,'mute');
 assert.equal(gate.accept('ignore this voice from across the room',1550).type,'ignore');
 assert.equal(gate.accept('Bubbles what about the disclosures',1800).type,'message');
});
