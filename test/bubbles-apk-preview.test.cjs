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

test('published APK keeps immutable versioned filename plus rolling alias',()=>{
 const workflow=fs.readFileSync('.github/workflows/bubbles-android.yml','utf8');
 const gradle=fs.readFileSync('android/bubbles-overlay/app/build.gradle','utf8');
 const version=gradle.match(/versionName '([^']+)'/)?.[1];
 assert.ok(version);
 assert.match(workflow,/VERSIONED="Bubbles-v\$\{VERSION\}-Preview5-Android12\.apk"/);
 assert.match(workflow,/gh release upload bubbles-preview-current "dist\/\$VERSIONED/);
 assert.match(workflow,/cp "dist\/\$VERSIONED" dist\/Bubbles-Preview5-Android12\.apk/);
 assert.match(workflow,/sha256sum "\$VERSIONED" > "\$VERSIONED\.sha256"/);
 assert.match(workflow,/Bubbles-Preview5-Android12\.apk\.sha256/);
 assert.equal(version,'0.35.0');
});
