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
