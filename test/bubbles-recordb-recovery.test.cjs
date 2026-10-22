'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = 'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read = path => fs.readFileSync(root + path, 'utf8');

test('Android relaunch scans private MP4 originals without blocking UI or creating a microphone', () => {
  const home = read('MainActivity.java');
  const recovery = read('CaptureRecovery.java');
  assert.match(home, /CaptureRecovery\.recover\(this\)/);
  assert.match(recovery, /new Thread\(\(\) -> \{/);
  assert.match(recovery, /ScreenCaptureService\.isRunning\(\)/);
  assert.match(recovery, /Math\.min\(12, candidates\.length\)/);
  assert.match(recovery, /screen-\[0-9\]/);
  assert.doesNotMatch(recovery, /new AudioRecord|new MediaRecorder|delete\(/);
});

test('only finalized and not-yet-published videos enter the phone library', () => {
  const recovery = read('CaptureRecovery.java');
  const publisher = read('CapturePublisher.java');
  assert.match(recovery, /MediaExtractor/);
  assert.match(recovery, /mime\.startsWith\("video\/"\)/);
  assert.match(recovery, /extractor\.getSampleTime\(\) >= 0/);
  assert.match(recovery, /alreadyPublished\(app\.getContentResolver\(\), video\.getName\(\)\)/);
  assert.match(recovery, /MediaStore\.MediaColumns\.IS_PENDING/);
  assert.match(recovery, /CapturePublisher\.publish\(app, video, "video\/mp4"\)/);
  assert.match(publisher, /resolver\.update\(target, ready, null, null\)/);
});

test('recording starts with durable private path and retains successful media receipt', () => {
  const screen = read('ScreenCaptureService.java');
  assert.match(screen, /putString\("capture_path", file\.getAbsolutePath\(\)\)/);
  assert.match(screen, /putString\("capture_type", "video\/mp4"\)\.remove\("capture_uri"\)/);
  assert.match(screen, /putString\("capture_published_path", completed\.getAbsolutePath\(\)\)/);
  assert.match(screen, /mediaExport\.execute\(\(\) -> \{/);
});

test('large history picker cannot contend with active Android video export', () => {
  const voice = read('BubblesService.java');
  const web = read('FloatingOracleWindow.java');
  assert.match(voice, /if \(historyJson && ScreenCaptureService\.isRunning\(\)\)/);
  assert.match(voice, /callback\.onReceiveValue\(null\)/);
  assert.match(web, /service\.openFilePicker\(callback, historyJson\)/);
});


test('RecordB tap retains a short speech follow-up without disabling background-audio protection', () => {
  const voice = read('BubblesService.java');
  const gate = read('SpeechSourceGate.java');
  assert.match(voice, /VoiceCaptureCommands\.parse\(text\)/);
  assert.match(voice, /activeUntil = now \+ 30000L/);
  assert.match(voice, /boolean recentRecordBFollowup = !typed && now < activeUntil/);
  assert.match(voice, /ScreenCaptureService\.isRunning\(\)/);
  assert.match(voice, /directed \|\| suffixCapture \|\| recentRecordBFollowup/);
  assert.match(gate, /typed \|\| !phonePlaybackActive \|\| directlyAddressed/);
});
