import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('auto-update checks on app launch, focus, visibility return and interval without an owner button',()=>{
 const src=file('bubbles-ai.js');
 assert.match(src,/function requestAutomaticSiteUpdate\(\)/);
 assert.match(src,/window\.addEventListener\('focus',requestAutomaticSiteUpdate\)/);
 assert.match(src,/document\.addEventListener\('visibilitychange',/);
 assert.match(src,/setTimeout\(requestAutomaticSiteUpdate,/);
 assert.match(src,/setInterval\(requestAutomaticSiteUpdate,90000\)/);
 assert.match(src,/navigator\.serviceWorker\.getRegistration\('\/'\)/);
 assert.match(src,/checkForSiteUpdate\(\)/);
});
test('existing safe update guards preserve drafts, photos, unsaved history and listening',()=>{
 const src=file('bubbles-ai.js');
 assert.match(src,/if\(input\.value\.length\|\|noteText\.value\.length\|\|workText\.value\.length\|\|pendingImage\|\|pendingImages\.length\)return false;/);
 assert.match(src,/if\(!keepChat&&messages\.length\)return false;/);
 assert.match(src,/if\(nativeRecordingActive\|\|voiceStarting\|\|voiceEnabled\|\|speaking\)return false;/);
});
test('reloaded first-party apps request the current Bubbles build revision',()=>{
 for(const path of ['index.html','bubbles.html','bubbles/index.html','bubbles-chrome.html'])
  assert.match(file(path),/\/bubbles-ai\.js\?v=20261126-native-bubbles4/);
});
test('a work receipt can resume only with a verified same-thread ticket',()=>{
 const src=file('bubbles-ai.js');
 assert.match(src,/const ACTIVE_WORK_REF='bubbles-last-active-work-v1';/);
 assert.match(src,/pollingThread===activeThread&&ref/);
 assert.match(src,/result\.tickets\.find\(ticket=>ticket\?\.id===ref\.ticketId&&matchesThread\(ticket\)/);
 assert.match(src,/setInterval\(\(\)=>void pollBrainProgress\(true\),2500\)/);
 assert.match(src,/sessionStorage\.setItem\(ACTIVE_WORK_REF,/);
});

test('direct GitHub work keeps only a bounded opaque request ID for signed receipt recovery',()=>{
 const src=file('bubbles-ai.js');
 assert.match(src,/const GITHUB_PENDING_KEY='bubbles-pending-github-work-v1';/);
 assert.match(src,/function resumePendingGithubReceipts\(\)/);
 assert.match(src,/sessionStorage\.setItem\(GITHUB_PENDING_KEY,/);
 assert.match(src,/githubReceipt\(requestId\)/);
 assert.match(src,/clearPendingGithubWork\(requestId\)/);
 assert.match(src,/if\(restored\.thread!==activeThread\)continue;/);
});

// Exercise the actual scheduler, not a second copy of its policy.
function backgroundHarness(){
 const begin=file('bubbles-ai.js').indexOf('let nextBackgroundMemorySync=0,nextBackgroundVoiceCheck=0;');
 const end=file('bubbles-ai.js').indexOf("if(!embedded&&typeof setInterval==='function'){",begin);
 assert.ok(begin>=0&&end>begin,'background owner sync must have a bounded scheduler');
 const calls={memory:0,status:0,voice:0};
 const state={ownerReady:true,busy:false,nativeOverlay:false,voiceLeaseWanted:false,document:{hidden:false},clock:0,
  sharedMemory:()=>{calls.memory++},checkSharedVoiceStatus:()=>{calls.status++},sharedVoice:()=>{calls.voice++}};
 const run=new Function('state','calls','with(state){const Date={now:()=>clock};'+file('bubbles-ai.js').slice(begin,end)+';return syncOwnerInBackground;}')(state,calls);
 return {state,calls,run};
}
test('idle owner sync is bounded while current conversation writes remain immediate',()=>{
 const h=backgroundHarness();
 for(h.state.clock=0;h.state.clock<60000;h.state.clock+=3000)h.run();
 assert.deepEqual(h.calls,{memory:1,status:2,voice:0});
 h.run();
 assert.deepEqual(h.calls,{memory:2,status:3,voice:0});
 const src=file('bubbles-ai.js');
 const persist=src.slice(src.indexOf('function persistChat(){'),src.indexOf('function persistChat(){')+1300);
 assert.match(persist,/void sharedMemory\(\)/,'a new saved turn must still sync immediately');
 assert.match(src,/setInterval\(syncOwnerInBackground,3000\)/);
});
test('hidden owner chat stops idle network reads while active voice keeps its renewal',()=>{
 const h=backgroundHarness();h.state.document.hidden=true;h.state.voiceLeaseWanted=true;
 for(h.state.clock=0;h.state.clock<60000;h.state.clock+=3000)h.run();
 assert.deepEqual(h.calls,{memory:0,status:0,voice:20});
 h.state.ownerReady=false;h.run();
 assert.deepEqual(h.calls,{memory:0,status:0,voice:20});
});
test('foreground sync resumes after busy chat and native overlay avoids website voice-status reads',()=>{
 const h=backgroundHarness();h.state.busy=true;h.state.nativeOverlay=true;h.run();
 assert.deepEqual(h.calls,{memory:0,status:0,voice:0});
 h.state.clock=3000;h.state.busy=false;h.run();
 assert.deepEqual(h.calls,{memory:1,status:0,voice:0});
});
