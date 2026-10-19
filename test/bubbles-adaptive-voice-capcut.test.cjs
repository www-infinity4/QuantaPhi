'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dir='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=n=>fs.readFileSync(dir+n,'utf8');
test('incomplete speech is buffered rather than submitted by an 850ms timer',()=>{
 const b=read('BubblesService.java'),policy=read('TurnCompletionPolicy.java');
 assert.match(b,/TurnCompletionPolicy\.waitMillis\(turnBuffer\.peek\(\)\)/);
 assert.match(b,/TurnCompletionPolicy\.onNewPartial\(turnBuffer\.peek\(\), partial\)/);
 assert.match(b,/case "screen_video":[\s\S]*?offerCaptureApproval\(command\)/);
 assert.match(b,/speak\("Approve screen capture\."\)/);
 assert.match(policy,/11000L/);
 assert.match(policy,/8500L/);
 assert.match(policy,/950L/);
 assert.doesNotMatch(b,/postDelayed\(deliverVoiceTurn, END_OF_TURN_MS\)/);
});
test('XRecorder recording state is verified before telling owner it started',()=>{
 const b=read('BubblesService.java'),du=read('XRecorderBridge.java'),access=read('BrainLearningService.java');
 assert.match(b,/XRecorderBridge\.recordingVerified\(this\)/);
 assert.match(du,/BrainLearningService\.xControlVisible/);
 assert.match(du,/if \(visible\)/);
 assert.match(du,/putBoolean\("x_recorder_verified", verified\)/);
 assert.match(du,/Tap XRecorder to record/);
 assert.match(access,/XRecorderBridge\.PACKAGE\.contentEquals\(root\.getPackageName\(\)\)/);
});
test('CapCut uses owner-selected SAF clip, not hidden external recorder files',()=>{
 const c=read('CapCutBridge.java'),u=read('MainActivity.java'),m=fs.readFileSync('android/bubbles-overlay/app/src/main/AndroidManifest.xml','utf8');
 assert.match(c,/com\.lemon\.lvoverseas/);
 assert.match(c,/Intent\.ACTION_SEND/);
 assert.match(c,/Intent\.EXTRA_STREAM/);
 assert.match(c,/FLAG_GRANT_READ_URI_PERMISSION/);
 assert.match(u,/Intent\.ACTION_OPEN_DOCUMENT/);
 assert.match(u,/CAPCUT_MEDIA_REQUEST/);
 assert.match(u,/capcut_action/);
 assert.match(m,/<package android:name="com\.lemon\.lvoverseas"\/>/);
 assert.doesNotMatch(c,/MediaStore\.Video\.Media\.EXTERNAL_CONTENT_URI/);
});
