const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const activity = source('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/MainActivity.java');
const service = source('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BubblesService.java');

test('recommended setup is a single first-run path with real Android consent', () => {
  assert.match(activity, /Button recommended = new Button\(this\)/);
  assert.match(activity, /recommended\.setOnClickListener\(view -> \{/);
  assert.match(activity, /if \(!canTalk\(\)\) \{ checkAndStart\(\); return; \}/);
  assert.match(activity, /!BrainLearningService\.isConnected\(\)/);
  assert.match(activity, /Settings\.ACTION_ACCESSIBILITY_SETTINGS/);
  assert.match(activity, /refreshRecommendedSetup\.run\(\)/);
  assert.match(activity, /if \(refreshRecommendedSetup != null\) refreshRecommendedSetup\.run\(\)/);
});

test('only contextual Start, Open chat and Stop controls appear by default', () => {
  assert.match(activity, /essentials = java\.util\.Arrays\.asList\(/);
  assert.match(activity, /title, copy, connect, chat, stop, state/);
  assert.match(activity, /connect\.setVisibility\(needsStart \? View\.VISIBLE : View\.GONE\)/);
  assert.match(activity, /chat\.setVisibility\(running \? View\.VISIBLE : View\.GONE\)/);
  assert.match(activity, /stop\.setVisibility\(running \? View\.VISIBLE : View\.GONE\)/);
  const defaults = activity.slice(activity.indexOf('java.util.List<View> essentials'), activity.indexOf('LinearLayout advanced ='));
  assert.doesNotMatch(defaults, /recommended|chatgptLogin|chromeSite|githubAccess|screenPermission/);
  assert.match(activity, /advanced\.setVisibility\(View\.GONE\)/);
  assert.match(activity, /More settings and diagnostics/);
  assert.match(activity, /Continue with ChatGPT/);
  assert.match(activity, /GitHub · check access in Bubbles/);
});

test('wake word by itself opens a floating conversation without a blank AI turn', () => {
  const wake = service.indexOf('if (!typed && directed && addressed.isEmpty())');
  const dispatch = service.indexOf('if (oracleWindow != null && oracleWindow.sendSpoken(');
  assert.ok(wake > 0 && dispatch > wake);
  const block = service.slice(wake, wake + 290);
  assert.match(block, /oracleWindow\.show\(\)/);
  assert.match(block, /return;/);
});

test('no Chrome token import or permission bypass', () => {
  assert.match(activity, /Chrome logins are not imported automatically/);
  assert.match(activity, /The owner connection must return a real receipt/);
  assert.match(activity, /startActivity\(new Intent\(Settings\.ACTION_ACCESSIBILITY_SETTINGS\)\)/);
  assert.doesNotMatch(activity, /grantUriPermission\([^)]*AUTHORIZATION/i);
});
