const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {speechText}=require('../bubbles-brain-actions.js');

test('markdown is visible in chat but never narrated as punctuation',()=>{
  assert.equal(speechText('**Weather** (Omaha) / *today*'), 'Weather Omaha today');
  assert.equal(speechText('[Check progress](https://quantaphi.org/status) and https://example.com/job'),
    'Check progress and');
  assert.equal(speechText('A & B {green} [yellow] <blue>'), 'A and B green yellow blue');
  assert.equal(speechText('Here:\n- One\n* Two\n(Three) / Four'),
    'Here: One Two Three Four');
  assert.equal(speechText(''), '');
});

test('WebView fallback speech cleanup works even without brain tools',()=>{
  const source=fs.readFileSync('bubbles-ai.js','utf8');
  const start=source.indexOf('function speakText(value)');
  const end=source.indexOf('function display(',start);
  assert.ok(start>0&&end>start);
  const utterances=[];
  const ctx=vm.createContext({
    status:{},config:{},speaking:false,voiceEnabled:false,playbackVersion:0,
    Date,setTimeout(){return 1},clearTimeout(){},
    setOrbState(){},
    SpeechSynthesisUtterance:function(value){this.text=value;},
    speechSynthesis:{cancel(){},getVoices(){return []},speak(u){utterances.push(u);}}
  });
  vm.runInContext(source.slice(start,end),ctx);
  ctx.speakText('**Hello** (there) / *today* and https://example.com');
  assert.equal(utterances.length,1);
  assert.equal(utterances[0].text,'Hello there today and');
  assert.match(source,/new SpeechSynthesisUtterance\(cleanSpeech\)/);
});

test('native Android strips spoken markup only at playback, not from chat replies',()=>{
  const source=fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BubblesService.java','utf8');
  assert.match(source,/response = SpokenReplyText\.forSpeech\(response\);/);
  assert.match(source,/tts\.speak\(response,/);
  const gradle=fs.readFileSync('android/bubbles-overlay/app/build.gradle','utf8');
  assert.match(gradle,/versionCode 34/);
  assert.match(gradle,/versionName '0\.34\.0'/);
});
