'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const root='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read=name=>fs.readFileSync(root+name,'utf8');

test('screen watching is explicit, bounded, local, and not an RTSP claim',()=>{
 const native=read('BubblesService.java');
 const watch=read('ScreenWatchSession.java');
 const bridge=read('BrainLearningService.java');
 assert.match(native,/startScreenWatch\(\)/);
 assert.match(native,/stopScreenWatch\(\)/);
 assert.match(native,/ACTION_STOP_SCREEN_WATCH/);
 assert.match(native,/Screen watch ON for up to five minutes/);
 assert.match(native,/BrainLearningService\.currentVisibleText\(\)/);
 assert.match(native,/Recent locally sampled visible text/);
 assert.match(watch,/MAX_DURATION_MS = 300_000L/);
 assert.match(watch,/SAMPLE_INTERVAL_MS = 2_000L/);
 assert.match(watch,/latest = ""/);
 assert.match(bridge,/if\(!node\.isVisibleToUser\(\) \|\| node\.isPassword\(\) \|\| node\.isEditable\(\)\)return/);
 assert.doesNotMatch(watch,/HttpURLConnection|Socket|MediaProjection|FileOutputStream/);
});
test('vision snapshots are sent to model only for explicit questions and not continuously',()=>{
 const native=read('BubblesService.java');
 const service=read('BrainLearningService.java');
 assert.match(native,/screenSharing \|\| ScreenAwareness\.refersToScreen\(addressed\)/);
 assert.match(native,/sendScreenEvidence\(question, evidence, typed\)/);
 assert.match(service,/if \(!question\.isEmpty\(\)\) visual = ScreenVision\.describe\(pixels, question\)/);
});
