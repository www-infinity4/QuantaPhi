const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
test('Android debug build uses separate, installable package to avoid old signature collision',()=>{
 const gradle=fs.readFileSync('android/bubbles-overlay/app/build.gradle','utf8');
 const manifest=fs.readFileSync('android/bubbles-overlay/app/src/main/AndroidManifest.xml','utf8');
 const workflow=fs.readFileSync('.github/workflows/bubbles-android.yml','utf8');
 assert.match(gradle,/applicationId 'org\.quantaphi\.bubbles'/);
 assert.match(gradle,/debug\s*\{[^}]*applicationIdSuffix '\.preview5'/);
 assert.match(gradle,/manifestPlaceholders = \[appTitle: 'Bubbles Preview 5'\]/);
 assert.match(gradle,/release\s*\{[^}]*manifestPlaceholders = \[appTitle: 'Bubbles AI'\]/);
 assert.match(manifest,/android:label="\$\{appTitle\}"/);
 assert.match(workflow,/bubbles-preview-android12-apk/);
 assert.match(workflow,/Restore preview-5 test signing key/);
 assert.match(workflow,/Bubbles-Preview5-Android12\.apk/);
 assert.match(workflow,/publish-preview:/);
 assert.match(workflow,/apksigner/);
 assert.match(workflow,/bubbles-preview5-signing-v1/);
 assert.match(workflow,/preview-debug\.keystore/);
 assert.match(gradle,/signingConfig signingConfigs\.preview/);
 assert.match(workflow,/app\/build\/outputs\/apk\/debug\/app-debug\.apk/);
});

test('Bubbles Preview 5 scrolling chat is a signed APK upgrade, not a second package',()=>{
 const gradle=fs.readFileSync('android/bubbles-overlay/app/build.gradle','utf8');
 assert.match(gradle,/versionCode 18/);
 assert.match(gradle,/versionName '0\.18\.0'/);
 assert.match(gradle,/applicationIdSuffix '\.preview5'/);
});
