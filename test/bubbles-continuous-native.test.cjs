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
  assert.doesNotMatch(speak, /stopRecognition\(|microphone\.(?:stop|release)\(/);
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

test('ticket handoff matches explicit commands and does not embed credentials', () => {
  const literal = source.match(/addressed\.matches\(("(?:[^"\\]|\\.)*")\)/)[1];
  const javaPattern = JSON.parse(literal);
  const pattern = new RegExp(javaPattern.replace('(?i)', ''), 'i');
  for (const command of ['create a work ticket to publish the APK', 'please make a ticket for Bubbles', 'submit ticket to fix voice']) assert.ok(pattern.test(command), command);
  for (const phrase of ['what is a work ticket', 'do not create a work ticket', 'hello']) assert.ok(!pattern.test(phrase), phrase);
  const handoff = source.slice(source.indexOf('if (addressed.matches'), source.indexOf('askOracle(addressed);'));
  assert.match(handoff, /appendQueryParameter\("workRequest", addressed\)/);
  assert.doesNotMatch(handoff, /Authorization|ownerToken|work\/tickets\/create/);
});
test('TTS callback loss has a bounded recovery and diagnostics preserve replies', () => {
  assert.match(source, /generation == speechGeneration/);
  assert.match(source, /tts\.stop\(\);\s*finishSpeaking\(\)/);
  assert.match(source, /putString\("last_heard", text\)/);
  assert.match(source, /putString\("last_reply", result\)/);
});
