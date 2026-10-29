/* Quant Mail WebAuthn assertion verifier (source-only, no routes or sessions).
 * Must be invoked ONLY after loading an unrevoked, wallet-subject-bound
 * credential and a server-issued challenge from a private durable registry.
 * A verified assertion alone never authorizes a wallet, alias or admin role.
 */
export const RP_ID = 'quantaphi.org';
export const ORIGIN = 'https://quantaphi.org';
const utf8 = new TextEncoder();
const fatal = new TextDecoder('utf-8', { fatal: true });
const deny = code => { throw Error('webauthn_' + code); };

export function decodeBase64url(value, min = 0, max = 65536) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value) || value.length > Math.ceil(max * 4 / 3) + 2) deny('encoding');
  let bytes;
  try {
    const s = value.replace(/-/g, '+').replace(/_/g, '/');
    bytes = Uint8Array.from(atob(s + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
  } catch { deny('encoding'); }
  if (bytes.length < min || bytes.length > max || encodeBase64url(bytes) !== value) deny('encoding');
  return bytes;
}
export function encodeBase64url(bytes) {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function equalBytes(a, b) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}
function joinBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a); out.set(b, a.length);
  return out;
}
function requireCrypto(crypto) {
  if (!crypto?.subtle || typeof crypto.getRandomValues !== 'function') deny('crypto_unavailable');
  return crypto;
}
export function newChallenge(crypto = globalThis.crypto) {
  const bytes = new Uint8Array(32);
  requireCrypto(crypto).getRandomValues(bytes);
  return encodeBase64url(bytes);
}
export async function challengeHash(challenge, crypto = globalThis.crypto) {
  const bytes = decodeBase64url(challenge, 32, 32);
  return encodeBase64url(new Uint8Array(await requireCrypto(crypto).subtle.digest('SHA-256', bytes)));
}
// WebAuthn ECDSA signatures are DER encoded, but WebCrypto ECDSA verify
// requires 64-byte IEEE-P1363. Reject nonminimal/negative DER integers.
export function derEs256ToRaw(der) {
  if (!(der instanceof Uint8Array) || der.length < 8 || der.length > 72 || der[0] !== 0x30 || der[1] !== der.length - 2) deny('signature_encoding');
  let at = 2;
  const integer = () => {
    if (der[at++] !== 0x02) deny('signature_encoding');
    const length = der[at++];
    if (!length || length > 33 || at + length > der.length) deny('signature_encoding');
    const part = der.slice(at, at + length); at += length;
    if (part[0] & 0x80 || (part.length > 1 && part[0] === 0 && !(part[1] & 0x80))) deny('signature_encoding');
    const unsigned = part[0] === 0 ? part.slice(1) : part;
    if (!unsigned.length || unsigned.length > 32) deny('signature_encoding');
    const padded = new Uint8Array(32); padded.set(unsigned, 32 - unsigned.length);
    return padded;
  };
  const r = integer(), s = integer();
  if (at !== der.length) deny('signature_encoding');
  return joinBytes(r, s);
}
export async function verifyAssertion({
  credential, expectedChallenge, expectedCredentialId, publicKeyJwk,
  previousSignCount = 0, crypto = globalThis.crypto
} = {}) {
  const subtle = requireCrypto(crypto).subtle;
  if (!credential || credential.type !== 'public-key' ||
      typeof expectedCredentialId !== 'string' || credential.id !== expectedCredentialId ||
      (credential.rawId && credential.rawId !== expectedCredentialId)) deny('credential_mismatch');
  // A server must supply the challenge from an unexpired, subject-bound attempt.
  decodeBase64url(expectedChallenge, 32, 32);
  decodeBase64url(expectedCredentialId, 16, 1024);
  if (!Number.isSafeInteger(previousSignCount) || previousSignCount < 0 || previousSignCount > 0xffffffff) deny('counter');
  if (!publicKeyJwk || publicKeyJwk.kty !== 'EC' || publicKeyJwk.crv !== 'P-256' ||
      publicKeyJwk.d || (publicKeyJwk.alg && publicKeyJwk.alg !== 'ES256') ||
      decodeBase64url(publicKeyJwk.x, 32, 32).length !== 32 ||
      decodeBase64url(publicKeyJwk.y, 32, 32).length !== 32) deny('public_key');
  const response = credential.response || {};
  const clientBytes = decodeBase64url(response.clientDataJSON, 10, 8192);
  let client;
  try { client = JSON.parse(fatal.decode(clientBytes)); } catch { deny('client_data'); }
  if (!client || client.type !== 'webauthn.get' ||
      client.challenge !== expectedChallenge || client.origin !== ORIGIN ||
      client.crossOrigin === true || client.topOrigin != null) deny('client_data');
  const auth = decodeBase64url(response.authenticatorData, 37, 4096);
  const expectedRpHash = new Uint8Array(await subtle.digest('SHA-256', utf8.encode(RP_ID)));
  if (!equalBytes(auth.slice(0, 32), expectedRpHash)) deny('rp_id');
  const flags = auth[32];
  if (!(flags & 0x01) || !(flags & 0x04) || (flags & 0x40) || (flags & 0x80) ||
      ((flags & 0x10) && !(flags & 0x08)) || auth.length !== 37) deny('authenticator_flags');
  const signCount = new DataView(auth.buffer, auth.byteOffset + 33, 4).getUint32(0);
  if (previousSignCount > 0 && signCount <= previousSignCount) deny('counter_rollback');
  const clientHash = new Uint8Array(await subtle.digest('SHA-256', clientBytes));
  const signed = joinBytes(auth, clientHash);
  const signature = derEs256ToRaw(decodeBase64url(response.signature, 8, 72));
  let valid = false;
  try {
    const key = await subtle.importKey('jwk', publicKeyJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    valid = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signature, signed);
  } catch { deny('public_key'); }
  if (!valid) deny('bad_signature');
  return Object.freeze({
    verified: true, credentialId: expectedCredentialId, signCount,
    backupEligible: Boolean(flags & 0x08), backedUp: Boolean(flags & 0x10),
    userVerified: true, rpId: RP_ID, origin: ORIGIN
  });
}
// These statements are intended for an isolated, reviewed D1 schema.
// The caller MUST validate server wallet identity, role, revocation, origin,
// CSRF and rate limits. No public endpoint is installed by this module.
export const ATTEMPT_CONSUME_SQL =
  'UPDATE quant_mail_webauthn_attempts SET consumed_at=? WHERE attempt_id=? AND subject=? AND purpose=? AND challenge_hash=? AND consumed_at IS NULL AND expires_at>? RETURNING attempt_id';
export const COUNTER_CAS_SQL =
  'UPDATE quant_mail_passkey_credentials SET sign_count=?,last_used_at=? WHERE credential_id=? AND subject=? AND sign_count=? AND revoked_at IS NULL RETURNING credential_id';
export async function consumeAttempt(db, { attemptId, subject, purpose, challenge, now = Date.now(), crypto = globalThis.crypto } = {}) {
  if (!db?.prepare || !/^[A-Za-z0-9_-]{16,128}$/.test(attemptId || '') ||
      typeof subject !== 'string' || subject.length < 8 ||
      !['login', 'register'].includes(purpose) || !Number.isSafeInteger(now)) deny('attempt_input');
  const digest = await challengeHash(challenge, crypto);
  const row = await db.prepare(ATTEMPT_CONSUME_SQL).bind(now, attemptId, subject, purpose, digest, now).first();
  return row?.attempt_id === attemptId;
}
export async function commitCounter(db, { credentialId, subject, previousSignCount, signCount, now = Date.now() } = {}) {
  if (!db?.prepare || typeof subject !== 'string' || subject.length < 8 ||
      !Number.isSafeInteger(now) || !Number.isSafeInteger(previousSignCount) ||
      !Number.isSafeInteger(signCount) || signCount < 0 || signCount > 0xffffffff ||
      previousSignCount < 0 || previousSignCount > 0xffffffff) deny('counter_input');
  decodeBase64url(credentialId, 16, 1024);
  if (previousSignCount > 0 && signCount <= previousSignCount) deny('counter_rollback');
  const row = await db.prepare(COUNTER_CAS_SQL).bind(signCount, now, credentialId, subject, previousSignCount).first();
  return row?.credential_id === credentialId;
}
