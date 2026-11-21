import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

// Only public package/signature metadata is retained. Never export a keystore.
export function parseApk(badging, signature, sha256) {
  const pkg = badging.match(/^package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/m);
  const minSdk = badging.match(/^sdkVersion:'(\d+)'/m);
  const targetSdk = badging.match(/^targetSdkVersion:'(\d+)'/m);
  const abis = [...(badging.match(/^native-code: (.+)$/m)?.[1] || '').matchAll(/'([^']+)'/g)].map(x => x[1]);
  const signers = [...signature.matchAll(/^Signer #\d+ certificate SHA-256 digest: ([a-fA-F0-9]{64})\s*$/gm)];
  if (signers.length !== 1) throw new Error('Exactly one verified APK signer is required');
  if (!pkg || !minSdk || !targetSdk || !abis.length || !/^[a-f0-9]{64}$/.test(sha256)) throw new Error('Incomplete APK badging or digest');
  return { packageName: pkg[1], versionCode: Number(pkg[2]), versionName: pkg[3], minSdk: Number(minSdk[1]),
    targetSdk: Number(targetSdk[1]), abis, signerSha256: signers[0][1].toLowerCase(), sha256 };
}

export function verifyUpdate(previous, next, expectedVersion) {
  if (previous.packageName !== 'org.quantaphi.bubbles.preview5' || next.packageName !== previous.packageName) throw new Error('Wrong APK package');
  if (!/^[a-f0-9]{64}$/.test(next.signerSha256) || next.signerSha256 !== previous.signerSha256) throw new Error('APK signer changed; restore the original preview key, never uninstall user data');
  if (!Number.isSafeInteger(next.versionCode) || next.versionCode <= previous.versionCode) throw new Error('APK versionCode must increase; do not overwrite an existing version');
  if (next.versionName !== `${expectedVersion}-preview`) throw new Error('APK versionName does not match source');
  if (!Number.isInteger(next.minSdk) || next.minSdk > 31) throw new Error('APK no longer supports Android 12');
  if (next.abis.length !== 2 || !['armeabi-v7a', 'arm64-v8a'].every(abi => next.abis.includes(abi))) throw new Error('Phone APK must contain both ARM ABIs and no emulator code');
  return { schema: 1, status: 'update_compatible', previous, apk: next };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({ options: Object.fromEntries(['apk','previous','aapt','apksigner','version','source','receipt'].map(k => [k, { type: 'string' }])) });
  for (const name of ['apk','previous','aapt','apksigner','version','source','receipt']) if (!values[name]) throw new Error(`Missing --${name}`);
  if (!/^[a-f0-9]{40}$/.test(values.source)) throw new Error('Missing exact source commit');
  const inspect = file => parseApk(
    execFileSync(values.aapt, ['dump', 'badging', file], { encoding: 'utf8' }),
    execFileSync(values.apksigner, ['verify', '--verbose', '--print-certs', file], { encoding: 'utf8' }),
    createHash('sha256').update(readFileSync(file)).digest('hex'));
  const receipt = { ...verifyUpdate(inspect(values.previous), inspect(values.apk), values.version), checkedOutCommit: values.source };
  writeFileSync(values.receipt, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify(receipt));
}
