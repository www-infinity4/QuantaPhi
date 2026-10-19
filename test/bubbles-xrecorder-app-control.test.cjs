'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const prefix='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=name=>fs.readFileSync(prefix+name,'utf8');
const service=read('BubblesService.java');
const recorder=read('XRecorderBridge.java');
const a11y=read('BrainLearningService.java');
const apps=read('AppControlBridge.java');
const voice=read('VoiceCaptureCommands.java');
const activity=read('MainActivity.java');
const manifest=fs.readFileSync('android/bubbles-overlay/app/src/main/AndroidManifest.xml','utf8');
const web=fs.readFileSync('bubbles-ai.js','utf8');
const floating=read('FloatingOracleWindow.java');

test('spoken record Bubbles uses in-app capture and does not add a second floating button',()=>{
 assert.match(voice,/record\|start recording\|stop recording\|stop\|save\) bubbles/);
 assert.match(service,/case "screen_video":[\s\S]*?offerCaptureApproval\(command\)/);
 assert.match(service,/orbSizePx\("speaking"\.equals\(newState\)\)/);
 assert.doesNotMatch(service,/attachXRecorderButton\(\)/);
 assert.doesNotMatch(service,/manager\.addView\(button, layout\)/);
 assert.match(activity,/screenVideo\.setOnClickListener\(v -> beginScreen\(false\)\)/);
 assert.match(floating,/captureState\.put\("screenActive"/);
 assert.match(manifest,/android:name="\.ScreenCaptureService"/);
});

test('only XRecorder owned, unambiguous labeled accessibility controls are tapped',()=>{
 assert.match(recorder,/videoeditor\.videorecorder\.screenrecorder/);
 assert.match(recorder,/BrainLearningService\.tapXRecorderControl\(wanted\)/);
 assert.match(recorder,/BrainLearningService\.xControlVisible/);
 assert.match(recorder,/putBoolean\("x_recorder_verified", verified\)/);
 assert.match(a11y,/XRecorderBridge\.PACKAGE\.contentEquals\(root\.getPackageName\(\)\)/);
 assert.match(a11y,/matches\.size\(\) != 1/);
 assert.match(a11y,/node\.performAction\(AccessibilityNodeInfo\.ACTION_CLICK\)/);
 assert.match(manifest,/<package android:name="videoeditor\.videorecorder\.screenrecorder"\/>/);
 assert.doesNotMatch(recorder,/getMediaProjection\(|performGlobalAction\(|startService\(/);
});

test('explicit owner command opens matching launchable Android app without broad device visibility',()=>{
 assert.match(apps,/Intent\.ACTION_MAIN/);
 assert.match(apps,/Intent\.CATEGORY_LAUNCHER/);
 assert.match(apps,/queryIntentActivities\(query, 0\)/);
 assert.match(apps,/matched\.size\(\) != 1/);
 assert.match(apps,/getLaunchIntentForPackage/);
 assert.match(apps,/Requested .*Check the foreground screen to confirm/);
 assert.match(service,/AppControlBridge\.tryLaunch\(this, addressed\)/);
 assert.match(manifest,/android\.intent\.category\.LAUNCHER/);
 assert.doesNotMatch(manifest,/QUERY_ALL_PACKAGES/);
});
