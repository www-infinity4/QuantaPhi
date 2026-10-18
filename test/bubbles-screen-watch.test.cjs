'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=name=>fs.readFileSync(root+name,'utf8');

test('owner-enabled visual watch has no arbitrary session expiration',()=>{
 const watch=read('ScreenWatchSession.java');
 const service=read('BubblesService.java');
 assert.doesNotMatch(watch,/MAX_DURATION_MS|now - startedAt </);
 assert.match(watch,/boolean isActive\(long now\) \{ return active; \}/);
 assert.match(watch,/VISUAL_INTERVAL_MS/);
 assert.match(watch,/observeVisual\(/);
 assert.match(service,/screen_watch_enabled/);
 assert.match(service,/BrainLearningService\.watchFrame\(/);
 assert.match(service,/screenWatch\.recentVisual/);
 assert.match(service,/startScreenWatch\(\)/);
 assert.match(service,/stopScreenWatch\(\)/);
 assert.doesNotMatch(service,/Screen watch ON for up to five minutes/);
});

test('changed screen screenshots reach visual model without blocking voice',()=>{
 const learning=read('BrainLearningService.java');
 const visual=read('ScreenVision.java');
 const service=read('BubblesService.java');
 assert.match(learning,/takeScreenshot\(Display\.DEFAULT_DISPLAY/);
 assert.match(learning,/ScreenVision\.describe\(pixels,/);
 assert.match(learning,/screenWorker\.execute\(/);
 assert.match(learning,/lastWatchFingerprint/);
 assert.match(service,/watchVisionInFlight/);
 assert.match(service,/screenWatch\.observeVisual\(/);
 assert.match(visual,/\.put\("image", image\)/);
 assert.match(service,/oracleWindow\.sendScreenEvidence\(addressed, evidence, false\)/);
 assert.match(service,/ACTION_STOP_SCREEN_WATCH/);
});

test('no credentialless projection-token reuse or fake RTSP streaming claim',()=>{
 const frame=read('BrainLearningService.java');
 const watch=read('ScreenWatchSession.java');
 assert.doesNotMatch(frame,/createVirtualDisplay|getMediaProjection|localhost:8554/);
 assert.doesNotMatch(watch,/MediaProjection|HttpURLConnection|Socket/);
 assert.match(read('ScreenCaptureService.java'),/projection\.registerCallback/);
});
