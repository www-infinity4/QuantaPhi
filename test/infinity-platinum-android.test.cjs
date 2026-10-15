'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const java=read('android/infinity-platinum/app/src/main/java/org/quantaphi/platinum/PlatinumActivity.java');
const manifest=read('android/infinity-platinum/app/src/main/AndroidManifest.xml');
const site=read('platinum/platinum.js');
const gradle=read('android/infinity-platinum/app/build.gradle');
test('Platinum is a separate browser app suitable for Android 12, with explicit default browser consent',()=>{
 assert.match(gradle,/applicationId 'org\.quantaphi\.platinum\.preview1'/);
 assert.match(gradle,/minSdk 26/);
 assert.match(manifest,/android\.intent\.category\.BROWSABLE/);
 assert.match(manifest,/android\.intent\.action\.VIEW/);
 assert.match(java,/RoleManager\.ROLE_BROWSER/);
 assert.match(java,/createRequestRoleIntent/);
});
test('arbitrary websites cannot access Java object interfaces, files, or bypass certificate errors',()=>{
 assert.match(java,/setAllowFileAccess\(false\)/);
 assert.match(java,/setAllowContentAccess\(false\)/);
 assert.match(java,/setAllowUniversalAccessFromFileURLs\(false\)/);
 assert.match(java,/setMixedContentMode\(WebSettings\.MIXED_CONTENT_NEVER_ALLOW\)/);
 assert.match(java,/setSafeBrowsingEnabled\(true\)/);
 assert.match(java,/handler\.cancel\(\)/);
 assert.doesNotMatch(java,/addJavascriptInterface\(/);
});
test('Collect is a user-initiated verified QuantaPhi call, with no clipboard or login scraping',()=>{
 assert.match(java,/PlatinumNavigation\.isPlatinum\(url\)/);
 assert.match(java,/deliverPendingCollection\(view\)/);
 assert.match(java,/window\.InfinityPlatinumApp\.collectFromNative/);
 assert.match(site,/collectFromNative:\(raw,title,build=false\)=>/);
 assert.match(site,/packageApi\?\.seed\?\.\('code'\)/);
 assert.doesNotMatch(java,/getCookie\(|getPassword\(|WebView\.setWebContentsDebuggingEnabled/);
});
test('Browser preview exposes minimal real navigation, tabs, controlled downloads and file picker',()=>{
 assert.match(java,/MAX_TABS=3/);
 assert.match(java,/w\.canGoBack\(\)/);
 assert.match(java,/w\.canGoForward\(\)/);
 assert.match(java,/setDownloadListener/);
 assert.match(java,/onShowFileChooser/);
 assert.match(java,/newTab\(PlatinumNavigation\.START\)/);
});
