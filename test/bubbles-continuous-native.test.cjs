const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = process.env.BUBBLES_SOURCE_ROOT || path.join(__dirname, '../android/bubbles-overlay');
const local = process.env.BUBBLES_LOCAL === '1';
const source = fs.readFileSync(path.join(root, local ? 'BubblesService.java' : 'app/src/main/java/org/quantaphi/bubbles/BubblesService.java'), 'utf8');
const gradle = fs.readFileSync(path.join(root, local ? 'build.gradle' : 'app/build.gradle'), 'utf8');
test('continuous microphone replaces restart-driven platform recognition', () => {
  assert.match(source, /new AudioRecord/);
  assert.match(source, /while \(captureRunning && connected && !muted\)/);
  assert.doesNotMatch(source, /SpeechRecognizer|scheduleRestart|RecognizerIntent/);
  assert.equal((source.match(/input\.startRecording\(\)/g)||[]).length, 1);
});
test('speaking does not stop microphone capture; echo is discarded locally', () => {
  const speak = source.slice(source.indexOf('private void speak('), source.indexOf('@Override public IBinder'));
  assert.doesNotMatch(speak, /stopRecognition\(|\.stop\(|\.release\(/);
  assert.match(source, /if \(speaking\) \{[\s\S]*?speech\.reset\(\);[\s\S]*?continue;/);
});
test('explicit mute and service stop release microphone', () => {
  assert.match(source, /private void muteSession\(\) \{[\s\S]*?stopRecognition\(\)/);
  assert.match(source, /microphone\.stop\(\)/);
  assert.match(source, /microphone\.release\(\)/);
  assert.match(source, /ACTION_STOP/);
});
test('offline model bundled and versions pinned', () => {
  assert.match(gradle, /vosk-android:0\.3\.75@aar/);
  assert.match(gradle, /vosk-model-small-en-us-0\.15\.zip/);
  assert.match(gradle, /Unsafe voice model path/);
  assert.match(gradle, /dependsOn\('prepareOfflineVoice'\)/);
});
test('movement uses full drag distance and clamps to screen', () => {
  assert.match(source, /Gravity.TOP \| Gravity.LEFT/);
  assert.match(source, /startX\+Math.round\(dx\)/);
  assert.match(source, /screen.widthPixels-getWidth\(\)/);
  assert.match(source, /if\(!moved\)/);
});
