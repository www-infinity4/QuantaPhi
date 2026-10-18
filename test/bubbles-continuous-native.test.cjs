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
  assert.match(source, /if \(SystemClock\.elapsedRealtime\(\) < echoQuietUntil\) \{/);
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

test('ordinary spoken work uses the shared website without a native ticket handoff', () => {
  assert.match(source, /oracleWindow != null && oracleWindow\.sendSpoken\(addressed, ambientContext\)/);
  assert.match(source, /RoomContextFusion\.forTurn\(this, addressed\)/);
  assert.doesNotMatch(source, /appendQueryParameter\("workRequest", addressed\)/);
  const route=source.slice(source.indexOf('// Use the SAME QuantaPhi website assistant'),source.indexOf('private void offerCaptureApproval'));
  assert.doesNotMatch(route, /askOracle\(addressed\)/);
});
test('TTS callback loss has a bounded recovery and diagnostics preserve replies', () => {
  assert.match(source, /generation == speechGeneration/);
  assert.match(source, /tts\.stop\(\);\s*finishSpeaking\(utterance\)/);
  assert.match(source, /!id\.equals\(activeUtteranceId\)/);
  assert.match(source, /putString\("last_heard", text\)/);
  assert.match(source, /putString\("last_reply", result\)/);
});


test('Android TTS engine callbacks cannot activate a replaced engine', () => {
  assert.match(source, /final long engineGeneration = \+\+ttsEngineGeneration/);
  assert.match(source, /engineGeneration != ttsEngineGeneration \|\| tts == null/);
  assert.match(source, /result != TextToSpeech\.SUCCESS/);
  assert.match(source, /Android speech engine could not initialize/);
  assert.match(source, /pendingWebsiteSpeech\.clear\(\)/);
});
test('Android speech playback errors release busy and retain visible diagnostics', () => {
  const speak = source.slice(source.indexOf('private void speak(String response)'), source.indexOf('@Override public IBinder'));
  assert.match(speak, /try \{[\s\S]*?tts\.speak\(response/);
  assert.match(speak, /if \(result == TextToSpeech\.ERROR\) \{[\s\S]*?finishSpeaking\(utterance\)/);
  assert.match(speak, /catch \(RuntimeException error\) \{[\s\S]*?finishSpeaking\(utterance\)/);
  assert.match(speak, /Android speech playback failed:/);
});

test('Bubbles exposes listening first and hides optional recording controls until requested', () => {
  if (local) return;
  const ui = fs.readFileSync(path.join(root, 'app/src/main/java/org/quantaphi/bubbles/MainActivity.java'), 'utf8');
  assert.ok(ui.indexOf('Button connect =') < ui.indexOf('Button chatgptLogin ='));
  assert.ok(ui.indexOf('TextView voiceStatus =') < ui.indexOf('Button advancedToggle ='));
  assert.match(ui, /advancedCapture\.setVisibility\(View\.GONE\)/);
  assert.match(ui, /brainSettings\.setVisibility\(View\.GONE\)/);
  assert.match(ui, /More: recording, camera and screen tools/);
  assert.match(ui, /Listening is not the same as saving an audio recording/);
});
test('AI and voice failure status captures a useful reason rather than only an exception type', () => {
  assert.match(source, /Oracle response status/);
  assert.match(source, /putString\("last_error", problem\)/);
  assert.match(source, /Offline voice model failed to load/);
  assert.match(source, /Microphone start failed:/);
});

test('offline speech requires microphone energy and drops long code-like loops', () => {
  if (local) return;
  const gate=fs.readFileSync(path.join(root,'app/src/main/java/org/quantaphi/bubbles/SpeechTranscriptGate.java'),'utf8');
  assert.match(gate,/voicedMillis < 320L/);
  assert.match(gate,/repeats >= 4/);
  assert.match(gate,/\[0-9a-f\]\{32,\}/);
  assert.match(source,/SpeechTranscriptGate\.plausible\(transcript, voicedMillis\)/);
  assert.match(source,/energyEvidence\.reset\(\)/);
  assert.match(source,/energyEvidence\.observe\(level, count\)/);
  assert.match(source,/energyEvidence\.takeVoicedMillis\(\)/);
});

test('continuous foreground microphone accepts real speech without wake-word cutoff', () => {
  const start=source.indexOf('private void heard(String raw, boolean typed)');
  const end=source.indexOf('private void offerCaptureApproval',start);
  const heard=source.slice(start,end);
  assert.match(source,/SpeechTranscriptGate\.plausible\(transcript, voicedMillis\)/);
  assert.doesNotMatch(heard,/voiceFollowups > MAX_VOICE_FOLLOWUPS/);
  assert.doesNotMatch(heard,/now >= activeUntil/);
  assert.match(heard,/putString\("last_heard", text\)/);
  assert.match(source,/heard\(text, true\)/);
});
test('speech stops on sustained human interruption rather than a mic button', () => {
  assert.match(source,/AcousticEchoCanceler\.isAvailable\(\)/);
  assert.match(source,/if \(interruptionFrames >= 5\)/);
  assert.match(source,/silenceReply\(\);[\s\S]*?echoQuietUntil = SystemClock\.elapsedRealtime\(\) \+ 120L/);
});

test('Android WebView cannot activate a second browser microphone', () => {
  if(local)return;
  const site=fs.readFileSync(path.join(root,'../../bubbles-ai.js'),'utf8');
  assert.match(site,/async function startVoice\(\)\{[\s\S]*?if\(nativeOverlay\)\{/);
  assert.match(site,/function heardTranscript\(transcript\)\{[\s\S]*?if\(nativeOverlay\|\|!voiceEnabled/);
});

test('a short orb tap resumes recognition after long-press mute', () => {
  const tap = source.slice(source.indexOf('@Override public boolean onTouchEvent(MotionEvent e)'));
  assert.match(tap, /if\s*\(muted\)\s*resumeSession\(\);/);
  assert.ok(tap.indexOf('if (muted) resumeSession();') < tap.indexOf('activeUntil = SystemClock.elapsedRealtime() + 30000L'));
  assert.match(source, /private void resumeSession\(\)[\s\S]*?muted = false;[\s\S]*?beginListening\(\);/);
});
