'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const owner=fs.readFileSync('robot-brain-owner.js','utf8');
const site=fs.readFileSync('bubbles-ai.js','utf8');
const html=fs.readFileSync('bubbles.html','utf8');
const css=fs.readFileSync('bubbles-ai.css','utf8');

test('native panel has an owner pairing field, not an invisible dashboard gate',()=>{
 assert.match(site,/nativeOwnerRow=create\('form','ba-native-owner'\)/);
 assert.match(site,/nativeOwnerInput.type='password'/);
 assert.match(site,/nativeOwnerInput.value=''/);
 assert.match(site,/window.QuantaBrainOwner\?\.connectWithCode\?\.\(code\)/);
 assert.match(site,/await connectOwner\(\)/);
 assert.match(site,/if\(nativeOwnerRow\)nativeOwnerRow.hidden=true/);
 assert.match(html,/html\.bubbles-native-overlay #robotBrainOwner\{display:none!important\}/);
 assert.match(css,/\.ba-native-owner\[hidden\]\{display:none!important\}/);
});
test('the owner code is validated server-side and saved only after verified',()=>{
 const method=owner.slice(owner.indexOf('window.QuantaBrainOwner.connectWithCode='),owner.indexOf('function form(message)'));
 assert.match(method,/const result=await verify\(code\)/);
 assert.match(method,/if\(result.state!=='verified'\)return/);
 assert.match(method,/await saveToken\(credential\)/);
 assert.match(method,/unlocked\(result.headers,credential,'key'\)/);
 assert.doesNotMatch(method,/fetch\(['"]https:\/\/.*\/work\/tickets\/create/);
});
test('one-time site pairing secrets are not spoken or inserted in conversation memory',()=>{
 const from=site.indexOf("if(!embedded&&/^(?:(?:please|bubbles)[\\s,:]+)*(?:pair|link|sync|connect)");
 const to=site.indexOf("const noteResult=noteCommand(spoken)",from);
 assert.ok(from>0&&to>from);
 const phrase=site.slice(from,to);
 assert.match(phrase,/pairingCode.value=result.code/);
 assert.match(phrase,/pairingCard.hidden=false/);
 assert.match(phrase,/120000/);
 assert.doesNotMatch(phrase,/resultText[^\n]*result.code/);
 assert.doesNotMatch(phrase,/messages.push\([^\n]*result.code/);
});
test('native Read aloud only queues the phone voice; website voice is not started',()=>{
 assert.match(site,/if\(nativeOverlay\)nativeSpeechReply=String\(text\)\.slice\(0,2200\)/);
 assert.match(site,/else speakText\(text\)/);
});
