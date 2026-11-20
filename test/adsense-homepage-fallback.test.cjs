'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('workers/quantaphi-site/worker.js', 'utf8')
  .replace(/^import \{videoAPI\} from '.\/video-api.mjs';\s*/, '')
  .replace('export default', 'globalThis.worker=');

function workerWith({fetch, cache}) {
  const context = {
    URL, Request, Response, Headers, AbortController, setTimeout, clearTimeout, fetch,
    caches: {default: cache}
  };
  vm.runInNewContext(source, context);
  return context.worker;
}

function memoryCache() {
  let snapshot = null;
  let writes = 0;
  return {
    async match() { return snapshot?.clone() || null; },
    async put(_key, response) {
      snapshot = response.clone();
      writes++;
    },
    get writes() { return writes; }
  };
}

const goodHome = '<!doctype html><html><head><title>QuantaPhi</title><link rel="canonical" href="https://quantaphi.org/"></head><body>Working current homepage</body></html>';

test('public homepage stores a successful verified HTML snapshot without changing live response', async () => {
  const cache = memoryCache();
  const app = workerWith({
    cache, fetch: async () => new Response(goodHome, {status:200, headers:{'Content-Type':'text/html'}})
  });
  const response = await app.fetch(new Request('https://quantaphi.org/'), {});
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Working current homepage/);
  assert.equal(cache.writes, 1, 'one known-good homepage must be stored');
});

test('AdSense crawler gets cached homepage HTTP 200 when both upstream sources fail', async () => {
  const cache = memoryCache();
  await workerWith({
    cache, fetch: async () => new Response(goodHome,{status:200,headers:{'Content-Type':'text/html'}})
  }).fetch(new Request('https://quantaphi.org/'), {});
  const app = workerWith({cache, fetch: async () => { throw new Error('upstream unavailable'); }});
  const response = await app.fetch(new Request('https://quantaphi.org/', {
    headers:{'User-Agent':'Mediapartners-Google'}
  }), {});
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Working current homepage/);
  assert.equal(response.headers.get('x-quantaphi-home-fallback'), 'stale-if-error');
});

test('HEAD homepage request has no body when serving cached fallback', async () => {
  const cache = memoryCache();
  await workerWith({cache, fetch: async () => new Response(goodHome,{status:200,headers:{'Content-Type':'text/html'}})})
    .fetch(new Request('https://quantaphi.org/'), {});
  const response = await workerWith({cache,fetch:async()=>{throw Error('down');}})
    .fetch(new Request('https://quantaphi.org/',{method:'HEAD'}), {});
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '');
});

test('static homepage fallback never masks unrelated Bubbles or wallet routing failures', async () => {
  const cache = memoryCache();
  await workerWith({cache, fetch: async () => new Response(goodHome,{status:200,headers:{'Content-Type':'text/html'}})})
    .fetch(new Request('https://quantaphi.org/'), {});
  const response = await workerWith({cache,fetch:async()=>{throw Error('down');}})
    .fetch(new Request('https://quantaphi.org/bubbles.html'), {});
  assert.equal(response.status, 503);
});

test('homepage returns genuine 503 if no verified fallback exists', async () => {
  const app = workerWith({cache:memoryCache(),fetch:async()=>{throw Error('down');}});
  const response = await app.fetch(new Request('https://quantaphi.org/'), {});
  assert.equal(response.status, 503);
});
