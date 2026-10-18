const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const p='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=n=>fs.readFileSync(p+n,'utf8');
const media=read('PhonePlaybackService.java');
const notes=read('MediaNotes.java');
const mic=read('BubblesService.java');
const room=read('RoomContextFusion.java');
const main=read('MainActivity.java');
const manifest=fs.readFileSync('android/bubbles-overlay/app/src/main/AndroidManifest.xml','utf8');

test('playback audio requires MediaProjection user consent, foreground service and stop action',()=>{
 assert.match(main,/createScreenCaptureIntent\(\)/);
 assert.match(main,/PHONE_AUDIO_REQUEST/);
 assert.match(main,/PhonePlaybackService\.class/);
 assert.match(media,/getMediaProjection\(Activity\.RESULT_OK, consent\)/);
 assert.match(media,/setAudioPlaybackCaptureConfig\(capture\)/);
 assert.match(media,/addMatchingUsage\(AudioAttributes\.USAGE_MEDIA\)/);
 assert.match(media,/excludeUid\(getApplicationInfo\(\)\.uid\)/);
 assert.match(media,/startForeground\(NOTIFY_ID, status, ServiceInfo\.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION\)/);
 assert.match(media,/onStop\(\)/);
 assert.match(media,/STOP =/);
 assert.match(manifest,/PhonePlaybackService.*foregroundServiceType="mediaProjection"/);
 assert.doesNotMatch(media,/AudioSource\.MIC|MediaRecorder\.AudioSource|new AudioRecord\(MediaRecorder/);
 assert.doesNotMatch(media,/postDelayed.*300000|MAX_DURATION/);
});

test('phone audio and owner mic stay separate until explicitly consented third context',()=>{
 assert.match(media,/MediaNotes\.add\(this, text\)/);
 assert.match(notes,/getBoolean\(ACTIVE, false\)/);
 assert.match(notes,/Phone playback: /);
 assert.match(room,/MediaNotes\.freshCandidateTexts/);
 assert.match(room,/getBoolean\(ENABLED, false\)/);
 assert.match(mic,/RoomContextFusion\.forTurn\(this, addressed\)/);
 assert.match(media,/BubblesService\.borrowVoiceModel\(\)/);
 assert.match(media,/BubblesService\.releaseVoiceModel\(model\)/);
 assert.match(mic,/deferredVoiceModel/);
 assert.match(main,/Listen to phone app audio/);
 assert.match(main,/Stop phone app audio/);
 assert.match(main,/Review phone audio transcripts/);
});
