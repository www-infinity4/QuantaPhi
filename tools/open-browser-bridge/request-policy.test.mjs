import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { installRequestPolicy } from './request-policy.mjs';

function fakeContext() {
  let handler;
  return {
    async route(pattern, fn) { assert.equal(pattern, '**/*'); handler = fn; },
    async request(url) {
      assert.equal(typeof handler, 'function', 'route must be installed before pages are opened');
      let action = 'none';
      await handler({ request: () => ({ url: () => url }), abort: async () => { action = 'abort'; }, continue: async () => { action = 'continue'; } });
      return action;
    },
  };
}

test('context-wide routing covers first navigation of a popup as well as the original page', async () => {
  const context = fakeContext();
  await installRequestPolicy(context, new Set(['example.com']), async () => true);
  assert.equal(await context.request('https://example.com/page'), 'continue');
  assert.equal(await context.request('https://127.0.0.1/admin'), 'abort');
  assert.equal(await context.request('https://evil.test/'), 'abort');
});

test('private DNS, failed DNS, alternate ports and credentials fail closed for every request', async () => {
  const context = fakeContext();
  await installRequestPolicy(context, new Set(['example.com']), async host => {
    assert.equal(host, 'example.com');
    return false;
  });
  assert.equal(await context.request('https://example.com/'), 'abort');
  assert.equal(await context.request('https://example.com:8443/'), 'abort');
  assert.equal(await context.request('https://user:pass@example.com/'), 'abort');
});

test('DNS lookup failures abort rather than permit a request', async () => {
  const context = fakeContext();
  await installRequestPolicy(context, new Set(['example.com']), async () => { throw new Error('dns timeout'); });
  assert.equal(await context.request('https://example.com/'), 'abort');
});

test('browser runner installs context policy before opening pages', async () => {
  const source = await readFile(new URL('./browser-bridge.mjs', import.meta.url), 'utf8');
  const install = source.indexOf('await installRequestPolicy(context, allowed);');
  const newPage = source.indexOf('await context.newPage();');
  assert.ok(install >= 0 && newPage > install, 'policy must precede any page creation');
  assert.doesNotMatch(source, /await page\.route\(/, 'page-only routing misses popup initial requests');
});
