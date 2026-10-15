'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = 'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const source = path => fs.readFileSync(root + path, 'utf8');

test('recorded sound is exported into Music and has a visible stop/save control', () => {
  const service = source('BubblesService.java');
  const recorder = source('VoiceRecording.java');
  assert.match(service, /CapturePublisher\.publish\(this, completed, "audio\/wav"\)/);
  assert.match(service, /Stop & save recording/);
  assert.match(service, /notification\(\)/);
  assert.match(service, /mediaPublish\.execute/);
  assert.match(recorder, /writeBytes\("RIFF"\)/);
  assert.match(service, /if \(completed == null\) return/); // Never report a phantom save.
});

test('screen capture is saved before foreground service shutdown', () => {
  const screen = source('ScreenCaptureService.java');
  assert.match(screen, /CapturePublisher\.publish\(this, completed, type\)/);
  assert.match(screen, /pendingPublications\+\+/);
  assert.match(screen, /if \(!finished \|\| pendingPublications > 0\) return/);
  assert.match(screen, /capture_active", false/);
  assert.match(screen, /stopIfPublished\(\)/);
});

test('Android media library is the actual destination, not only private app storage', () => {
  const publisher = source('CapturePublisher.java');
  assert.match(publisher, /MediaStore\.Audio\.Media\.EXTERNAL_CONTENT_URI/);
  assert.match(publisher, /MediaStore\.Video\.Media\.EXTERNAL_CONTENT_URI/);
  assert.match(publisher, /MediaStore\.Images\.Media\.EXTERNAL_CONTENT_URI/);
  assert.match(publisher, /MediaStore\.MediaColumns\.RELATIVE_PATH/);
  assert.match(publisher, /MediaStore\.MediaColumns\.IS_PENDING/);
  assert.match(publisher, /resolver\.update\(target, ready, null, null\)/);
  const activity = source('MainActivity.java');
  assert.match(activity, /CapturePublisher\.publish\(this, target, "video\/mp4"\)/);
});

test('natural spoken commands use real OS capture tools and consent instead of a fake AI success', () => {
  const service = source('BubblesService.java');
  const commands = source('VoiceCaptureCommands.java');
  assert.match(service, /VoiceCaptureCommands\.parse\(transcript\)/);
  assert.match(service, /heard\(transcript\)/);
  assert.match(service, /offerCaptureApproval\(command\)/);
  assert.match(service, /PendingIntent\.getActivity\(this, CAPTURE_APPROVAL_ID/);
  assert.match(service, /tap notification and approve Android dialog/);
  assert.match(commands, /"capture_stop"/);
  assert.match(commands, /"screen_video"/);
  assert.match(commands, /"camera_video"/);
});

test('floating QuantaPhi website composer passes screen capture to native Android instead of model', () => {
  const site = fs.readFileSync('bubbles-ai.js', 'utf8');
  const bridge = source('FloatingOracleWindow.java');
  assert.match(site, /nativeCaptureRequests\.push\(spoken\)/);
  assert.match(site, /nativeCaptureRequests\.shift\(\)/);
  assert.match(site, /drainNativeCaptureRequest/);
  assert.match(site, /Recording is NOT confirmed until the recorder status says ON/);
  assert.match(bridge, /VoiceCaptureCommands\.parse\(command\)/);
  assert.match(bridge, /BubblesService\.ACTION_TEXT/);
  assert.match(bridge, /drainNativeCaptureRequest/);
  assert.match(site, /(?:talk\|speak\|communicate\|connect\|link)/);
});

test('Android consent must be approved by the person, then the native app starts and stops itself',()=>{
  const activity=source('MainActivity.java');
  const service=source('BubblesService.java');
  assert.match(activity,/projection\.createScreenCaptureIntent\(\)/);
  assert.match(activity,/requestCode == SCREEN_REQUEST/);
  assert.match(activity,/if \(resultCode != RESULT_OK \|\| data == null\)/);
  assert.match(activity,/startForegroundService\(capture\)/);
  assert.match(service,/ScreenCaptureService\.STOP/);
  // Do not synthesize clicks on Android's protected MediaProjection consent.
  assert.doesNotMatch(service,/performGlobalAction\(.*(?:APPROVE|ALLOW)/);
});

test('native-to-web recorder state is authoritative and the stop control is contextual', () => {
  const site = fs.readFileSync('bubbles-ai.js', 'utf8');
  const floating = source('FloatingOracleWindow.java');
  const audio = source('BubblesService.java');
  const screen = source('ScreenCaptureService.java');
  assert.match(audio, /putBoolean\("audio_active", true\)/);
  assert.match(audio, /putBoolean\("audio_active", false\)/);
  assert.match(screen, /putBoolean\("capture_recording", true\)/);
  assert.match(screen, /putBoolean\("capture_recording", false\)/);
  assert.match(floating, /syncNativeCaptureStatus/);
  assert.match(floating, /getBoolean\("capture_active", false\)/);
  assert.match(floating, /getBoolean\("audio_active", false\)/);
  assert.match(site, /recorderStop\.hidden=!nativeRecordingActive/);
  assert.match(site, /nativeCaptureRequests\.push\('stop recording'\)/);
  assert.match(site, /ownerToolConnected:/);
  assert.match(floating, /Robot Brain: /);
  assert.doesNotMatch(floating, /performGlobalAction/);
});
