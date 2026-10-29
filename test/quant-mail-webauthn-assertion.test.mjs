import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import {
  RP_ID, ORIGIN, encodeBase64url, decodeBase64url, newChallenge, challengeHash,
  derEs256ToRaw, verifyAssertion, consumeAttempt, commitCounter,
  ATTEMPT_CONSUME_SQL, COUNTER_CAS_SQL
} from '../workers/quant-mail/webauthn-assertion-verifier.mjs';

const te = new TextEncoder();
const enc = bytes => encodeBase64url(bytes);
function derFromRaw(raw) {
  const integer = part => {
    let at = 0;
    while (at < 31 && part[at] === 0) at++;
    let value = part.slice(at);
    if (value[0] & 0x80) value = Uint8Array.from([0, ...value]);
    return Uint8Array.from([2, value.length, ...value]);
  };
  const a = integer(raw.slice(0, 32)), b = integer(raw.slice(32));
  return Uint8Array.from([0x30, a.length + b.length, ...a, ...b]);
}
async function fixture({flags = 0x05, count = 1, origin = ORIGIN, rp = RP_ID, challenge = newChallenge(webcrypto)} = {}) {
  const pair = await webcrypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
  const publicKeyJwk = await webcrypto.subtle.exportKey('jwk',pair.publicKey);
  const expectedCredentialId = newChallenge(webcrypto);
  const rpHash = new Uint8Array(await webcrypto.subtle.digest('SHA-256',te.encode(rp)));
  const auth = new Uint8Array(37);
  auth.set(rpHash); auth[32] = flags; new DataView(auth.buffer).setUint32(33,count);
  const client = te.encode(JSON.stringify({type:'webauthn.get',challenge,origin,crossOrigin:false}));
  const clientHash = new Uint8Array(await webcrypto.subtle.digest('SHA-256',client));
  const signed = new Uint8Array(auth.length + clientHash.length);
  signed.set(auth); signed.set(clientHash,auth.length);
  const raw = new Uint8Array(await webcrypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},pair.privateKey,signed));
  const credential = {id:expectedCredentialId,type:'public-key',response:{
    clientDataJSON:enc(client),authenticatorData:enc(auth),signature:enc(derFromRaw(raw))
  }};
  return {credential,expectedChallenge:challenge,expectedCredentialId,publicKeyJwk,previousSignCount:0,crypto:webcrypto};
}
const reject = (fn, code) => assert.rejects(fn,new RegExp('webauthn_'+code));

test('32-byte unpredictable challenges, strict canonical encoding and SHA256 digest',async()=>{
  const a=newChallenge(webcrypto),b=newChallenge(webcrypto);
  assert.notEqual(a,b);
  assert.equal(decodeBase64url(a,32,32).length,32);
  assert.equal((await challengeHash(a,webcrypto)).length,43);
  assert.throws(()=>decodeBase64url('Zh'),/webauthn_encoding/); // invalid unpadded trailing bits
  assert.throws(()=>decodeBase64url('AA=='),/webauthn_encoding/);
});
test('valid RP-bound, user-verified ES256 assertion returns evidence, not a session',async()=>{
  const f=await fixture({flags:0x1d,count:5});
  const result=await verifyAssertion(f);
  assert.equal(result.verified,true);
  assert.equal(result.userVerified,true);
  assert.equal(result.signCount,5);
  assert.equal(result.backupEligible,true);
  assert.equal(result.backedUp,true);
  assert.equal(result.rpId,'quantaphi.org');
  assert.equal(result.origin,'https://quantaphi.org');
  assert.equal('session' in result,false);
});
test('reject wrong origin, challenge, RP, credential and cross-origin assertions',async()=>{
  await reject(async()=>verifyAssertion(await fixture({origin:'https://phish.quantaphi.org'})),'client_data');
  const f=await fixture();
  await reject(()=>verifyAssertion({...f,expectedChallenge:newChallenge(webcrypto)}),'client_data');
  await reject(async()=>verifyAssertion(await fixture({rp:'evil.example'})),'rp_id');
  await reject(()=>verifyAssertion({...f,expectedCredentialId:newChallenge(webcrypto)}),'credential_mismatch');
  const client=JSON.parse(new TextDecoder().decode(decodeBase64url(f.credential.response.clientDataJSON)));
  client.crossOrigin=true;
  await reject(()=>verifyAssertion({...f,credential:{...f.credential,response:{...f.credential.response,clientDataJSON:enc(te.encode(JSON.stringify(client)))}}}),'client_data');
});
test('reject missing UP or UV, attested assertion, unsupported extension and invalid backup flags',async()=>{
  for(const flags of [0x00,0x01,0x04,0x45,0x85,0x15]){
    await reject(async()=>verifyAssertion(await fixture({flags})),'authenticator_flags');
  }
});
test('reject signature tampering, revoked-style key mismatch and counter rollback',async()=>{
  const f=await fixture({count:4});
  await reject(()=>verifyAssertion({...f,previousSignCount:4}),'counter_rollback');
  const bad={...f.credential,response:{...f.credential.response,signature:enc(Uint8Array.from([0x30,0x06,0x02,0x01,0x00,0x02,0x01,0x00,0x00]))}};
  await reject(()=>verifyAssertion({...f,credential:bad}),'signature_encoding');
  const other=await fixture();
  await reject(()=>verifyAssertion({...f,publicKeyJwk:other.publicKeyJwk}),'bad_signature');
  await reject(()=>verifyAssertion({...f,publicKeyJwk:{...f.publicKeyJwk,d:'private-key-material'}}),'public_key');
});
test('reject nonminimal DER encodings and trailing data',()=>{
  for(const bytes of [[0x30,0],[0x30,6,2,1,0,2,1,0,0],[0x30,6,2,1,0x80,2,1,1]]){
    assert.throws(()=>derEs256ToRaw(Uint8Array.from(bytes)),/webauthn_signature_encoding/);
  }
});
test('one-time challenge consumption uses a scoped atomic D1 update and fails closed on replay',async()=>{
  const challenge=newChallenge(webcrypto),id='attempt_1234567890abcdef';
  let consumed=false,query='';
  const db={prepare(sql){query=sql;return {bind(...args){
    assert.equal(args.length,6);
    assert.equal(args[1],id);
    assert.equal(args[2],'owner-subject-verified');
    assert.equal(args[3],'login');
    return {async first(){if(consumed)return null;consumed=true;return {attempt_id:id};}};
  }};}};
  assert.equal(await consumeAttempt(db,{attemptId:id,subject:'owner-subject-verified',purpose:'login',challenge,crypto:webcrypto}),true);
  assert.equal(await consumeAttempt(db,{attemptId:id,subject:'owner-subject-verified',purpose:'login',challenge,crypto:webcrypto}),false);
  assert.equal(query,ATTEMPT_CONSUME_SQL);
  assert.match(query,/consumed_at IS NULL/);
  assert.match(query,/expires_at>\?/);
});
test('credential counter compare-and-swap rejects races and rollback',async()=>{
  const id=newChallenge(webcrypto);let current=2,query='';
  const db={prepare(sql){query=sql;return {bind(next,now,credentialId,subject,prev){
    assert.equal(credentialId,id);assert.equal(subject,'owner-subject-verified');
    return {async first(){if(current!==prev)return null;current=next;return {credential_id:id};}};
  }};}};
  assert.equal(await commitCounter(db,{credentialId:id,subject:'owner-subject-verified',previousSignCount:2,signCount:3}),true);
  assert.equal(await commitCounter(db,{credentialId:id,subject:'owner-subject-verified',previousSignCount:2,signCount:4}),false);
  await reject(()=>commitCounter(db,{credentialId:id,subject:'owner-subject-verified',previousSignCount:3,signCount:3}),'counter_rollback');
  assert.equal(query,COUNTER_CAS_SQL);
  assert.match(query,/revoked_at IS NULL/);
});
