const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const service=fs.readFileSync(root+'BubblesService.java','utf8');
const fusion=fs.readFileSync(root+'RoomContextFusion.java','utf8');
const room=fs.readFileSync(root+'RoomNotes.java','utf8');
const window=fs.readFileSync(root+'FloatingOracleWindow.java','utf8');
const ui=fs.readFileSync(root+'MainActivity.java','utf8');
const web=fs.readFileSync('bubbles-ai.js','utf8');

test('three lanes share one microphone, room speech cannot dispatch jobs',()=>{
 assert.match(service,/new AudioRecord\(MediaRecorder\.AudioSource\.VOICE_RECOGNITION/);
 const route=service.slice(service.indexOf('if (!typed && RoomNotes.enabled(this)'),service.indexOf('String addressed ='));
 assert.match(route,/RoomNotes\.add\(this, text\)/);
 assert.match(route,/return;/);
 assert.doesNotMatch(route,/sendSpoken|sendTyped|submitWork/);
 assert.match(service,/RoomContextFusion\.forTurn\(this, addressed\)/);
 assert.match(service,/oracleWindow\.sendSpoken\(addressed, ambientContext\)/);
 assert.match(window,/new QueuedMessage\(safeText, safeEvidence\)/);
 assert.match(window,/JSONObject\.quote\(item\.evidence\)/);
});

test('room context needs its own consent, bounded freshness and shared terms',()=>{
 assert.match(fusion,/getBoolean\(ENABLED, false\)/);
 assert.match(fusion,/RoomNotes\.enabled\(context\)/);
 assert.match(fusion,/120000L/);
 assert.match(fusion,/selected\.size\(\) < 2/);
 assert.match(fusion,/ownerTerms\.contains\(word\)/);
 assert.match(room,/freshCandidateTexts/);
 assert.match(ui,/Enable Room Context Bridge/);
 assert.match(ui,/Stop Room Context Bridge/);
 assert.match(ui,/RoomContextFusion\.setEnabled\(this, true\)/);
 assert.match(room,/putBoolean\(RoomContextFusion\.ENABLED,/);
});

test('website separates microphone evidence from owner intent and reports real phase',()=>{
 assert.match(web,/BUBBLES_ROOM_CONTEXT_V1/);
 assert.match(web,/let roomContext=/);
 assert.match(web,/untrusted ambient microphone or eligible phone playback observations/);
 assert.match(web,/nativePhaseNotice='Working on that\.'/);
 assert.match(web,/const notice=nativePhaseNotice/);
 assert.match(web,/nativePhaseNotice='';/);
 // Observation is still carried in evidence, not appended to the owner command.
 assert.match(web,/startNativeTurn\(value,true,messageId,evidence\)/);
});
