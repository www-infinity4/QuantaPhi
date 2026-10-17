const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const service=fs.readFileSync(root+'BubblesService.java','utf8');
const page=fs.readFileSync(root+'MainActivity.java','utf8');
const room=fs.readFileSync(root+'RoomNotes.java','utf8');

test('room mic notes are opt-in and the main AI never receives unaddressed room speech',()=>{
 assert.match(service,/ACTION_SYNC_ROOM/);
 assert.match(service,/if \(!typed && RoomNotes\.enabled\(this\) && !directed\)/);
 const route=service.slice(service.indexOf('if (!typed && RoomNotes.enabled(this)'),service.indexOf('String addressed =',service.indexOf('if (!typed && RoomNotes.enabled(this)')));
 assert.match(route,/RoomNotes\.add\(this, text\)/);
 assert.match(route,/state\("room"/);
 assert.match(route,/return;/);
 assert.match(route,/phonePlayback/);
 assert.doesNotMatch(route,/oracleWindow\.sendSpoken|submitWork|askOracle/);
 assert.match(service,/manager\.addView\(view, params\)/);
 assert.match(service,/manager\.removeView\(roomBubble\)/);
});

test('room recorder is text-only local, bounded and explicitly consented to',()=>{
 assert.match(room,/getBoolean\(ENABLED, false\)/);
 assert.match(room,/Math\.max\(0, old\.length\(\) - 29\)/);
 assert.match(room,/if \(text\.length\(\) > 220\)/);
 assert.match(room,/prefs\.edit\(\)\.putString\(LOG/);
 assert.doesNotMatch(room,/fetch\(|HttpURLConnection|URL\(|AudioRecord|MediaRecorder/);
 assert.match(page,/Obtain consent from anyone being recorded/);
 assert.match(page,/setPositiveButton\("Enable Room Notes"/);
 assert.match(page,/RoomNotes\.setEnabled\(this, false\)/);
 assert.match(page,/RoomNotes\.recent\(this\)/);
 assert.match(page,/RoomNotes\.clear\(this\)/);
});

test('app stays one native microphone and preserves the original screen+sound recorder',()=>{
 const capture=fs.readFileSync(root+'ScreenCaptureService.java','utf8');
 assert.match(service,/new AudioRecord\(MediaRecorder\.AudioSource\.VOICE_RECOGNITION/);
 assert.doesNotMatch(capture,/setAudioSource\(/);
 assert.match(capture,/BubblesService\.beginScreenAudio\(\)/);
 assert.match(capture,/recorder\.setVideoSource\(MediaRecorder\.VideoSource\.SURFACE\)/);
});
