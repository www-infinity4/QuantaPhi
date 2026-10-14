const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('Android debug build uses separate, installable package to avoid old signature collision',()=>{
 const gradle=fs.readFileSync('android/bubbles-overlay/app/build.gradle','utf8');
 const manifest=fs.readFileSync('android/bubbles-overlay/app/src/main/AndroidManifest.xml','utf8');
 const workflow=fs.readFileSync('.github/workflows/bubbles-android.yml','utf8');
 assert.match(gradle,/applicationId 'org\.quantaphi\.bubbles'/);
 assert.match(gradle,/debug\s*\{[^}]*applicationIdSuffix '\.preview'/);
 assert.match(gradle,/manifestPlaceholders = \[appTitle: 'Bubbles Preview'\]/);
 assert.match(gradle,/release\s*\{[^}]*manifestPlaceholders = \[appTitle: 'Bubbles AI'\]/);
 assert.match(manifest,/android:label="\$\{appTitle\}"/);
 assert.match(workflow,/bubbles-preview-android12-apk/);
 assert.match(workflow,/Reuse test-only preview signing key/);
 assert.match(workflow,/app\/build\/outputs\/apk\/debug\/app-debug\.apk/);
});
