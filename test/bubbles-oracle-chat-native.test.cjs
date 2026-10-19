const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles');
const service = fs.readFileSync(path.join(root, 'BubblesService.java'), 'utf8');
const chat = fs.readFileSync(path.join(root, 'OracleChatActivity.java'), 'utf8');
const manifest = fs.readFileSync(path.join(root, '../../../..', 'AndroidManifest.xml'), 'utf8');
const gradle = fs.readFileSync(path.join(root, '../../../../../../', 'build.gradle'), 'utf8');

test('tap interrupts TTS immediately then opens a dedicated Oracle text window', () => {
  assert.match(service, /if \(speaking\) silenceReply\(\);/);
  assert.match(service, /new FloatingOracleWindow\(BubblesService\.this, manager\)/);
  assert.match(service, /private void silenceReply\(\)/);
  assert.match(service, /tts\.stop\(\)/);
  assert.match(service, /ACTION_STOP_SPEAKING/);
  assert.match(service, /ACTION_RESUME/);
  assert.match(manifest, /android:name="\.OracleChatActivity" android:exported="false"/);
});

test('legacy entry opens the same website window and preserves prior local history', () => {
  assert.doesNotMatch(chat, /new EditText|setContentView/);
  assert.match(chat, /ACTION_OPEN_CHAT/);
  assert.match(chat, /oracle_chat_history/);
  assert.match(chat, /Math\.max\(0, history\.length\(\) - 30\)/);
  assert.match(chat, /BubblesService.isSessionRunning/);
  assert.match(service, /speechSuppressed = true; \/\/ Typed questions/);
  assert.match(service, /OracleChatActivity\.append\(this, "You", userRequest\)/);
  assert.match(service, /OracleChatActivity\.append\(this, "Oracle", result\)/);
  assert.match(service, /if \(!speechSuppressed && !quietRequest\) speak\(result\);/);
});

test('preview five installs separately when old package signer changed', () => {
  assert.match(gradle, /versionCode 37/);
  assert.match(gradle, /versionName '0\.37\.0'/);
  assert.match(gradle, /applicationIdSuffix '\.preview5'/);
});
