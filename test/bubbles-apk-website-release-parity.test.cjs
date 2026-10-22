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

function defaultThread({embedded=false,explicit=false,lastTab=''}={}){
 const begin=site.indexOf('let explicitlySelected=false;');
 const end=site.indexOf('try{sessionStorage.setItem(TAB_THREAD,activeThread)}',begin);
 assert.ok(begin>0&&end>begin);
 const scope=vm.createContext({
  sessionStorage:{getItem:key=>key==='explicit'?explicit?'1':'0':null},
  EXPLICIT_THREAD:'explicit',lastTab,embedded,
  threadIndex:lastTab?[{id:lastTab}]:[],
  SHARED_MAIN_THREAD:'bubbles_shared_main_v1',
  crypto:{randomUUID:()=> 'abcd-1234'},
 });
 vm.runInContext(site.slice(begin,end),scope);
 return vm.runInContext('activeThread',scope);
}

test('website and native APK share one default owner-verified conversation',()=>{
 assert.equal(defaultThread(), 'bubbles_shared_main_v1');
 assert.equal(defaultThread(),defaultThread({embedded:false,lastTab:'old-local-thread'}));
 assert.notEqual(defaultThread({embedded:true}),defaultThread());
 assert.equal(defaultThread({explicit:true,lastTab:'chat_existing_123'}),'chat_existing_123');
 assert.match(site,/sessionId:activeThread/);
 assert.match(site,/m\.sessionId===activeThread/);
 assert.match(site,/ownerReady/);
 assert.match(site,/syncCloudFolder\(activeThread/);
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
