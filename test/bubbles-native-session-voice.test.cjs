'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const source=p=>fs.readFileSync(p,'utf8');
const site=source('bubbles-ai.js');
const native=source('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BubblesService.java');
const floating=source('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/FloatingOracleWindow.java');
test('native speech is buffered until a full utterance; echoes are suppressed after reply',()=>{
 assert.match(native,/END_OF_TURN_MS = 950L/);
 assert.match(native,/turnBuffer\.append\(transcript\)/);
 assert.match(native,/scheduleVoiceTurn\(TurnCompletionPolicy\.waitMillis\(turnBuffer\.peek\(\)\)\)/);
 assert.match(native,/SystemClock\.elapsedRealtime\(\) < echoQuietUntil/);
 assert.match(native,/private void finishSpeaking\(String id\)/);
 assert.match(native,/!id\.equals\(activeUtteranceId\)/);
 assert.match(native,/speechGeneration/);
});
test('typed text uses same website robot brain and history as spoken text',()=>{
 assert.match(native,/handleTypedRequest\(text\.trim\(\)\)/);
 assert.match(native,/oracleWindow\.sendTyped\(text\)/);
 assert.match(native,/ScreenAwareness\.refersToScreen\(text\)/);
 assert.match(floating,/Boolean\(window\.QuantaBubbles && window\.QuantaBubbles\.sendNativeText/);
 assert.match(site,/sendNativeText:\(message,messageId='',evidence=''\)=>/);
 assert.match(site,/startNativeTurn\(value,false,messageId,evidence\)/);
 assert.match(floating,/SITE_URL = "https:\/\/quantaphi.org\/bubbles.html\?nativeOverlay=1"/);
});
test('APK-first site pairing is explicit, short-lived, owner authorized and not sent to model',()=>{
 assert.match(site,/if\(nativeOverlay&&.*sync/);
 assert.match(site,/\/owner\/pair\/create/);
 assert.match(site,/await verifiedOwnerHeaders\(\)/);
 assert.match(site,/pairingCode\.value=result\.code/);
 assert.match(site,/pairingCard\.hidden=false/);
 assert.match(site,/120000/);
 assert.match(site,/One-time website pairing code/);
 assert.match(site,/messages\.push\(\{role:'user',text:spoken\},\{role:'assistant',text:response\}\)/);
 assert.doesNotMatch(site,/messages\.push\(\{role:'assistant',text:result\.code\}/);
});
