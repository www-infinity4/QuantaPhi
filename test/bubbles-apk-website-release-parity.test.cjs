'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const read=path=>fs.readFileSync(path,'utf8');
const site=read('bubbles-ai.js');
const native=read('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/FloatingOracleWindow.java');
const doc=read('bubbles.html');
const revision=doc.match(/<script\b[^>]*\bsrc=["']\/bubbles-ai\.js\?v=([^"'&]+)[^"']*["']/i)?.[1];

let sessionSerial=0;
function openingThread({lastTab='',siteUpdate=false}={}){
 const begin=site.indexOf("let lastTab='',resumeSiteUpdate=false;");
 const end=site.indexOf("try{\n sessionStorage.setItem(TAB_THREAD,activeThread)",begin);
 assert.ok(begin>0&&end>begin);
 const store=new Map([[ 'tab',lastTab],['tab:site-update-reload',siteUpdate?'1':'0']]);
 const scope=vm.createContext({
  embedded:false,keepChat:false,
  sessionStorage:{getItem:key=>store.get(key)||null,removeItem:key=>store.delete(key)},
  TAB_THREAD:'tab',UPDATE_RELOAD_THREAD:'tab:site-update-reload',
  threadIndex:lastTab?[{id:lastTab}]:[],
  crypto:{randomUUID:()=>String(++sessionSerial).padStart(32,'0')}
 });
 vm.runInContext(site.slice(begin,end),scope);
 return {id:vm.runInContext('activeThread',scope),markerCleared:!store.has('tab:site-update-reload')};
}

test('website and APK share the same Brain, but each opening starts its own fresh chat',()=>{
 const first=openingThread();
 const next=openingThread({lastTab:first.id});
 assert.match(first.id,/^chat_[0-9a-f]{32}$/);
 assert.notEqual(first.id,next.id);
 assert.notEqual(first.id,'bubbles_shared_main_v1');
 assert.notEqual(openingThread({lastTab:'chat_existing_123'}).id,'chat_existing_123');
 const refreshed=openingThread({lastTab:first.id,siteUpdate:true});
 assert.equal(refreshed.id,first.id,'only an internal site update may preserve the active thread');
 assert.equal(refreshed.markerCleared,true);
 assert.match(site,/sessionId:activeThread/);
 assert.match(site,/m\.sessionId===activeThread/);
 assert.match(site,/ownerReady/);
 assert.match(site,/syncCloudFolder\(activeThread/);
 assert.match(site,/restoreNativeHistory:\(backup\)=>\{/);
});

test('native speech and typed messages use the very same QuantaPhi assistant',()=>{
 assert.match(native,/SITE_URL = "https:\/\/quantaphi\.org\/bubbles\.html\?nativeOverlay=1"/);
 assert.match(native,/window\.QuantaBubbles\.sendNativeSpeech/);
 assert.match(native,/window\.QuantaBubbles\.sendNativeText/);
 assert.match(native,/window\.QuantaBubbles\.drainNativeReply/);
 assert.match(site,/const AI='https:\/\/bubbles-tools\.marvaseater\.workers\.dev\/v1\/assist'/);
 assert.match(site,/mic\.hidden=true/);
 assert.match(site,/speak\.hidden=true/);
 assert.doesNotMatch(native,/addJavascriptInterface\(/);
});
test('APK loads the current live website, not an HTML build pinned to the APK version',()=>{
 assert.ok(revision);
 for(const page of ['bubbles.html','bubbles-chrome.html','bubbles/index.html','index.html'])
  assert.match(read(page),new RegExp('bubbles-ai\\.js\\?v='+revision));
 assert.doesNotMatch(native,/SITE_URL\s*\+\s*"&v="\s*\+\s*BuildConfig\.VERSION_NAME/);
 assert.match(native,/settings\.setCacheMode\(WebSettings\.LOAD_NO_CACHE\)/);
 assert.match(native,/checkSiteRevision\(\)/);
 assert.match(site,/checkForSiteUpdate/);
 assert.match(site,/if\(busy\|\|nativeBridgeBusy\|\|nativeSpeechPending\|\|voicePending\.length\)return false/);
 const line=site.split('\n').find(x=>x.includes('const remote=html.match'));
 assert.ok(line);
 const expression=line.trim().replace(/^const remote=/,'').replace(/;$/,'');
 const remoteRevision=new Function('html','return '+expression);
 assert.equal(remoteRevision(doc),revision);
 assert.equal(remoteRevision(doc.replace(revision,'new-script-revision')),'new-script-revision');
});


async function simulateSiteRevisionCheck({draft='',noteDraft='',workDraft='',photo=false,photos=0,lateDraft=null,lateNoteDraft=null,lateWorkDraft=null,saveFails=false,historyDisabled=false,activeMessages=0,markerFails=false,speaking=false,voiceStarting=false,voiceEnabled=false,nativeRecordingActive=false}={}){
 const begin=site.indexOf('let siteVersionChecking=false,lastSiteVersionCheck=0;');
 const end=site.indexOf('window.QuantaBubbles={',begin);
 assert.ok(begin>0&&end>begin,'actual first-party updater is present');
 const input={value:draft},noteText={value:noteDraft},workText={value:workDraft},events=[];
 const scope=vm.createContext({
  embedded:false,Date:{now:()=>60000},URL,siteRevision:'previous',
  location:{origin:'https://quantaphi.org',reload:()=>events.push('reload')},
  bubblesFetch:async()=>{
   if(lateDraft!==null)input.value=lateDraft;
   if(lateNoteDraft!==null)noteText.value=lateNoteDraft;
   if(lateWorkDraft!==null)workText.value=lateWorkDraft;
   return {ok:true,text:async()=>'<script src="/bubbles-ai.js?v=next-revision"></script>'};
  },
  busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],
  speaking,voiceStarting,voiceEnabled,nativeRecordingActive,
  input,noteText,workText,pendingImage:photo?{data:'unsent-photo'}:null,
  pendingImages:Array.from({length:photos},()=>({data:'unsent-photo'})),
  keepChat:!historyDisabled,messages:Array.from({length:activeMessages},()=>({role:'user',text:'existing turn'})),
  saveThread:()=>{events.push('saved');return !saveFails;},
  sessionStorage:{setItem:(key,value)=>{if(markerFails)throw Error('sessionStorage unavailable');events.push('marker:'+key+':'+value)}},
  UPDATE_RELOAD_THREAD:'site-update-reload'
 });
 vm.runInContext(site.slice(begin,end),scope);
 const result=await vm.runInContext('checkForSiteUpdate()',scope);
 return {result,events};
}

test('revision updater never reloads over unsent Android composer text or photos',async()=>{
 for(const scenario of [
  {draft:'Fifteen minutes of unsent writing'},
  {draft:'  '},
  {noteDraft:'Unsent private note'},
  {workDraft:'Unsent Robot Brain source request'},
  {photo:true},
  {photos:2},
  {lateDraft:'Text typed while the revision request was pending'},
  {lateNoteDraft:'Note written during update check'},
  {lateWorkDraft:'Brain work request written during update check'}
 ]){
  const {result,events}=await simulateSiteRevisionCheck(scenario);
  assert.equal(result,false,'reload must defer while the user has unsent content');
  assert.deepEqual(events,[],'no reload or update marker may be written');
 }
});

test('revision updater still reloads safely once composer and photos are empty',async()=>{
 const {result,events}=await simulateSiteRevisionCheck();
 assert.equal(result,true);
 assert.deepEqual(events,['saved','marker:site-update-reload:1','reload']);
});

test('revision updater keeps the active conversation when local History persistence fails',async()=>{
 const {result,events}=await simulateSiteRevisionCheck({saveFails:true});
 assert.equal(result,false,'failed local History save must defer revision reload');
 assert.deepEqual(events,['saved'],'failed save must not mark the tab or reload');
 const recovered=await simulateSiteRevisionCheck();
 assert.equal(recovered.result,true,'successful retry can update once storage works');
 assert.deepEqual(recovered.events,['saved','marker:site-update-reload:1','reload']);
});

test('Android Hide/reopen cannot start a new conversation over any unsent draft',()=>{
 const begin=site.indexOf('startFreshOnReopen:()=>{');
 const end=site.indexOf('nativeHistorySnapshot:',begin);
 assert.ok(begin>0&&end>begin,'actual Android reopen controller exists');
 const code='({'+site.slice(begin,end)+'})';
 const cases=[
  {draft:'Do not erase my unfinished message'},
  {draft:'   '},
  {noteDraft:'Private note still being written'},
  {workDraft:'Robot Brain job not yet submitted'},
  {photo:true},
  {photos:2}
 ];
 const run=({draft='',noteDraft='',workDraft='',photo=false,photos=0}={})=>{
  let started=0;
  const ctx={
   nativeOverlay:true,busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],
   keepChat:true,messages:[],
   input:{value:draft},noteText:{value:noteDraft},workText:{value:workDraft},
   pendingImage:photo?{data:'photo'}:null,pendingImages:Array.from({length:photos},()=>({data:'photo'})),
   startConversation:()=>{started++;return true}
  };
  const fn=vm.runInNewContext(code,ctx).startFreshOnReopen;
  return {result:fn(),started};
 };
 for(const scenario of cases){
  assert.deepEqual(run(scenario),{result:false,started:0},'unsent content must remain on Android reopen');
 }
 assert.deepEqual(run(),{result:true,started:1},'an empty panel may start a fresh chat');
 assert.match(site,/if\(reopening&&!nativeOverlay&&!embedded&&!unsentDraft\)void startConversation\(\{automatic:true\}\)/,
  'website reopen must use the same unsent draft guard');
 assert.match(site,/const unsentDraft=Boolean\(input\.value\.length\|\|noteText\.value\.length\|\|workText\.value\.length\|\|pendingImage\|\|pendingImages\.length\)/);
});

async function simulateNewChat({draft='',noteDraft='',workDraft='',photo=false,photos=0,approve=false,automatic=false}={}){
 const begin=site.indexOf('async function startConversation({automatic=false}={}){');
 const end=site.indexOf("newConversation.addEventListener('click'",begin);
 assert.ok(begin>0&&end>begin,'actual first-party New chat handler exists');
 const events=[],input={value:draft,focus:()=>events.push('focus')};
 const scope=vm.createContext({
  busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],
  input,noteText:{value:noteDraft},workText:{value:workDraft},
  pendingImage:photo?{data:'unsent-photo'}:null,
  pendingImages:Array.from({length:photos},()=>({data:'unsent-photo'})),
  keepChat:true,messages:[{role:'user',text:'previous turn'}],
  saveThread:()=>events.push('saved'),
  threadIndex:[{id:'previous',title:'Earlier chat',updated:1}],activeThread:'previous',
  freshThreadId:()=> 'chat_new',
  sessionStorage:{setItem:()=>events.push('session')},
  TAB_THREAD:'tab',EXPLICIT_THREAD:'explicit',
  photoInput:{value:'selected'},photoPreview:{hidden:false},
  save:()=>events.push('index'),THREAD_INDEX:'threads',
  memoryContext:[],memoryInstructions:[],greeted:true,activeCardEvidence:null,
  cardWorkspaceInstance:null,conversation:{replaceChildren:()=>events.push('cleared')},
  renderConversationFolders:()=>events.push('rendered'),
  chatsPanel:{open:true},status:{textContent:''},nativeOverlay:true,ownerReady:false,
  confirm:()=>{events.push('confirm');return approve}
 });
 vm.runInContext(site.slice(begin,end),scope);
 const result=await vm.runInContext(automatic?'startConversation({automatic:true})':'startConversation()',scope);
 return {result,events,composer:input.value,photos:scope.pendingImages.length,thread:scope.activeThread};
}

test('explicit New chat never silently discards unsent text or photos',async()=>{
 for(const scenario of [{draft:'Fifteen minutes of writing'},{draft:'   '},{photo:true},{photos:2}]){
  const cancelled=await simulateNewChat(scenario);
  assert.equal(cancelled.result,false);
  assert.deepEqual(cancelled.events,['confirm'],'cancel must not save, reset, or change the session');
  assert.equal(cancelled.thread,'previous');
  assert.equal(cancelled.composer,scenario.draft||'');
  assert.equal(cancelled.photos,scenario.photos||0);
  const approved=await simulateNewChat({...scenario,approve:true});
  assert.equal(approved.result,true);
  assert.equal(approved.thread,'chat_new');
  assert.equal(approved.composer,'');
  assert.equal(approved.photos,0);
  assert.equal(approved.events[0],'confirm');
 }
 const empty=await simulateNewChat();
 assert.equal(empty.result,true);
 assert.ok(!empty.events.includes('confirm'),'empty New chat needs no warning');
});

test('automatic fresh chat fails closed even if caller skips its draft guard',async()=>{
 for(const scenario of [
  {draft:'unfinished'}, {noteDraft:'private note'}, {workDraft:'Brain job draft'},
  {photo:true}, {photos:2}
 ]){
  const result=await simulateNewChat({...scenario,automatic:true});
  assert.equal(result.result,false);
  assert.deepEqual(result.events,[]);
  assert.equal(result.thread,'previous');
 }
 const empty=await simulateNewChat({automatic:true});
 assert.equal(empty.result,true);
 assert.ok(!empty.events.includes('confirm'));
});

test('revision updater does not discard active turns when History is disabled',async()=>{
 const blocked=await simulateSiteRevisionCheck({historyDisabled:true,activeMessages:2});
 assert.equal(blocked.result,false,'no durable transcript exists to restore after reload');
 assert.deepEqual(blocked.events,[],'must not save, mark or reload a nonpersistent chat');
 const empty=await simulateSiteRevisionCheck({historyDisabled:true});
 assert.equal(empty.result,true,'empty history-disabled chat may still update');
 assert.deepEqual(empty.events,['marker:site-update-reload:1','reload']);
});

test('revision updater refuses reload if sessionStorage cannot retain the resume marker',async()=>{
 const blocked=await simulateSiteRevisionCheck({markerFails:true});
 assert.equal(blocked.result,false,'a rejected marker would open a different thread');
 assert.deepEqual(blocked.events,['saved'],'the saved transcript remains accessible in the current session');
 const blockedNoHistory=await simulateSiteRevisionCheck({historyDisabled:true,markerFails:true});
 assert.equal(blockedNoHistory.result,false);
 assert.deepEqual(blockedNoHistory.events,[]);
});

// The Android RecordB Start→Stop file is not yet saved while recording is active.
// Likewise a live microphone/TTS session must not be torn down by a background
// website revision check, even when the text composer is empty.
test('revision updater defers during Android recording and live voice playback',async()=>{
 for(const scenario of [
  {nativeRecordingActive:true},
  {speaking:true},
  {voiceStarting:true},
  {voiceEnabled:true}
 ]){
  const {result,events}=await simulateSiteRevisionCheck(scenario);
  assert.equal(result,false,'active recording, speech or microphone must defer reload');
  assert.deepEqual(events,[],'do not write a resume marker or reload during voice');
 }
 const safe=await simulateSiteRevisionCheck();
 assert.equal(safe.result,true,'an idle session may update after recording and voice finish');
});
