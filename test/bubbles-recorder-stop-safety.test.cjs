'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = 'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read = name => fs.readFileSync(root + name, 'utf8');

test('screen PCM outlives old five-minute limit without dropping voice recognition', () => {
  const pcm = read('VoiceRecording.java');
  const bubbles = read('BubblesService.java');
  assert.match(pcm, /fiveMinuteLimit = limitToFiveMinutes/);
  assert.match(pcm, /if \(fiveMinuteLimit && bytes \+ count \* 2L > 16000L \* 2 \* 300\)/);
  assert.match(bubbles, /screenAudio\.start\(new java\.io\.File\(service\.getFilesDir\(\), "captures"\), false\)/);
  assert.match(bubbles, /screenAudioPaused = true;[\s\S]*?ScreenCaptureService\.STOP/);
});

test('stop never runs Android recorder or microphone finalization on the UI thread', () => {
  const capture = read('ScreenCaptureService.java');
  const finish = capture.slice(capture.indexOf('private void finishCapture()'), capture.indexOf('@Override public IBinder onBind'));
  assert.match(finish, /if \(finished\) return;/);
  assert.match(finish, /finalizingMedia = true;/);
  assert.match(finish, /mediaExport\.execute\(\(\) -> \{/);
  assert.match(finish, /stoppingAudio\.finish\(\)/);
  assert.match(finish, /stoppingRecorder\.stop\(\)/);
  assert.ok(finish.indexOf('mediaExport.execute') < finish.indexOf('stoppingRecorder.stop()'));
  assert.match(capture, /if \(!finished \|\| finalizingMedia \|\| pendingPublications > 0\) return;/);
});

test('audio processing failure still saves recoverable screen video to Movies', () => {
  const capture = read('ScreenCaptureService.java');
  assert.match(capture, /try \{\s*SharedScreenAudioMuxer\.combine\(completed, audio\)/);
  assert.match(capture, /soundWarning = " · video only; microphone processing failed"/);
  assert.match(capture, /CapturePublisher\.publish\(this, completed, type\)/);
  assert.match(capture, /if \(audio != null && soundWarning\.isEmpty\(\)\) audio\.delete\(\)/);
  assert.match(capture, /unfinished file kept in Bubbles private storage/);
});
