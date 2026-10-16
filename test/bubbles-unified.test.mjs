/* Structural regression checks for the shared website/APK Bubbles chat.
 * No claim of Android device, microphone, server or screen-recording verification. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const chat=source('bubbles-ai.js');
const ui=source('bubbles-unified.css');
const home=source('index.html');
const studio=source('bubbles.html');
const overlay=source('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/FloatingOracleWindow.java');

test('site, standalone and floating APK share ONE QuantaPhi chat code path',()=>{
  assert.match(home,/bubbles-ai\.js\?v=/);
  assert.match(studio,/bubbles-ai\.js\?v=/);
  assert.match(overlay,/bubbles\.html\?nativeOverlay=1/);
  assert.match(chat,/window\.__QuantaBubblesMounted=true/);
  assert.match(chat,/if\(!host \|\| window\.__QuantaBubblesMounted\)return/);
});

test('one stylesheet is last on both site entry points, including the APK WebView',()=>{
  for(const html of [home,studio]){
    assert.match(html,/href="\/bubbles-unified\.css\?v=20261016-overhaul1"/);
    assert.ok(html.indexOf('bubbles-native-chat.css') < html.indexOf('bubbles-unified.css'));
  }
  assert.match(ui,/html\.bubbles-native-overlay \.ba-panel:not\(\[hidden\]\)/);
  assert.match(ui,/html\.bubbles-native-overlay \.ba-panel \.ba-thread/);
  assert.match(ui,/overflow-y:auto;overflow-x:hidden/);
});

test('paired phone voice yields website orb without adding a second chat view',()=>{
  assert.match(chat,/launcher\.hidden=androidCompanionListening/);
  assert.match(chat,/if\(androidCompanionListening && showing\)toggle\(false\)/);
  assert.match(chat,/document\.body\.classList\.toggle\('ba-companion-active'/);
});

test('pairing remains accessible via Options and connected conversations stop requesting new codes',()=>{
  assert.match(chat,/tools\.append\(create\('h3','ba-section-heading','Connections & pairing'\)/);
  assert.match(chat,/ownerReady\?'Verified and connected to Robot Brain/);
  assert.match(chat,/Do not demand another 64-character owner pairing code/);
});

test('history, screenshot and work tools were not stripped from the shared renderer',()=>{
  for(const marker of ['sharedMemory(', 'BubblesMemory','photoInput','readCurrentPage(', 'nativeScreenRequests','submitWork(', 'directGithubOperation(']){
    assert.ok(chat.includes(marker),'Missing '+marker);
  }
});
