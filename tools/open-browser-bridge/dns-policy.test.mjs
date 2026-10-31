import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicAddress, resolvesOnlyPublicAddresses } from './dns-policy.mjs';

test('private, metadata, loopback, mapped, reserved and documentation addresses fail closed', () => {
  for (const address of ['127.0.0.1', '10.0.1.2', '172.16.0.1', '192.168.1.1',
    '169.254.169.254', '100.64.0.1', '0.0.0.0', '198.51.100.5', '203.0.113.2',
    '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1', '2001:db8::1', 'ff02::1']) {
    assert.equal(isPublicAddress(address), false, address);
  }
});

test('ordinary public addresses are eligible', () => {
  assert.equal(isPublicAddress('1.1.1.1'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
});

test('all DNS answers must be public, not just the first', async () => {
  assert.equal(await resolvesOnlyPublicAddresses('example.com', async () => [
    { address: '1.1.1.1', family: 4 }, { address: '127.0.0.1', family: 4 },
  ]), false);
  assert.equal(await resolvesOnlyPublicAddresses('example.com', async () => [
    { address: '1.1.1.1', family: 4 }, { address: '2606:4700:4700::1111', family: 6 },
  ]), true);
});

test('DNS errors, empty results and literal IP hosts fail closed', async () => {
  assert.equal(await resolvesOnlyPublicAddresses('example.com', async () => []), false);
  assert.equal(await resolvesOnlyPublicAddresses('example.com', async () => { throw new Error('timeout'); }), false);
  assert.equal(await resolvesOnlyPublicAddresses('127.0.0.1', async () => [{address:'1.1.1.1'}]), false);
});
