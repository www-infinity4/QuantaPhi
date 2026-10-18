import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authorizeConnection, PROVIDERS} from '../workers/bubbles-connections/authorization.mjs';
const connection = {id:'c1', userId:'alice', provider:'github', providerSubject:'123', credentialRef:'vault:c1', status:'connected', expiresAt:2000, grantedActions:['repository.read']};
const check = (changes = {}, record = connection) => authorizeConnection({userId:'alice', provider:'github', action:'repository.read', connection:record, now:1000, ...changes});
test('one user cannot use another user connection or the platform owner credential', () => {
  assert.equal(check({userId:'bob'}).reason, 'connection_required');
  assert.equal(check({}, {...connection, userId:'www-infinity4'}).ok, false);
});
test('provider authorization does not transfer across services', () => {
  assert.equal(check({provider:'google', action:'drive.read'}).ok, false);
  assert.equal(check({provider:'ebay', action:'bid.place'}).ok, false);
});
test('read permission does not imply write permission', () => {
  assert.equal(check({action:'repository.write'}).reason, 'consent_required');
  assert.equal(check().ok, true);
});
test('expired, revoked, missing and unverified connections fail closed', () => {
  for (const change of [{expiresAt:1000}, {expiresAt:undefined}, {status:'revoked'}, {providerSubject:''}, {credentialRef:''}]) assert.equal(check({}, {...connection,...change}).ok, false);
  assert.equal(check({}, null).ok, false);
  assert.equal(check({userId:''}).ok, false);
});
test('unsupported actions and inherited property names fail closed', () => {
  assert.equal(check({provider:'__proto__'}).ok, false);
  assert.equal(check({action:'admin.everything'}).ok, false);
});
test('planned providers do not claim a live connection or expose tokens', () => {
  assert.ok(Object.values(PROVIDERS).every(p => p.status === 'not_configured'));
  assert.equal(JSON.stringify(check()).includes('vault:'), false);
});
