'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('bubbles-ai.js','utf8');
const html=fs.readFileSync('bubbles.html','utf8');

test('Android Bubbles uses the main message box for pairing, not a hidden code field',()=>{
 assert.match(js,/input\.placeholder='Message Bubbles or paste owner code/);
 assert.match(js,/panel\.insertBefore\(tools,composer\)/);
 assert.doesNotMatch(js,/nativeOwnerRow=create/);
 assert.doesNotMatch(js,/nativeOwnerPaste=create/);
 assert.match(js,/window\.QuantaBrainOwner\?\.connectWithCode\?\.\(code\)/);
 assert.match(js,/if\(nativeOverlay&&!fromVoice&&\/\^\[a-f0-9\]\{64\}\$\/i\.test\(spoken\)\)/);
 assert.match(html,/touch-action:pan-y!important/);
});

test('Owner pairing secrets bypass AI prompts, voice output and chat history',()=>{
 const start=js.indexOf('async function redeemNativeOwnerCode(code)');
 const end=js.indexOf('async function sendMessage(',start);
 assert.ok(start>=0&&end>start);
 const block=js.slice(start,end);
 assert.match(block,/input\.value=''/);
 assert.match(block,/await window\.QuantaBrainOwner\?\.connectWithCode\?\.\(code\)/);
 assert.doesNotMatch(block,/messages\.push|sendNativeText|sendNativeSpeech|nativeSpeechReply|speakText|localStorage/);
 assert.match(js,/await redeemNativeOwnerCode\(spoken\);\s*return;/);
});
