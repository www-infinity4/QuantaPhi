'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('bubbles-ai.js','utf8');
const android=fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BubblesService.java','utf8');
const start=source.indexOf(' drainNativeReply:()=>{');
const end=source.indexOf('\n }\n};',start);
assert.ok(start>0 && end>start,'native reply drain method exists');
const method=source.slice(start,end+3);
function drain(initial){
 const context={
  nativeOverlay:true,
  nativeSpeechReply:'',
  nativePhaseNotice:'',
  nativeSpeechPending:false,
  busy:false,
  progressVoiceQueue:[],
  brainTools:null,
  ...initial
 };
 const bridge=vm.runInNewContext('({'+method+'})',context);
 return {value:bridge.drainNativeReply(),context,bridge};
}
test('the actual completed answer always wins over a simultaneous phase notice',()=>{
 const result=drain({nativeSpeechReply:'The repository was created.',nativePhaseNotice:'Thinking.',busy:false});
 assert.equal(result.value,'The repository was created.');
 assert.equal(result.context.nativeSpeechReply,'');
 assert.equal(result.context.nativePhaseNotice,'');
 assert.equal(result.bridge.drainNativeReply(),'');
});
test('a phase-only poll never clears a completed answer that arrives afterward',()=>{
 const state=drain({nativePhaseNotice:'On it.',busy:true});
 assert.equal(state.value,'On it.');
 state.context.nativeSpeechReply='Your recording saved.';
 assert.equal(state.bridge.drainNativeReply(),'Your recording saved.');
});
test('progress updates are not read while the current native response is pending',()=>{
 const state=drain({busy:true,nativeSpeechPending:true,progressVoiceQueue:['Unrelated task finished.']});
 assert.equal(state.value,'');
 assert.equal(state.context.progressVoiceQueue.length,1);
 state.context.busy=false;state.context.nativeSpeechPending=false;
 assert.equal(state.bridge.drainNativeReply(),'Unrelated task finished.');
});
test('native WebView error path produces an audible answer and resets busy state',()=>{
 assert.match(source,/Promise\.resolve\(sendMessage\(value,fromVoice,evidence\)\)\.catch\(error=>\{/);
 assert.match(source,/if\(fromVoice\)nativeSpeechReply=message/);
 assert.match(source,/nativeSpeechPending=false/);
 assert.match(source,/busy=false;send\.disabled=false/);
});
test('memory indexing cannot block network answers indefinitely',()=>{
 assert.match(source,/await Promise\.race\(\[/);
 assert.match(source,/longMemory\.context\(spoken\)/);
 assert.match(source,/memoryTimer=setTimeout\(\(\)=>resolve\(''\),1300\)/);
 assert.match(android,/if \(!typed\) speak\("On it\."\)/);
 assert.doesNotMatch(android,/speak\("Thinking\."\)/);
 assert.doesNotMatch(source,/nativePhaseNotice='Thinking\.'/);
});
