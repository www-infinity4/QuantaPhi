import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const page=readFileSync(new URL('../index.html', import.meta.url),'utf8');
const edge=readFileSync(new URL('../workers/quantaphi-site/worker.js', import.meta.url),'utf8');
test('home menu and immediately visible link navigate to direct Bubbles account connections',()=>{
  assert.match(page, /<a href="\/bubbles-accounts\.html">Connect accounts · Bubbles<\/a>/);
  assert.match(page, /<a href="\/bubbles-accounts\.html"[^>]*>Bubbles Account Connections<\/a>/);
});
test('home no longer pins a stale page while downloadable APK script stays pinned',()=>{
  assert.ok(!edge.includes("['/index.html','/apk-downloads.js'].includes(route.sourcePath)"));
  assert.match(edge, /route\.sourcePath === '\/apk-downloads\.js' \? '6643d2727f5be56dd0f1b217f532099899833bca'/);
  assert.match(edge, /route\.repo === 'QuantaPhi' && \(route\.sourcePath === '\/index.html'/);
});
test('Platinum download remains withdrawn in both public page and edge route',()=>{
  assert.match(page,/data-platinum-security-hold/);
  assert.doesNotMatch(page, /data-apk-download="site"/);
  assert.match(edge,/if\(incoming\.pathname==='\/downloads\/site\.apk'\)return new Response\('Infinity Platinum APK withdrawn pending security review/);
  assert.match(edge,/status:410/);
});
