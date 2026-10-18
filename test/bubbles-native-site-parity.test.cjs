'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const source = p => fs.readFileSync(path.join(root, p), 'utf8');
const app = 'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const site = source('bubbles-ai.js');
const window = source(app + 'FloatingOracleWindow.java');
const service = source(app + 'BubblesService.java');

test('Android overlay embeds first-party site without sharing browser or ChatGPT credentials', () => {
  assert.match(window, /SITE_URL = "https:\/\/quantaphi\.org\/bubbles\.html\?nativeOverlay=1"/);
  assert.match(window, /SITE_HOST\.equals\(target\.getHost\(\)\)/);
  assert.match(window, /settings\.setJavaScriptEnabled\(true\)/);
  assert.match(window, /settings\.setDomStorageEnabled\(true\)/);
  assert.match(window, /settings\.setAllowFileAccess\(false\)/);
  assert.match(window, /settings\.setAllowContentAccess\(false\)/);
  assert.match(window, /WebSettings\.MIXED_CONTENT_NEVER_ALLOW/);
  assert.doesNotMatch(window, /addJavascriptInterface\(/);
  assert.match(window, /showWebsite\(false\)/);
  assert.match(window, /window\.QuantaBubbles && window\.QuantaBubbles\.isNativeOverlay/);
});
test('Site is the single assistant for native-voice commands and typed chat', () => {
  assert.match(window, /JSONObject\.quote\(spoken\)/);
  assert.match(window, /window\.QuantaBubbles\.sendNativeSpeech/);
  assert.match(window, /window\.QuantaBubbles\.drainNativeReply/);
  assert.match(service, /oracleWindow != null && oracleWindow\.sendSpoken\(addressed, ambientContext\)/);
  assert.match(service, /RoomContextFusion\.forTurn\(this, addressed\)/);
  assert.match(service, /void speakWebsiteReply\(String response\)/);
  assert.match(site, /nativeOverlay=!embedded&&params\.get\('nativeOverlay'\)==='1'/);
  assert.match(site, /if\(!nativeOverlay\|\|busy\)return false/);
  assert.match(site, /nativeSpeechPending=fromVoice/);
  assert.match(site, /if\(fromVoice&&!nativeOverlay&&!await sharedVoice\(false\)\)/);
  assert.match(site, /if\(nativeSpeechPending\)nativeSpeechReply=answer/);
  assert.match(site, /mic\.hidden=true/);
  assert.match(site, /speak\.hidden=true/);
  assert.match(site, /const headers=await verifiedOwnerHeaders\(\)/);
  assert.match(site, /\/work\/tickets\/create/);
  assert.match(site, /\/work\/tickets\/update/);
});
test('Voice notes work without a manual notes form', () => {
  assert.match(site, /if\(nativeOverlay\)\{noteText\.hidden=true;saveNote\.hidden=true;\}/);
  const from = site.indexOf('function noteCommand(spoken){');
  const to = site.indexOf('function addNote(value){', from);
  assert.ok(from >= 0 && to > from);
  const saved = [];
  const sandbox = {
    addNote: s => {saved.push(s);return true;},
    renderNotes: () => {},
  };
  vm.createContext(sandbox);
  vm.runInContext('let noteTaking=false;'+site.substring(from,to), sandbox);
  assert.match(vm.runInContext('noteCommand("take notes")',sandbox), /taking notes/i);
  assert.match(vm.runInContext('noteCommand("The radio player should work in the background")',sandbox), /saved note/i);
  assert.match(vm.runInContext('noteCommand("stop taking notes")',sandbox), /stopped/i);
  assert.match(vm.runInContext('noteCommand("write down a second idea")',sandbox), /saved note/i);
  assert.equal(saved.join('|'),'The radio player should work in the background|a second idea');
  assert.equal(vm.runInContext('noteCommand("What time is it?")',sandbox),'');
  assert.match(source(app+'VoiceNotes.java'), /VoiceNotes/);
});
test('Preview 5 installs separately from previous debug signatures', () => {
  const gradle=source('android/bubbles-overlay/app/build.gradle');
  assert.match(gradle,/versionCode 36/);
  assert.match(gradle,/versionName '0\.36\.0'/);
  assert.match(gradle,/applicationIdSuffix '\.preview5'/);
});


test('loading the shared assistant holds speech instead of using the old manual-submit fallback',()=>{
 const method=window.slice(window.indexOf('boolean sendSpoken(String text)'),window.indexOf('private void showWebsite'));
  // A temporarily absent WebView must not discard a new spoken request.
  assert.match(method,/root == null \|\| text == null/);
 assert.doesNotMatch(method,/if \(!websiteReady \|\| website == null\) return false/);
  assert.match(method,/pendingSpeech\.addLast\(/);
 assert.match(window,/if \(!pendingSpeech.isEmpty\(\)\) deliverQueuedSpeech\(\)/);
 assert.match(site,/submission is already complete/);
 assert.match(site,/Never tell the owner to click a submit, run, publish or finish button/);
});

test('consecutive spoken turns are FIFO, not overwritten or muted by a website voice-lease failure',()=>{
  assert.match(window,/new java\.util\.ArrayDeque<>\(\)/);
  assert.match(window,/pendingSpeech\.addLast\(/);
  assert.match(window,/pendingSpeech\.peekFirst\(\)/);
  assert.match(window,/pendingSpeech\.pollFirst\(\)/);
  assert.match(window,/if \(!pendingSpeech\.isEmpty\(\)\) ui\.post\(this::deliverQueuedSpeech\)/);
  assert.match(window,/typedDispatchInFlight/);
  assert.match(window,/speechDispatchAt > 15000L/);
  assert.doesNotMatch(window,/if \("true"\.equals\(value\)\) service\.pauseSharedMicrophone\(\)/);
  assert.match(window,/claimMicrophone\(\)/);
  assert.match(service,/if \(turnBuffer\.hasPending\(\)\) main\.postDelayed\(this, 400L\)/);
  assert.match(service,/if \(retries < 3/);
});
