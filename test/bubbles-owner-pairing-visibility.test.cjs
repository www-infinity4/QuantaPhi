const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const js=fs.readFileSync('bubbles-ai.js','utf8');
const css=fs.readFileSync('bubbles-ai.css','utf8');

test('Android has a single message field, no hidden pairing code button or extra form',()=>{
 assert.match(js,/input.placeholder=nativeOverlay\?'Message Bubbles or paste your 64-character Robot Brain code here/);
 assert.match(js,/ownerMode.textContent='Robot Brain not linked · paste your owner code in the message box and Send'/);
 assert.match(js,/await consumeOwnerCodeFromChat\(spoken,fromVoice\)/);
 assert.doesNotMatch(js,/nativeOwnerInput|nativeOwnerButton|nativeOwnerRow|nativeOwnerPaste/);
 assert.match(css,/html\.bubbles-native-overlay \.ba-composer/);
});
test('64-digit owner codes bypass history, speech and AI even if invalid',()=>{
 const handler=js.slice(js.indexOf('async function consumeOwnerCodeFromChat('),js.indexOf('async function sendMessage(',js.indexOf('async function consumeOwnerCodeFromChat(')));
 assert.match(handler,/window\.QuantaBrainOwner\?\.connectWithCode\?\.\(payload\)/);
 assert.match(handler,/input\.value=''/);
 assert.match(handler,/\^\[a-f0-9\]\{64\}\$/i);
 assert.doesNotMatch(handler,/messages\.push|persistChat|nativeChatGPT|fetch\(AI|speakText|nativeSpeechReply/);
 const send=js.slice(js.indexOf('async function sendMessage('),js.indexOf('const nativeDirective=',js.indexOf('async function sendMessage(')));
 assert.ok(send.indexOf('consumeOwnerCodeFromChat')<send.indexOf('if(busy)return'));
});