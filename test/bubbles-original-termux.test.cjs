'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const base='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=path=>fs.readFileSync(path,'utf8');

test('original APK declares Termux integration without replacing the shared website chat',()=>{
 const manifest=read('android/bubbles-overlay/app/src/main/AndroidManifest.xml');
 const overlay=read(base+'FloatingOracleWindow.java');
 assert.match(manifest,/com\.termux\.permission\.RUN_COMMAND/);
 assert.match(manifest,/<package android:name="com\.termux"\/>/);
 assert.match(manifest,/\.TermuxResultReceiver" android:exported="false"/);
 assert.match(overlay,/https:\/\/quantaphi\.org\/bubbles\.html\?nativeOverlay=1/);
 assert.match(overlay,/window\.QuantaBubbles\.drainNativeTermuxRequest\(\)/);
 assert.match(overlay,/finishNativeTermuxRequest/);
});
test('native Termux script execution requires Android permission and owner confirmation',()=>{
 const bridge=read(base+'TermuxBridge.java');
 const ui=read(base+'FloatingOracleWindow.java');
 const activity=read(base+'MainActivity.java');
 assert.match(bridge,/com\.termux\.permission\.RUN_COMMAND/);
 assert.match(bridge,/TermuxResultReceiver\.class/);
 assert.match(bridge,/PendingIntent\.FLAG_ONE_SHOT/);
 assert.match(bridge,/com\.termux\.RUN_COMMAND_PENDING_INTENT/);
 assert.match(ui,/\.setPositiveButton\("Run once"/);
 assert.match(ui,/\.setNegativeButton\("Cancel"/);
 assert.match(ui,/TermuxBridge\.run\(service, id, language, code\)/);
 assert.match(activity,/Allow Termux commands/);
});
test('the chat only accepts direct, explicit owner Termux requests and real return evidence',()=>{
 const script=read('bubbles-ai.js');
 const receiver=read(base+'TermuxResultReceiver.java');
 assert.match(script,/function nativeTermuxIntent\(value\)/);
 assert.match(script,/function runNativeTermux\(language,code\)/);
 assert.match(script,/nativeOverlay&&!pendingImage\?nativeTermuxIntent\(spoken\)/);
 assert.match(script,/finishNativeTermuxRequest:\(id,receipt\)/);
 assert.match(receiver,/result\.getInt\("exitCode"/);
 assert.match(receiver,/result\.getString\("stdout"/);
 assert.match(receiver,/FloatingOracleWindow\.onTermuxResult\(id, report\)/);
 assert.match(receiver,/Termux returned no execution evidence/);
});
