const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=name=>fs.readFileSync(root+name,'utf8');

test('phone media playback cannot silently become a Bubbles chat or code job',()=>{
 const source=read('BubblesService.java');
 const playback=read('PlaybackAwareness.java');
 assert.match(source,/new PlaybackAwareness\(this, main\)/);
 assert.match(source,/SpeechSourceGate\.mayDispatch\(typed,/);
 assert.match(source,/playbackAwareness\.mediaPlaying\(\)/);
 assert.match(source,/if \(playbackAwareness != null\) \{ playbackAwareness\.close\(\)/);
 assert.match(playback,/registerAudioPlaybackCallback/);
 assert.match(playback,/USAGE_MEDIA/);
 assert.match(playback,/USAGE_GAME/);
 assert.match(playback,/unregisterAudioPlaybackCallback/);
});

test('native Bubbles screen capture retains microphone sound and MP4 editor',()=>{
 const screen=read('ScreenCaptureService.java');
 const editor=read('CaptureClipEditor.java');
 const ui=read('MainActivity.java');
 assert.match(screen,/recorder\.setAudioSource\(MediaRecorder\.AudioSource\.MIC\)/);
 assert.match(screen,/recorder\.setVideoSource\(MediaRecorder\.VideoSource\.SURFACE\)/);
 assert.match(screen,/CapturePublisher\.publish\(this, completed, type\)/);
 assert.match(editor,/MediaExtractor/);
 assert.match(editor,/MediaMuxer/);
 assert.match(editor,/MediaExtractor\.SEEK_TO_PREVIOUS_SYNC/);
 assert.match(editor,/videoFrames == 0/);
 assert.match(ui,/CaptureClipEditor\.trim\(source, clip, from, until\)/);
 assert.match(ui,/CapturePublisher\.publish\(this, clip, "video\/mp4"\)/);
 assert.match(ui,/Original recording is preserved/);
 assert.match(ui,/clip\.getCanonicalPath\(\)|source\.getCanonicalPath\(\)\.startsWith\(prefix\)/);
});
