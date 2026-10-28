import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const android='android/bubbles-overlay/app/src/main/';
const java=android+'java/org/quantaphi/bubbles/';

test('new Android link is BROWSABLE and separate from authentication return callback',()=>{
 const manifest=source(android+'AndroidManifest.xml');
 assert.match(manifest,/<data android:scheme="quantaphi-bubbles" android:host="card"/);
 assert.match(manifest,/<data android:scheme="quantaphi-bubbles" android:host="return"/);
 assert.match(manifest,/<category android:name="android.intent.category.BROWSABLE"/);
});
test('external card link cannot start the microphone or grant permissions',()=>{
 const main=source(java+'MainActivity.java');
 const start=main.indexOf('private boolean consumeQuickCardLink(');
 const end=main.indexOf('@Override protected void onResume()',start);
 assert.ok(start>=0&&end>start);
 const handler=main.slice(start,end);
 assert.match(handler,/BubblesService\.isSessionRunning\(\)/);
 assert.match(handler,/BubblesCardLink\.cardId\(uri\)/);
 assert.match(handler,/ACTION_OPEN_CARD/);
 assert.match(handler,/moveTaskToBack\(true\)/);
 assert.doesNotMatch(handler,/checkAndStart|requestPermissions|ACTION_TEXT|ACTION_RECORD/);
 assert.match(main,/if \(!fromQuickCard && canTalk\(\)/);
 const service=source(java+'BubblesService.java');
 const handlerAt=service.indexOf('if (intent != null && ACTION_OPEN_CARD.equals(intent.getAction()))');
 const startMicAt=service.indexOf('if (checkSelfPermission(Manifest.permission.RECORD_AUDIO)');
 assert.ok(handlerAt>=0&&handlerAt<startMicAt);
 assert.match(service.slice(handlerAt,startMicAt),/return START_NOT_STICKY;/);
});
test('card opens the existing trusted WebView and bypasses conversation reset',()=>{
 const panel=source(java+'FloatingOracleWindow.java');
 assert.match(panel,/boolean showCard\(String id\)/);
 assert.match(panel,/!suppressFreshOnCardOpen && websiteReady/);
 assert.match(panel,/JSONObject\.quote\(id\)/);
 assert.match(panel,/trustedChat\(website\)/);
 assert.match(panel,/deliverPendingCard\(\);/);
 assert.doesNotMatch(panel.slice(panel.indexOf('private void deliverPendingCard()'),panel.indexOf('boolean show()',panel.indexOf('private void deliverPendingCard()'))),/loadUrl\(/);
 const chat=source('bubbles-ai.js');
 assert.match(chat,/openRegisteredCardFromAndroid:/);
 assert.match(chat,/resolveBubblesQuickCard\(module,id\)/);
 assert.match(chat,/if\(!nativeOverlay\|\|typeof id/);
});
test('source, feed and science viewer details each mount their own APK control',()=>{
 for(const path of ['source-quick-cards.mjs','quanta-feed.mjs','science-quick-cards.mjs']){
  const code=source(path);
  assert.match(code,/mountQuickCardApkBridge\(host\)|mountQuickCardApkBridge\(root\)/);
  assert.match(code,/dataset\.quickCardId=card\.id/);
  assert.match(code,/dataset\.cardTitle=card\.name/);
 }
 const science=source('science-quick-card.html');
 assert.match(science,/quick-card-apk-bridge\.css/);
 const bridge=source('quick-card-apk-bridge.mjs');
 assert.match(bridge,/\.sqc-card\[data-source-id\]/);
});