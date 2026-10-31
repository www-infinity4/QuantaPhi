import test from 'node:test';
import assert from 'node:assert/strict';
import { isAllowedUrl, parseAllowedHosts } from './policy.mjs';

test('allowlist matches exact HTTPS hosts only', () => {
  const hosts = parseAllowedHosts('example.com,docs.example.com');
  assert.equal(isAllowedUrl('https://example.com/', hosts), true);
  assert.equal(isAllowedUrl('https://docs.example.com/a', hosts), true);
  assert.equal(isAllowedUrl('http://example.com/', hosts), false);
  assert.equal(isAllowedUrl('https://example.com.evil.test/', hosts), false);
  assert.equal(isAllowedUrl('https://evil.test/', hosts), false);
  assert.equal(isAllowedUrl('file:///etc/passwd', hosts), false);
});

test('private and loopback addresses are forbidden', () => {
  const hosts = parseAllowedHosts('127.0.0.1,localhost,10.0.0.1,169.254.169.254');
  for (const host of hosts) assert.equal(isAllowedUrl('https://' + host + '/', hosts), false);
});
