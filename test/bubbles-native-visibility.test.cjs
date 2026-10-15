'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const page = fs.readFileSync('bubbles.html', 'utf8');
const site = fs.readFileSync('bubbles-ai.js', 'utf8');
const window = fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/FloatingOracleWindow.java', 'utf8');
const accessibility = fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BrainLearningService.java', 'utf8');

test('native Android WebView never paints the owner desktop widget on top of chat', () => {
  assert.match(page, /html\.bubbles-native-overlay #robotBrainOwner\{display:none!important\}/);
  assert.match(page, /html\.bubbles-native-overlay \.ba-panel\{z-index:2147483640!important/);
  assert.match(page, /html\.bubbles-native-overlay \.ba-panel \.ba-messages\{min-height:0!important;overflow-y:auto!important;/);
});
test('single-line native overlay header leaves screen space for the full site chat', () => {
  assert.match(window, /TextView title = text\("Bubbles", 21, INK\)/);
  assert.match(window, /title\.setSingleLine\(true\)/);
});
test('authorized Android screenshot can run even without an accessibility text root', () => {
  const inspect = accessibility.slice(accessibility.indexOf('private void inspect('), accessibility.indexOf('static String performRequestedAction'));
  assert.doesNotMatch(inspect, /root == null\) \{ callback\.accept\("SCREEN_NOT_AVAILABLE/);
  assert.match(inspect, /if \(root == null\)/);
  assert.match(inspect, /takeScreenshot\(Display\.DEFAULT_DISPLAY/);
  assert.match(inspect, /CaptureReader\.readBitmap\(pixels\)/);
  assert.match(accessibility, /if \(service == null\) \{ callback\.accept\(ACCESS_OFF\)/);
});

test('native floating chat scrolls by touch while composer stays anchored', () => {
  assert.match(page, /html\.bubbles-native-overlay \.ba-panel \.ba-messages\{min-height:0!important;overflow-y:auto!important;flex:1 1 0!important/);
  assert.match(page, /touch-action:pan-y!important/);
  assert.match(page, /overscroll-behavior-y:contain!important/);
  assert.match(page, /\.ba-composer\{flex-shrink:0!important;flex-grow:0!important/);
  assert.match(site, /conversation\.scrollHeight-conversation\.scrollTop-conversation\.clientHeight<96/);
  assert.match(site, /requestAnimationFrame\(\(\)=>\{conversation\.scrollTop=conversation\.scrollHeight/);
});
test('one native composer pairs privately without extra buttons or code leaking to chat', () => {
  assert.match(site, /if\(nativeOverlay&&!fromVoice&&\/\^\[a-f0-9\]\{64\}\$\/i\.test\(spoken\)\)/);
  assert.match(site, /await redeemNativeOwnerCode\(spoken\)/);
  assert.match(site, /await window\.QuantaBrainOwner\?\.connectWithCode\?\.\(code\)/);
  assert.doesNotMatch(site, /nativeOwnerInput=create/);
  assert.match(site, /panel\.insertBefore\(tools,composer\)/);
  assert.match(site, /if\(who!=='you'&&!greeting&&!nativeOverlay\)/);
});
