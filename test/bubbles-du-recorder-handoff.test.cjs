'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dir='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=x=>fs.readFileSync(dir+x,'utf8');
const native=read('BubblesService.java');
const main=read('MainActivity.java');
const legacy=read('ScreenCaptureService.java');
const du=read('DuRecorderBridge.java');
const access=read('BrainLearningService.java');
const manifest=fs.readFileSync('android/bubbles-overlay/app/src/main/AndroidManifest.xml','utf8');

test('DU is selected for screen video commands; old recorder is blocked, screenshots remain',()=>{
 assert.match(native,/case "screen_video":\s+DuRecorderBridge\.request\(this, "start", main\)/);
 assert.match(native,/case "screen_stop":/);
 assert.match(native,/DuRecorderBridge\.request\(this, "stop", main\)/);
 assert.match(main,/screenVideo\.setOnClickListener\(v -> DuRecorderBridge\.request\(this, "start", ui\)\)/);
 assert.match(main,/if \(!image\) \{ DuRecorderBridge\.request\(this, "start", ui\); return; \}/);
 assert.match(main,/else if \("screen_video"\.equals\(action\)\) \{\s+DuRecorderBridge\.request\(this, "start", ui\)/);
 assert.match(legacy,/if \(!intent\.getBooleanExtra\("screenshot", false\)\)/);
 assert.match(legacy,/Bubbles native screen video is disabled/);
 assert.match(main,/beginScreen\(true\)/);
});

test('DU controls are available in one extra floating button with short and long press',()=>{
 assert.match(native,/duRecorderButton/);
 assert.match(native,/attachDuRecorderButton\(\)/);
 assert.match(native,/TYPE_APPLICATION_OVERLAY/);
 assert.match(native,/DuRecorderBridge\.request\(this, "toggle", main\)/);
 assert.match(native,/DuRecorderBridge\.request\(this, "stop", main\)/);
 assert.match(native,/removeView\(duRecorderButton\)/);
});

test('Accessibility only interacts with installed original DU package, never Android consent',()=>{
 assert.match(du,/com\.duapps\.recorder/);
 assert.match(du,/getLaunchIntentForPackage\(PACKAGE\)/);
 assert.match(du,/BrainLearningService\.tapDuRecorderControl\(action\)/);
 assert.match(du,/recording state not yet verified|automatic control was not verified/);
 assert.match(access,/PACKAGE\.contentEquals\(root\.getPackageName\(\)\)/);
 assert.match(access,/node\.performAction\(AccessibilityNodeInfo\.ACTION_CLICK\)/);
 assert.match(access,/matches\.size\(\) != 1/);
 assert.match(access,/start recording\|start record/);
 assert.match(access,/stop recording\|stop record/);
 assert.doesNotMatch(du,/getMediaProjection|performGlobalAction|MediaProjection|setComponent|startService\(/);
 assert.doesNotMatch(access,/performGlobalAction\(.*(?:APPROVE|ALLOW|PERMISSION)/);
 assert.match(manifest,/<package android:name="com\.duapps\.recorder"\/>/);
});

test('DU cannot silently compete with active Bubbles media projection or assume outcome',()=>{
 assert.match(du,/getBoolean\("capture_active", false\)/);
 assert.match(du,/MediaNotes\.active\(context\)/);
 assert.match(du,/DU stop button not accessible/);
 assert.match(du,/DU Recorder opened/);
 assert.match(du,/No recording started|no recording started/);
 assert.match(native,/Bubbles cannot prove DU is recording/);
});