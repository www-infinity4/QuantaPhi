'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const root = 'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const read = name => fs.readFileSync(root + name, 'utf8');

test('screen recording has no implicit five-minute end or 100 MB media cutoff', () => {
  const service = read('ScreenCaptureService.java');
  assert.doesNotMatch(service, /recorder\.setMaxDuration\s*\(/);
  assert.doesNotMatch(service, /recorder\.setMaxFileSize\s*\(/);
  assert.doesNotMatch(service, /postDelayed\(this::finishCapture,\s*300000\)/);
  assert.match(service, /main\.postDelayed\(storageGuard,\s*15000L\)/);
  assert.match(service, /getUsableSpace\(\)\s*<\s*MIN_CAPTURE_FREE_BYTES/);
  assert.match(service, /stopReason\("Recording stopped to protect phone storage\."/);
  assert.match(service, /@Override public void onStop\(\)\s*\{/);
  assert.match(service, /Android ended screen sharing/);
});

test('native screen-record buttons never depend on a model having click tools', () => {
  const commands = read('VoiceCaptureCommands.java');
  const site = fs.readFileSync('bubbles-ai.js', 'utf8');
  assert.match(commands, /press\|tap\|hit\|click\|push\|select\|use/);
  assert.match(commands, /return new Command\("screen_video",\s*0,\s*0\)/);
  assert.match(site, /nativeCaptureVerb=\/\^\(\?:press\|tap\|hit\|click/);
  assert.match(site, /nativeCaptureRequests\.push\(spoken\)/);
  assert.match(site, /Sending request to Android recorder/);
  assert.match(read('BubblesService.java'), /offerCaptureApproval\(command\)/);
});

test('recorder ends with real stop and export evidence', () => {
  const screen = read('ScreenCaptureService.java');
  const voice = read('BubblesService.java');
  assert.match(screen, /capture_stop_reason/);
  assert.match(screen, /CapturePublisher\.publish\(this, completed, type\)/);
  assert.match(screen, /mediaExport\.execute/);
  assert.match(voice, /Shared microphone sound failed/);
  assert.match(screen, /Capture failed:/);
});
