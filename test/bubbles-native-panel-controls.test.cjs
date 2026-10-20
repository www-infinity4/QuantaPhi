'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = 'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/';
const service = fs.readFileSync(base+'BubblesService.java','utf8');
const panel = fs.readFileSync(base+'FloatingOracleWindow.java','utf8');
const nativeCommands = fs.readFileSync(base+'BubblesPanelCommands.java','utf8');

test('short named wake is dispatched before normal speech accumulation and model calls',()=>{
 assert.match(service,/panelAction != BubblesPanelCommands\.Action\.NONE && voicedMillis >= 200L/);
 assert.match(service,/if \(panelAction != BubblesPanelCommands\.Action\.NONE\) \{/);
 assert.match(service,/main\.removeCallbacks\(deliverVoiceTurn\);[\s\S]*?turnBuffer\.clear\(\);[\s\S]*?heard\(transcript\)/);
 assert.match(service,/if \(panelCommand\(text, typed, now\)\)/);
 assert.match(service,/if \(panelCommand\(text, true, SystemClock\.elapsedRealtime\(\)\)\)/);
});
test('hideaway only collapses native panel and never stops microphone service or clears chat',()=>{
 assert.match(nativeCommands,/enum Action \{ NONE, SHOW, HIDE \}/);
 assert.match(service,/BubblesPanelCommands\.requiresWake\(text\) && now > activeUntil/);
 assert.match(service,/if \(oracleWindow != null\) oracleWindow\.hide\(\)/);
 assert.match(panel,/void hide\(\) \{[\s\S]*?root\.setVisibility\(View\.GONE\)/);
 assert.doesNotMatch(service.slice(service.indexOf('private boolean panelCommand'),service.indexOf('private void heard(String raw)')),
   /stopSelf\(|stopRecognition\(|stopService\(/);
});
test('a large top-right X Hide remains outside the website and restores on wake',()=>{
 assert.match(panel,/Button close = button\("✕ Hide", false\)/);
 assert.match(panel,/close\.setMinWidth\(dp\(72\)\)/);
 assert.match(panel,/close\.setMinHeight\(dp\(48\)\)/);
 assert.match(panel,/close\.setOnClickListener\(v -> hide\(\)\)/);
 assert.match(panel,/if \(root != null\) \{\s*root\.setVisibility\(View\.VISIBLE\)/);
 assert.match(panel,/header\.addView\(close\);\s*page\.addView\(header\)/);
});
