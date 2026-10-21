'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '../android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('voice picker enumerates installed voices and plays a local sample', () => {
  const picker = read('BubblesVoicePicker.java');
  assert.match(picker, /new TextToSpeech\(activity/);
  assert.match(picker, /preview\.getVoices\(\)/);
  assert.match(picker, /preview\.setVoice\(voice\)/);
  assert.match(picker, /preview\.speak\(/);
  assert.match(picker, /preview\.shutdown\(\)/);
  assert.match(picker, /getSharedPreferences\(PREFS, Activity\.MODE_PRIVATE\)/);
  assert.match(picker, /\.putString\(VOICE_NAME, name\)/);
  assert.match(picker, /\.putString\(ENGINE, engine == null/);
});

test('changing the voice reloads Bubbles TTS without reauthorizing microphone', () => {
  const service = read('BubblesService.java');
  const main = read('MainActivity.java');
  assert.match(service, /ACTION_REFRESH_VOICE/);
  assert.match(service, /if \(connected\) \{\s*silenceReply\(\);\s*reloadSpeechEngine\(\)/);
  // An explicitly selected TTS engine takes precedence over Android's default.
  assert.match(service, /if \(!savedName\.isEmpty\(\) && savedEngine\.equals\(selectedEngine == null \? tts\.getDefaultEngine\(\) : selectedEngine\)\)/);
  assert.match(service, /tts\.setVoice\(voice\)/);
  assert.match(service, /tts\.setLanguage\(Locale\.US\)/);
  assert.match(main, /BubblesVoicePicker\.show\(this, state::setText\)/);
  // MainActivity uses the installed-voice picker; it no longer requires an
  // unrelated Android Settings activity merely to refresh the chosen voice.
});

test('voice samples are local and do not introduce a new voice provider network call', () => {
  const picker = read('BubblesVoicePicker.java');
  assert.doesNotMatch(picker, /HttpURLConnection|api\.openai\.com|fetch\(/);
  assert.match(picker, /if \(preview == null\) return/);
});
