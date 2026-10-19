'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const zlib = require('node:zlib');
const manifest = JSON.parse(fs.readFileSync('bubbles-manifest.json','utf8'));
const html = fs.readFileSync('bubbles-chrome.html','utf8');
const installer = fs.readFileSync('bubbles-pwa.js','utf8');
const sw = fs.readFileSync('bubbles-pwa-sw.js','utf8');
const main = fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/MainActivity.java','utf8');
const manifestAndroid = fs.readFileSync('android/bubbles-overlay/app/src/main/AndroidManifest.xml','utf8');
const appBridge = fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/AppControlBridge.java','utf8');
const learning = fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BrainLearningService.java','utf8');
const service = fs.readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BubblesService.java','utf8');

test('Chrome app uses existing QuantaPhi origin with stable app identity', () => {
  assert.equal(manifest.id,'/bubbles-chrome.html');
  assert.equal(manifest.start_url,'/bubbles-chrome.html');
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.prefer_related_applications,false);
  assert.match(html,/rel="manifest" href="\/bubbles-manifest.json"/);
  assert.match(html,/id="bubblesInstallChrome"/);
  assert.match(html,/bubbles-pwa\.js/);
  assert.match(installer,/beforeinstallprompt/);
  assert.match(installer,/window\.matchMedia\('\(display-mode: standalone\)'\)/);
});

test('both Android Chrome icon sizes exist as genuine PNGs and decompress', () => {
 for(const n of [192,512]) {
  const buf=fs.readFileSync('assets/bubbles-pwa-'+n+'.png');
  assert.equal(buf.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  assert.equal(buf.readUInt32BE(16),n);
  assert.equal(buf.readUInt32BE(20),n);
  assert.equal(buf[24],1); // indexed 1-bit
  assert.equal(buf[25],3);
  const icon=manifest.icons.find(i=>i.sizes===n+'x'+n);
  assert.equal(icon.type,'image/png');
  assert.equal(icon.src,'/assets/bubbles-pwa-'+n+'.png');
  const idat=buf.indexOf(Buffer.from('IDAT','ascii'));
  assert.ok(idat>0);
  const len=buf.readUInt32BE(idat-4);
  const inflated=zlib.inflateSync(buf.subarray(idat+4,idat+4+len));
  assert.equal(inflated.length,n*(1+Math.ceil(n/8)));
  assert.ok(inflated.some(v=>v!==0),'icon must have visible artwork');
 }
});

test('offline shell caches only public resources, never auth or chat responses', () => {
 assert.match(sw,/CACHE = 'bubbles-public-shell-v1'/);
 assert.match(sw,/url\.pathname !== '\/bubbles-chrome\.html'/);
 assert.match(sw,/req\.mode !== 'navigate'/);
 assert.doesNotMatch(sw,/caches\.put\(req|Authorization|localStorage|sessionStorage/);
 assert.doesNotMatch(sw,/\/api\//);
 assert.match(fs.readFileSync('bubbles-pwa-offline.html','utf8'),/Reconnect to load your QuantaPhi chat and wallet/);
});

test('Android can launch signed-in Chrome website without importing native wallet credentials', () => {
 assert.match(manifestAndroid,/<package android:name="com\.android\.chrome"\/>/);
 assert.match(appBridge,/openChromeSite\(context, "https:\/\/quantaphi\.org\/bubbles-chrome\.html"/);
 assert.match(appBridge,/\.setPackage\("com\.android\.chrome"\)/);
 assert.match(main,/Chrome · install or open Bubbles website/);
 assert.match(learning,/isChromeForeground\(\)/);
 assert.match(service,/ChromeControlPolicy\.isChromeRequest\(question\)/);
 assert.match(service,/!BrainLearningService\.isChromeForeground\(\)/);
 assert.doesNotMatch(appBridge,/CookieManager|WebStorage|JavascriptInterface/);
});

test('Chrome launcher is unpinned on current GitHub main and served as JSON', () => {
 const worker=fs.readFileSync('workers/quantaphi-site/worker.js','utf8');
 assert.match(worker,/json: 'application\\/json/);
 assert.doesNotMatch(worker,/sourcePath === '\\/bubbles-chrome\\.html'/);
 assert.doesNotMatch(worker,/route\\.sourcePath === '\\/bubbles-chrome\\.html'/);
 assert.match(html,/rel="manifest" href="\\/bubbles-manifest\\.json"/);
});
