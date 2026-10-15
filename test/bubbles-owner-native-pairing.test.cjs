'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const owner=fs.readFileSync('robot-brain-owner.js','utf8');
const site=fs.readFileSync('bubbles-ai.js','utf8');
const nativeCss=fs.readFileSync('bubbles-native-chat.css','utf8');
const native=fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BubblesService.java','utf8');

test('native panel connects owner through normal chat, without separate pairing UI',()=>{
 assert.match(site,/consumeOwnerCodeFromChat/);
 assert.match(site,/const result=await window.QuantaBrainOwner\?\.connectWithCode\?\.\(payload\)/);
 assert.match(site,/await connectOwner\(\)/);
 assert.doesNotMatch(site,/nativeOwnerRow|nativeOwnerInput|nativeOwnerPaste|nativeOwnerButton/);
 assert.match(nativeCss,/html\.bubbles-native-overlay \.bubbles-page/);
 assert.match(native,/A pasted pairing secret is NOT a conversation/);
 assert.match(native,/oracleWindow == null \|\| !oracleWindow\.sendTyped\(text\)/);
});
test('owner code is validated server-side and saved only after verification',()=>{
 const method=owner.slice(owner.indexOf('window.QuantaBrainOwner.connectWithCode='),owner.indexOf('function form(message)'));
 assert.match(method,/const result=await verify\(code\)/);
 assert.match(method,/if\(result.state!=='verified'\)return/);
 assert.match(method,/await saveToken\(credential\)/);
 assert.match(method,/unlocked\(result.headers,credential,'key'\)/);
});
test('website-issued one-time pairing code is not spoken or inserted into memory',()=>{
 const from=site.indexOf("if(!embedded&&(/^(?:(?:please|bubbles)[\\s,:]+)*(?:pair|link|sync|connect)");
 const to=site.indexOf("const noteResult=noteCommand(spoken)",from);
 assert.ok(from>0&&to>from);
 const phrase=site.slice(from,to);
 assert.match(phrase,/pairingCode.value=result.code/);
 assert.match(phrase,/pairingCard.hidden=false/);
 assert.match(phrase,/120000/);
 assert.doesNotMatch(phrase,/resultText[^\n]*result.code/);
 assert.doesNotMatch(phrase,/messages.push\([^\n]*result.code/);
});
test('native read-aloud queues phone voice rather than browser voice',()=>{
 assert.match(site,/if\(nativeOverlay\)nativeSpeechReply=String\(text\)\.slice\(0,2200\)/);
 assert.match(site,/else speakText\(text\)/);
});