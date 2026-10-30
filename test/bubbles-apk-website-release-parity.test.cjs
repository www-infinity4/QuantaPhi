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


async function simulateSiteRevisionCheck({draft='',noteDraft='',workDraft='',photo=false,photos=0,lateDraft=null,lateNoteDraft=null,lateWorkDraft=null}={}){
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
  input,noteText,workText,pendingImage:photo?{data:'unsent-photo'}:null,
  pendingImages:Array.from({length:photos},()=>({data:'unsent-photo'})),
  keepChat:true,saveThread:()=>events.push('saved'),
  sessionStorage:{setItem:(key,value)=>events.push('marker:'+key+':'+value)},
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
