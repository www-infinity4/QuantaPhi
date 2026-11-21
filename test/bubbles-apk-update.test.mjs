import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseApk, verifyUpdate } from '../.github/scripts/verify-bubbles-apk-update.mjs';

const cert = 'ab'.repeat(32);
const badging = (version = 59) => `package: name='org.quantaphi.bubbles.preview5' versionCode='${version}' versionName='0.${version}.0-preview'
sdkVersion:'26'
targetSdkVersion:'35'
native-code: 'armeabi-v7a' 'arm64-v8a'`;
const inspect = (version, signer = cert) => parseApk(badging(version), `Signer #1 certificate SHA-256 digest: ${signer}`, String(version).padStart(64, '0'));
test('accepts a newer Preview5 APK with the published signer and ARM support', () => {
  assert.equal(verifyUpdate(inspect(58), inspect(59), '0.59.0').apk.signerSha256, cert);
});
test('rejects a replacement key instead of requiring users to uninstall', () => {
  assert.throws(() => verifyUpdate(inspect(58), inspect(59, 'cd'.repeat(32)), '0.59.0'), /signer/);
});
test('rejects an unchanged version, downgrade, or wrong configured version', () => {
  for (const version of [57, 58]) assert.throws(() => verifyUpdate(inspect(58), inspect(version), `0.${version}.0`), /versionCode/);
  assert.throws(() => verifyUpdate(inspect(58), inspect(59), '0.60.0'), /versionName/);
});
test('rejects wrong packages, emulator binaries and loss of Android 12 support', () => {
  const previous = inspect(58);
  assert.throws(() => verifyUpdate(previous, { ...inspect(59), packageName: 'org.quantaphi.platinum' }, '0.59.0'), /package/);
  assert.throws(() => verifyUpdate(previous, { ...inspect(59), abis: ['x86_64'] }, '0.59.0'), /ARM/);
  assert.throws(() => verifyUpdate(previous, { ...inspect(59), minSdk: 32 }, '0.59.0'), /Android 12/);
});
test('fails closed on absent or multiple signers and incomplete badging', () => {
  assert.throws(() => parseApk(badging(), '', 'ab'.repeat(32)), /signer/);
  assert.throws(() => parseApk(badging(), `Signer #1 certificate SHA-256 digest: ${cert}\nSigner #2 certificate SHA-256 digest: ${cert}`, 'ab'.repeat(32)), /signer/);
  assert.throws(() => parseApk('', `Signer #1 certificate SHA-256 digest: ${cert}`, 'ab'.repeat(32)), /badging/);
});
