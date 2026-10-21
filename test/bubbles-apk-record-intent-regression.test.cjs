'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const java='android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const source=name=>fs.readFileSync(java+name,'utf8');

test('phone recorder tolerates the observed recird voice/typing typo in both hops',()=>{
 const site=fs.readFileSync('bubbles-ai.js','utf8');
 const native=source('VoiceCaptureCommands.java');
 assert.match(site,/recird\|recrod\|reccord/);
 assert.match(native,/recird\|recrod\|reccord/);
 assert.match(site,/nativeCaptureRequests\.push\(spoken\)/);
 assert.match(site,/drainNativeCaptureRequest/);
 assert.match(native,/return new Command\("screen_video"/);
});
test('record tap attempts Android consent without opening an external website',()=>{
 const native=source('BubblesService.java');
 const activity=source('MainActivity.java');
 assert.match(native,/offerCaptureApproval\(command\)/);
 assert.match(native,/startActivity\(intent\)/);
 assert.match(native,/PendingIntent\.getActivity\(this, CAPTURE_APPROVAL_ID/);
 assert.match(activity,/projection\.createScreenCaptureIntent\(\)/);
 assert.match(activity,/if \(resultCode != RESULT_OK \|\| data == null\)/);
 assert.doesNotMatch(native,/performGlobalAction\(.*(?:APPROVE|ALLOW)/);
});
test('typed recorder requests still work when voice mode is muted',()=>{
 const native=source('BubblesService.java');
 assert.match(native,/\(!typed && muted\)/);
 assert.match(native,/heard\(text, true\)/);
 assert.match(native,/case "screen_video":[\s\S]*?offerCaptureApproval\(command\)/);
});
