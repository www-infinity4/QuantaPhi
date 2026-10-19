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
  assert.match(gradle,/versionCode 39/);
  assert.match(gradle,/versionName '0\.39\.0'/);
});

test('Yellow Android capture evidence is delivered once to Red and never fabricated from baseline',()=>{
 const {nativeCaptureNotice}=require('../bubbles-brain-actions.js');
 const saved={screenState:'Saved to Movies/Bubbles',soundState:''};
 assert.equal(nativeCaptureNotice(null,saved),'');
 assert.equal(nativeCaptureNotice({screenState:'Screen capture saving',soundState:''},saved),
   'Android reports the screen recording was saved. Check the recorder status for the phone-library result.');
 assert.equal(nativeCaptureNotice(saved,saved),'');
 assert.equal(nativeCaptureNotice({screenState:'',soundState:'Saving audio'},
   {screenState:'',soundState:'Phone media save failed: permission denied'}),
   'Android reports that sound recording failed. The recording was not verified saved. Check the recorder status in Bubbles.');
 assert.equal(nativeCaptureNotice({screenState:'Active',soundState:''},
   {screenState:'Recording in progress',soundState:''}),'');
});

test('native and owner evidence use the same Bubbles chat and Android TTS drain',()=>{
 const js=fs.readFileSync('bubbles-ai.js','utf8');
 assert.match(js,/nativeCaptureNotice\?\.\(lastNativeCaptureEvidence,capture\)/);
 assert.match(js,/progressVoiceQueue\.push\(captureNotice\)/);
 assert.match(js,/drainNativeReply:\(\)=>\{/);
 assert.match(js,/const red=await syncRedSectors\(\)\.catch\(\(\)=>null\)/);
 assert.match(js,/normalizeOwnerAssistantReply\(rawAnswer,request,ownerReady/);
});
