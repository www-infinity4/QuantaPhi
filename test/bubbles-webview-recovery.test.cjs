'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const window = fs.readFileSync(
  'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/FloatingOracleWindow.java',
  'utf8'
);

test('Android WebView renderer death is handled without stopping foreground voice', () => {
  assert.match(window, /onRenderProcessGone\(WebView view,/);
  assert.match(window, /loadGeneration\+\+/);
  assert.match(window, /root\.removeView\(view\)/);
  assert.match(window, /website = null;\s*view\.destroy\(\)/);
  assert.match(window, /return true;\s*}\s*}\);/);
  assert.match(window, /createWebsite\(root\)/);
  assert.doesNotMatch(window, /onRenderProcessGone[\s\S]{0,1500}stopSelf\(/);
});

test('recovery is bounded and leaves existing conversation IDs and queues intact', () => {
  assert.match(window, /now - lastRendererFailureAt > 60000L/);
  assert.match(window, /\+\+rendererFailures <= 3/);
  assert.match(window, /rendererFailures = 0;\s*createWebsite\(page\)/);
  assert.match(window, /Your messages are retained/);
  assert.match(window, /pendingSpeech\.addLast\(new QueuedMessage/);
  assert.match(window, /pendingTyped\.addLast\(new QueuedMessage/);
  assert.match(window, /if \(root == null \|\| text == null \|\| text\.trim\(\)\.isEmpty\(\)\) return false;/);
  assert.match(window, /settings\.setAllowFileAccess\(false\)/);
  assert.match(window, /settings\.setMixedContentMode\(WebSettings\.MIXED_CONTENT_NEVER_ALLOW\)/);
});

// The foreground microphone/orb is already user-started. This loop wakes the
// existing first-party website consumer even when its own timers are throttled.
test('native foreground wake only nudges the existing authenticated owner WebView', () => {
  const js = fs.readFileSync('bubbles-cloud-browser.mjs', 'utf8');
  const consent = fs.readFileSync('workers/bubbles-cloud-browser/consent.mjs', 'utf8');
  assert.match(window, /private long lastChatGPTConsumerWakeAt = 0L;/);
  assert.match(window, /if \(trustedChat\(website\) && now - lastChatGPTConsumerWakeAt >= 8000L\)/);
  assert.match(window, /website\.evaluateJavascript\("window\.dispatchEvent\(new Event\('bubbles:foreground-poll'\)\)"/);
  assert.match(window, /ui\.postDelayed\(this, 400\)/);
  assert.match(window, /if \(root == null\) return;/);
  assert.match(js, /window\.addEventListener\('bubbles:foreground-poll',\(\)=>void pollChatGPT\(\)\)/);
  const poll=js.slice(js.indexOf('async function pollChatGPT()'),js.indexOf('// The session and owner token remain'));
  assert.match(poll, /bridgeCall\('permission',\{action:'status'\}\)/);
  assert.match(poll, /bridgeCall\('process'/);
  assert.match(consent, /owner-chatgpt-bridge-consent/);
  assert.doesNotMatch(poll, /action:'enable'/);
  assert.doesNotMatch(window, /bubbles:foreground-poll[\s\S]{0,250}(Bearer|Authorization|CookieManager|owner_token)/);
});
