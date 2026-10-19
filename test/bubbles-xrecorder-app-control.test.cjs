'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dir='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=name=>fs.readFileSync(dir+name,'utf8');
const service=read('BubblesService.java');
const activity=read('MainActivity.java');
const screen=read('ScreenCaptureService.java');
const manifest=fs.readFileSync('android/bubbles-overlay/app/src/main/AndroidManifest.xml','utf8');

test('single compact orb operates without an XRecorder overlay or installed recorder',()=>{
 assert.match(service,/normalOrbSize = Math\.round\(58f/);
 assert.match(service,/talking \? 78f : 58f/);
 assert.match(service,/resizeOrb\("speaking"\.equals\(name\)\)/);
 assert.doesNotMatch(service,/attachXRecorderButton|xRecorderButton|XRecorderBridge\.request/);
 assert.match(activity,/screenVideo\.setOnClickListener\(v -> beginScreen\(false\)\)/);
 assert.doesNotMatch(activity,/XRecorderBridge\.request/);
 assert.doesNotMatch(manifest,/com\.duapps\.recorder|videoeditor\.videorecorder\.screenrecorder/);
});

test('spoken record triggers native Android approval, never a forged recording receipt',()=>{
 assert.match(service,/case "screen_video":[\s\S]*?offerCaptureApproval\(command\)/);
 assert.match(activity,/startActivityForResult\(projection\.createScreenCaptureIntent\(\), SCREEN_REQUEST\)/);
 assert.match(screen,/getMediaProjection\(Activity\.RESULT_OK, consent\)/);
 assert.match(screen,/BubblesService\.beginScreenAudio\(\)/);
 assert.match(screen,/CapturePublisher\.publish\(this, completed, type\)/);
});

test('Android phone tool app launching keeps a narrow visible package scope',()=>{
 const apps=read('AppControlBridge.java');
 assert.match(apps,/Intent\.ACTION_MAIN/);
 assert.match(apps,/Intent\.CATEGORY_LAUNCHER/);
 assert.match(apps,/matched\.size\(\) != 1/);
 assert.match(apps,/getLaunchIntentForPackage/);
 assert.match(service,/AppControlBridge\.tryLaunch\(this, addressed\)/);
 assert.doesNotMatch(manifest,/QUERY_ALL_PACKAGES/);
});
