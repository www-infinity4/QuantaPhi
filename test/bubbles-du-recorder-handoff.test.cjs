'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const dir='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=name=>fs.readFileSync(dir+name,'utf8');
const service=read('BubblesService.java');
const activity=read('MainActivity.java');
const screen=read('ScreenCaptureService.java');
const mux=read('SharedScreenAudioMuxer.java');

test('native recorder replaces proprietary X and DU launch workflow',()=>{
 assert.match(service,/case "screen_video":[\s\S]*?offerCaptureApproval\(command\)/);
 assert.match(activity,/else if \("screen_video"\.equals\(action\)\) \{\s+screenIntervalSeconds = 0; screenDurationSeconds = 0; beginScreen\(false\)/);
 assert.match(activity,/screenshot = image/);
 assert.match(screen,/recorder\.setVideoSource\(MediaRecorder\.VideoSource\.SURFACE\)/);
 assert.doesNotMatch(screen,/Bubbles native screen video is disabled/);
 assert.doesNotMatch(service,/XRecorderBridge\.request|attachXRecorderButton/);
});

test('native recorder saves a single audio/video MP4 and retains failures',()=>{
 assert.match(screen,/MediaProjectionManager/);
 assert.match(screen,/Screen sharing was not approved/);
 assert.match(screen,/sharedAudio = BubblesService\.beginScreenAudio\(\)/);
 assert.match(screen,/SharedScreenAudioMuxer\.combine\(completed, audio\)/);
 assert.match(screen,/CapturePublisher\.publish\(this, completed, type\)/);
 assert.match(screen,/original remains in Bubbles private storage/);
 assert.match(mux,/copy\(picture, mux, v, outV\)/);
 assert.match(mux,/input\.getTrackFormat\(sourceTrack\)/);
});

test('stop targets native capture and audio ducking does not touch PCM stream',()=>{
 assert.match(service,/ScreenCaptureService\.STOP/);
 assert.match(service,/AudioManager\.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK/);
 assert.match(service,/restoreExternalPlayback\(\)/);
 assert.match(service,/screenAudio\.append\(samples, count\)/);
 assert.doesNotMatch(service,/xRecorderButton/);
});
