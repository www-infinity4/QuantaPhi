'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dir='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=x=>fs.readFileSync(dir+x,'utf8');
const native=read('BubblesService.java');
const main=read('MainActivity.java');
const legacy=read('ScreenCaptureService.java');
const du=read('XRecorderBridge.java');
const access=read('BrainLearningService.java');
const manifest=fs.readFileSync('android/bubbles-overlay/app/src/main/AndroidManifest.xml','utf8');

test('Bubbles records native screen video after Android consent and retains voice',()=>{
 assert.match(native,/case "screen_video":[\s\S]*?offerCaptureApproval\(command\)/);
 assert.match(native,/ScreenCaptureService\.STOP/);
 assert.doesNotMatch(native,/case "screen_video":[\s\S]*?XRecorderBridge\.request\(this, "start"/);
 assert.match(main,/screenVideo\.setOnClickListener\(v -> beginScreen\(false\)\)/);
 assert.match(main,/else if \("screen_video"\.equals\(action\)\) \{\s+beginScreen\(false\)/);
 assert.match(main,/projection\.createScreenCaptureIntent\(\)/);
 assert.match(legacy,/recorder\.start\(\); recordingStarted = true/);
 assert.match(legacy,/savePath\("video\/mp4"\)/);
 assert.match(main,/beginScreen\(true\)/);
});
test('the old separate XREC overlay is not attached to the Bubbles window',()=>{
 assert.doesNotMatch(native,/\n\s*attachXRecorderButton\(\);/);
 assert.match(native,/Recording controls live in the Bubbles chat/);
 assert.match(native,/XRecorderBridge\.request\(this, "stop", main/);
});
test('Accessibility only interacts with installed original XRecorder package, never Android consent',()=>{
 assert.match(du,/videoeditor\.videorecorder\.screenrecorder/);
 assert.match(du,/getLaunchIntentForPackage\(PACKAGE\)/);
 assert.match(du,/BrainLearningService\.tapXRecorderControl\(wanted\)/);
 assert.match(du,/x_recorder_verified/);
 assert.match(access,/PACKAGE\.contentEquals\(root\.getPackageName\(\)\)/);
 assert.match(access,/node\.performAction\(AccessibilityNodeInfo\.ACTION_CLICK\)/);
 assert.match(access,/matches\.size\(\) != 1/);
 assert.match(access,/start recording\|start record/);
 assert.match(access,/stop recording\|stop record/);
 assert.doesNotMatch(du,/getMediaProjection\(|performGlobalAction\(|setComponent\(|startService\(/);
 assert.doesNotMatch(access,/performGlobalAction\(.*(?:APPROVE|ALLOW|PERMISSION)/);
 assert.match(manifest,/<package android:name="videoeditor\.videorecorder\.screenrecorder"\/>/);
});

test('XRecorder cannot silently compete with active Bubbles media projection or assume outcome',()=>{
 assert.match(du,/getBoolean\("capture_active", false\)/);
 assert.match(du,/MediaNotes\.active\(context\)/);
 assert.match(du,/Tap XRecorder's Stop control/);
 assert.match(du,/XRecorder couldn't open/);
 assert.match(du,/recordingVerified\(Context context\)/);
 assert.match(du,/xControlVisible/);
 assert.match(native,/XRecorderBridge\.recordingVerified\(this\)/);
});