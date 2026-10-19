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

test('XRecorder is selected for screen video commands; old recorder is blocked, screenshots remain',()=>{
 assert.match(native,/case "screen_video":[\s\S]*?XRecorderBridge\.request\(this, "start", main, feedback/);
 assert.match(native,/case "screen_stop":/);
 assert.match(native,/XRecorderBridge\.request\(this, "stop", main\)/);
 assert.match(main,/screenVideo\.setOnClickListener\(v -> XRecorderBridge\.request\(this, "start", ui\)\)/);
 assert.match(main,/if \(!image\) \{ XRecorderBridge\.request\(this, "start", ui\); return; \}/);
 assert.match(main,/else if \("screen_video"\.equals\(action\)\) \{\s+XRecorderBridge\.request\(this, "start", ui\)/);
 assert.match(legacy,/if \(!intent\.getBooleanExtra\("screenshot", false\)\)/);
 assert.match(legacy,/Bubbles native screen video is disabled/);
 assert.match(main,/beginScreen\(true\)/);
});

test('XRecorder controls are available in one extra floating button with short and long press',()=>{
 assert.match(native,/xRecorderButton/);
 assert.match(native,/attachXRecorderButton\(\)/);
 assert.match(native,/TYPE_APPLICATION_OVERLAY/);
 assert.match(native,/XRecorderBridge\.request\(this, "toggle", main\)/);
 assert.match(native,/XRecorderBridge\.request\(this, "stop", main\)/);
 assert.match(native,/removeView\(xRecorderButton\)/);
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