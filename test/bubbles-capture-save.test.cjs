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
