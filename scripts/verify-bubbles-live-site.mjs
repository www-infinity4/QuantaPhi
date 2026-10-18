import assert from 'node:assert/strict';

const origin = 'https://quantaphi.org';
async function get(path) {
  const response = await fetch(origin + path, {
    redirect: 'manual',
    signal: AbortSignal.timeout(12000),
    headers: { 'User-Agent': 'QuantaPhi-Bubbles-Release-Smoke/1.0' },
  });
  const text = await response.text();
  return { status: response.status, text, contentType: response.headers.get('content-type') || '' };
}

const result = [];
function record(name, status) {result.push({name, status});}

const site = await get('/health');
assert.equal(site.status, 200, 'site health must return HTTP 200');
assert.equal(JSON.parse(site.text).service, 'quantaphi-site');
record('site health', site.status);

const connector = await get('/api/bubbles/connections/health');
assert.equal(connector.status, 200, 'connector health must return HTTP 200');
const connectorJson = JSON.parse(connector.text);
assert.equal(connectorJson.ok, true);
assert.equal(connectorJson.service, 'bubbles-connections');
record('connector health', connector.status);

const page = await get('/bubbles-accounts.html');
assert.equal(page.status, 200, 'account page must load');
assert.match(page.text, /<h1>Account Connections<\/h1>/);
assert.match(page.text, /\/bubbles-connections\.mjs/);
record('account page', page.status);

const home = await get('/');
assert.equal(home.status, 200, 'home page must load');
assert.match(home.text, /href="\/bubbles-accounts\.html"/, 'home page must link to account connections');
assert.match(home.text, /data-platinum-security-hold/, 'Platinum APK withdrawal warning must remain visible');
assert.doesNotMatch(home.text, /data-apk-download="site"/, 'withdrawn APK must not be linked as downloadable');
record('homepage links and security warning', home.status);

const blocked = await get('/downloads/site.apk');
assert.ok([403,410].includes(blocked.status), 'withdrawn Platinum APK must be blocked by WAF (403) or Worker (410)');
assert.ok(!blocked.contentType.includes('android.package-archive') && !blocked.contentType.includes('application/octet-stream'), 'blocked response must not be an APK');
record('Platinum APK blocked', blocked.status);

const protectedRead = await get('/api/bubbles/connections/catalog');
assert.equal(protectedRead.status, 403, 'originless nonbrowser catalog requests must be blocked');
record('unverified catalog denied', protectedRead.status);

console.log(JSON.stringify({ok:true,checks:result},null,2));
