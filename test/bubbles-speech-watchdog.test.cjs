const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('bubbles-ai.js','utf8');
function harness(){
 let timer,utterance,cancels=0,resumes=0,clears=0;
 const ctx=vm.createContext({status:{},config:{},playbackVersion:0,speaking:false,voiceEchoUntil:0,voiceEnabled:true,
  setOrbState(){},streamVoice:{resume(){resumes++}},Date,
  setTimeout(fn){timer=fn;return 1},clearTimeout(){clears++},
  SpeechSynthesisUtterance:function(text){this.text=text},
  speechSynthesis:{cancel(){cancels++},getVoices(){return []},speak(u){utterance=u}}
 });
 vm.runInContext(source.slice(source.indexOf('function speakText(value)'),source.indexOf('function display(')),ctx);
 return {ctx,run(){ctx.speakText('test reply')},fire(){timer()},get utterance(){return utterance},get cancels(){return cancels},get resumes(){return resumes},get clears(){return clears}};
}
test('missing end event releases speech and resumes listening',()=>{
 const h=harness();h.run();assert.equal(h.ctx.speaking,true);h.fire();assert.equal(h.ctx.speaking,false);assert.equal(h.resumes,1);assert.equal(h.cancels,2);
 h.utterance.onend();assert.equal(h.resumes,1);
});
test('normal completion clears watchdog; late callback cannot cancel newer speech',()=>{
 const h=harness();h.run();const old=h.utterance;old.onend();assert.equal(h.clears,1);h.run();old.onerror();assert.equal(h.ctx.speaking,true);assert.equal(h.resumes,1);
});
test('stale watchdog cannot cancel a superseding playback',()=>{
 const h=harness();h.run();h.ctx.playbackVersion++;h.fire();assert.equal(h.cancels,1);assert.equal(h.resumes,0);
});
