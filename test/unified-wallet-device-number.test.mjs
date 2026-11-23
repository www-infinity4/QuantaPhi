import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import * as identityCore from '../workers/unified-wallet/device-number-core.mjs';
import {
 issueNumericDeviceId,createWalletDeviceLink,accountDeviceChain,
 deviceChallengeMessage,verifyDeviceChallenge
} from '../workers/unified-wallet/device-number-core.mjs';

const crypto=webcrypto, ACCOUNT='account-user-a', SECOND='account-user-b';
test('New World user number stays stable across devices and retains all 256 hash bits as decimal text',async()=>{
 const a=await identityCore.globalUserIdentity(ACCOUNT,crypto);
 const again=await identityCore.globalUserIdentity(ACCOUNT,crypto);
 const b=await identityCore.globalUserIdentity(SECOND,crypto);
 assert.deepEqual(a,again);
 assert.match(a.number,/^\d{78}$/);
 assert.notEqual(a.number,b.number);
 const expected=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('QuantaPhi-global-user-id-v1\n'+ACCOUNT));
 assert.equal(BigInt(a.number),BigInt('0x'+Buffer.from(expected).toString('hex')));
 assert.equal(a.version,'nwi-v1');assert.equal(a.scope,'quantaphi');assert.equal(a.isAuthentication,false);
 assert.doesNotMatch(JSON.stringify(a),/account-user|username|email|token|balance/);
 assert.deepEqual(await identityCore.globalUserIdentity(42,crypto),await identityCore.globalUserIdentity('42',crypto));
});
test('global user identity requires a canonical account key and cryptographic hashing',async()=>{
 for(const value of [null,undefined,'',' account-a','a\nb','a'.repeat(160),{},1.5,NaN,Number.MAX_SAFE_INTEGER+1])
  await assert.rejects(identityCore.globalUserIdentity(value,crypto),/account/i);
 await assert.rejects(identityCore.globalUserIdentity(ACCOUNT,{}),/cryptographic/i);
});
async function pair(){
 const kp=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',kp.publicKey);
 return {privateKey:kp.privateKey,jwk};
}
test('numeric app IDs use a CSPRNG and keep their exact 39 digits',()=>{
 const list=Array.from({length:50},()=>issueNumericDeviceId(crypto));
 assert.ok(list.every(x=>/^\d{39}$/.test(x)),'store as string; never JS Number');
 assert.equal(new Set(list).size,list.length,'unique random app installations in sample');
 assert.throws(()=>issueNumericDeviceId({getRandomValues:()=>new Uint8Array(16)}),/cryptographic randomness/i);
});
test('the account, not a number copied from another phone, authorizes enrollment',async()=>{
 const id=issueNumericDeviceId(crypto),{jwk}=await pair();
 const linked=createWalletDeviceLink({
  verifiedAccountId:ACCOUNT,requestedAccountId:ACCOUNT,deviceNumber:id,
  publicKeyJwk:jwk,consent:true
 });
 assert.equal(linked.deviceNumber,id);
 assert.equal(linked.accountId,ACCOUNT);
 assert.equal(linked.status,'pending_challenge_verification');
 assert.equal(linked.grants.walletRead,false,'number enrollment alone must never grant balance access');
 assert.equal(linked.grants.walletSpend,false);
 assert.throws(()=>createWalletDeviceLink({verifiedAccountId:ACCOUNT,requestedAccountId:SECOND,deviceNumber:id,publicKeyJwk:jwk,consent:true}),/account mismatch/i);
 assert.throws(()=>createWalletDeviceLink({verifiedAccountId:ACCOUNT,requestedAccountId:ACCOUNT,deviceNumber:id,publicKeyJwk:jwk,consent:false}),/consent/i);
 assert.throws(()=>createWalletDeviceLink({verifiedAccountId:ACCOUNT,requestedAccountId:ACCOUNT,deviceNumber:'1'.repeat(11),publicKeyJwk:jwk,consent:true}),/device number/i);
});
test('an account-scoped numeric chain is only a fingerprint of authorized member devices',async()=>{
 const a=issueNumericDeviceId(crypto),b=issueNumericDeviceId(crypto);
 const chain=await accountDeviceChain({verifiedAccountId:ACCOUNT,linkedAccountId:ACCOUNT,deviceNumbers:[b,a]},crypto);
 assert.match(chain.fingerprint,/^[0-9a-f]{64}$/);
 assert.equal(chain.deviceCount,2);
 assert.equal(chain.isAuthentication,false);
 assert.equal(chain.fingerprint,(await accountDeviceChain({verifiedAccountId:ACCOUNT,linkedAccountId:ACCOUNT,deviceNumbers:[a,b]},crypto)).fingerprint);
 assert.notEqual(chain.fingerprint,(await accountDeviceChain({verifiedAccountId:SECOND,linkedAccountId:SECOND,deviceNumbers:[a,b]},crypto)).fingerprint);
 await assert.rejects(accountDeviceChain({verifiedAccountId:ACCOUNT,linkedAccountId:SECOND,deviceNumbers:[a,b]},crypto),/account mismatch/i);
 await assert.rejects(accountDeviceChain({verifiedAccountId:ACCOUNT,linkedAccountId:ACCOUNT,deviceNumbers:[a,a]},crypto),/duplicate/i);
});
test('server-only verified account with a fresh signed P-256 challenge identifies enrolled device',async()=>{
 const id=issueNumericDeviceId(crypto),another=issueNumericDeviceId(crypto),{jwk,privateKey}=await pair();
 const challenge=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
 const issuedAt=1763850000000,now=issuedAt+10000;
 const message=deviceChallengeMessage({accountId:ACCOUNT,deviceNumber:id,challenge});
 const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},privateKey,new TextEncoder().encode(message)));
 const params={verifiedAccountId:ACCOUNT,linkedAccountId:ACCOUNT,deviceNumber:id,enrolledDeviceNumber:id,
  challenge,signature,publicKeyJwk:jwk,issuedAt,now,used:false,crypto};
 assert.equal(await verifyDeviceChallenge(params),true);
 assert.equal(await verifyDeviceChallenge({...params,deviceNumber:another,enrolledDeviceNumber:another}),false,'copying a number never supplies a signature');
 assert.equal(await verifyDeviceChallenge({...params,linkedAccountId:SECOND}),false);
 assert.equal(await verifyDeviceChallenge({...params,used:true}),false);
 assert.equal(await verifyDeviceChallenge({...params,now:issuedAt+301000}),false);
 assert.equal(await verifyDeviceChallenge({...params,signature:new Uint8Array(signature.map(x=>x^1))}),false);
});
test('standalone number cannot authorize an account without registered P-256 signature',async()=>{
 const id=issueNumericDeviceId(crypto);
 const result=await verifyDeviceChallenge({
  verifiedAccountId:ACCOUNT,linkedAccountId:ACCOUNT,deviceNumber:id,enrolledDeviceNumber:id,
  challenge:'A'.repeat(43),publicKeyJwk:null,signature:null,
  issuedAt:1763850000000,now:1763850010000,used:false,crypto
 });
 assert.equal(result,false);
});

test('canonical signed message refuses account identifiers containing separators or newlines',()=>{
 const number='1'.repeat(39),challenge='A'.repeat(43);
 assert.throws(()=>deviceChallengeMessage({accountId:'account\\nforged',deviceNumber:number,challenge}),/invalid device challenge/i);
});
