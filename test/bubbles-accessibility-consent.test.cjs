'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const base = 'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const main = fs.readFileSync(base + 'MainActivity.java', 'utf8');
const service = fs.readFileSync(base + 'BrainLearningService.java', 'utf8');
const screen = fs.readFileSync(base + 'ScreenVision.java', 'utf8');

test('Android Accessibility requires separate, affirmative and revocable in-app consent', () => {
  assert.match(main, /requestScreenAccessConsent\(\)/);
  assert.match(main, /setNegativeButton\("Not now", null\)/);
  assert.match(main, /setPositiveButton\("Agree and open Android Settings"/);
  assert.match(main, /putBoolean\(BrainLearningService\.SCREEN_CONSENT, true\)/);
  assert.match(main, /BrainLearningService\.revokeOwnerConsent\(this\)/);
  assert.match(service, /getBoolean\(SCREEN_CONSENT, false\)/);
  assert.match(service, /boolean isConnected\(\)[\s\S]*?hasOwnerConsent\(service\)/);
  assert.match(service, /AccessibilityNodeInfo currentRoot\(\) \{\s*if \(!hasOwnerConsent\(this\)\) return null;/);
  assert.match(service, /onAccessibilityEvent\(AccessibilityEvent event\) \{\s*if \(!hasOwnerConsent\(this\)\)/);
  assert.match(service, /runPhoneTool\([\s\S]*?service != null && isConnected\(\)/);
});

test('Screenshot uploads to Cloudflare are disclosed before opt-in', () => {
  assert.match(screen, /https:\/\/bubbles-tools\.marvaseater\.workers\.dev\/v1\/assist/);
  assert.match(main, /image of the current screen may be sent to QuantaPhi's Cloudflare AI service/);
  assert.match(main, /separate permission screen/);
  assert.match(main, /Voice and normal chat work without screen access/);
});
