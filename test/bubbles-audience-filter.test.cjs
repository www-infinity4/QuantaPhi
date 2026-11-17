const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const content=fs.readFileSync('bubbles-voice-gate.js','utf8');
test('no-wake listening avoids common dog chatter but accepts normal requests',()=>{
 const sandbox={};vm.runInNewContext(content,sandbox);
 const gate=sandbox.BubblesVoiceGate.create({name:'Bubbles',requireWakeName:false});
 for(const phrase of ['Good dog!', 'Sit!', 'Stay', 'Dogs, come!', 'Who is a good girl?', 'Leave it']) {
  const result=gate.accept(phrase,1000);
  assert.equal(result.type,'ignore',phrase);
  assert.equal(result.reason,'pet_address');
 }
 for(const phrase of ['Can you search weather?', 'Tell me how to train my dogs', 'Start a screen recording']) {
  assert.equal(gate.accept(phrase,10000).type,'message',phrase);
 }
 assert.equal(gate.accept('Bubbles good dog',20000).type,'message');
});
test('Android speech audience gate is local and tool-gating precedes dispatch',()=>{
 const service=fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BubblesService.java','utf8');
 const gate=fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/SpeechAudienceGate.java','utf8');
 assert.match(gate,/clearlyPetDirected/);
 assert.match(gate,/if \(typed \|\| explicitlyBubbles/);
 const index=service.indexOf('SpeechAudienceGate.clearlyPetDirected(');
 assert.ok(index>0);
 assert.ok(index<service.indexOf('VoiceCaptureCommands.parse(addressed);'),'Filter must run before commands');
});
