import test from 'node:test';
import assert from 'node:assert/strict';
import {INFINITY_ACCEPTED_BRANDS} from '../infinity-accepted-catalog.mjs';
import {CARD_LAUNCHER_MANIFESTS,cardLauncherManifest,cardLauncherInventory,validateLauncherManifest} from '../android/card-launchers/card-launcher-catalog.mjs';

test('all 116 existing accepted cards have one stable owned-origin launcher identity',()=>{
 assert.equal(INFINITY_ACCEPTED_BRANDS.length,116);
 assert.equal(CARD_LAUNCHER_MANIFESTS.length,116);
 assert.equal(new Set(CARD_LAUNCHER_MANIFESTS.map(x=>x.cardId)).size,116);
 assert.equal(new Set(CARD_LAUNCHER_MANIFESTS.map(x=>x.applicationId)).size,116);
 for(const card of INFINITY_ACCEPTED_BRANDS){
  const m=cardLauncherManifest(card.id);
  assert.ok(m,card.id);
  assert.equal(m.cardId,card.id);
  assert.equal(m.displayName,'QuantaPhi · '+card.name);
  assert.equal(m.entryUrl,'https://quantaphi.org/?card='+encodeURIComponent(card.id));
  assert.deepEqual(m.allowedOrigins,['https://quantaphi.org']);
  assert.match(m.applicationId,/^org\.quantaphi\.cards\.[a-z][a-z0-9_]*$/);
  assert.equal(validateLauncherManifest(m),true);
 }
});
test('manifest is source-only: no APK, privileged WebView, TWA claim or third-party impersonation',()=>{
 for(const m of CARD_LAUNCHER_MANIFESTS){
  assert.equal(m.releaseState,'source_only_unverified');
  assert.equal(m.launchMode,'owned_site_external_browser');
  assert.equal(m.thirdPartyPublisherApp,false);
  assert.equal(m.apkAvailable,false);
  assert.equal(m.twaVerified,false);
  assert.equal(m.signingVerified,false);
  assert.deepEqual(m.nativePermissions,[]);
  assert.equal(Object.isFrozen(m),true);
 }
});
test('unregistered or tampered card manifests cannot acquire release authority',()=>{
 for(const id of ['__proto__','constructor','google','durable-not-real','https://evil.example'])assert.equal(cardLauncherManifest(id),null);
 const real=CARD_LAUNCHER_MANIFESTS[0];
 for(const patch of [{entryUrl:'https://evil.example/'},{apkAvailable:true},{nativePermissions:['CAMERA']},{thirdPartyPublisherApp:true},{applicationId:'org.fake.app'},{releaseState:'approved'},{extra:'unreviewed'}]){
  assert.equal(validateLauncherManifest({...real,...patch}),false,JSON.stringify(patch));
 }
 const copy=cardLauncherInventory();copy.pop();
 assert.equal(cardLauncherInventory().length,116);
});
