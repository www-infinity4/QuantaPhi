import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OWNER_MAIL_ALIASES,PASSKEY_RP_ID,PASSKEY_ORIGIN,strictAlias,
 isPasskeySiteReady,decodeOptions,safeCredentialJSON,runPasskeyCeremony} from '../quant-mail-passkeys.mjs';
import {ownerPasskeyEligibility} from '../workers/quant-mail/owner-passkey-guard.mjs';
const locationLike={hostname:'quantaphi.org',origin:'https://quantaphi.org'};
const owner='server-resolved-wallet-subject';
const verifier={
 mode:'login',alias:'kris@quantaphi.org',accountSubject:owner,configuredOwnerSubject:owner,
 verifiedPasskey:true,verifierRpId:'quantaphi.org',verifierOrigin:'https://quantaphi.org',
 userVerified:true,challengeConsumed:true,credentialOwnerSubject:owner,
 assertionAt:1770000000000,now:1770000000500
};
test('two configured owner aliases, no external or attacker-supplied aliases',()=>{
 assert.deepEqual(OWNER_MAIL_ALIASES,['kris@quantaphi.org','administrator@quantaphi.org']);
 assert.equal(strictAlias('Kris@QuantaPhi.org'),OWNER_MAIL_ALIASES[0]);
 assert.equal(strictAlias('administrator@QUANTAPHI.ORG'),OWNER_MAIL_ALIASES[1]);
 assert.equal(strictAlias('somebody@quantaphi.org'),null);
 assert.equal(PASSKEY_RP_ID,'quantaphi.org');
 assert.equal(PASSKEY_ORIGIN,'https://quantaphi.org');
});
test('passkey client requires HTTPS exact site and browser credential parser',()=>{
 assert.equal(isPasskeySiteReady(locationLike,true),true);
 assert.equal(isPasskeySiteReady({origin:'https://phish.quantaphi.org',hostname:'phish.quantaphi.org'},true),false);
 assert.equal(isPasskeySiteReady(locationLike,false),false);
 const Credential={
  parseCreationOptionsFromJSON:json=>({created:json.challenge}),
  parseRequestOptionsFromJSON:json=>({requested:json.challenge})
 };
 assert.deepEqual(decodeOptions({publicKey:{rp:{id:'quantaphi.org'},challenge:'abc',authenticatorSelection:{userVerification:'required'}}},'create',Credential),{created:'abc'});
 assert.deepEqual(decodeOptions({publicKey:{rpId:'quantaphi.org',challenge:'abc',userVerification:'required'}},'get',Credential),{requested:'abc'});
 assert.throws(()=>decodeOptions({publicKey:{rp:{id:'evil.example'},challenge:'a',authenticatorSelection:{userVerification:'required'}}},'create',Credential));
 assert.throws(()=>decodeOptions({publicKey:{rpId:'evil.example',challenge:'a',userVerification:'required'}},'get',Credential));
 assert.throws(()=>safeCredentialJSON({type:'password',toJSON:()=>({})}));
});
test('login requires signed server verification and yields only a server-established session',async()=>{
 let beginCount=0,endCount=0;
 const request=async(url,init)=>{
  assert.equal(init.credentials,'same-origin');
  assert.equal(init.method,'POST');
  const input=JSON.parse(init.body);
  assert.equal(input.alias,'kris@quantaphi.org');
  if(url.endsWith('/login/begin')){beginCount++;return {ok:true,json:async()=>({ok:true,attemptId:'server_attempt',publicKey:{rpId:'quantaphi.org',challenge:'server_challenge',userVerification:'required'}})};}
  if(url.endsWith('/login/finish')){endCount++;assert.equal(input.attemptId,'server_attempt');return {ok:true,json:async()=>({ok:true,passkeyVerified:true,alias:'kris@quantaphi.org',rpId:'quantaphi.org',sessionEstablished:true})};}
  throw Error('unexpected_route');
 };
 const Credential={parseRequestOptionsFromJSON:json=>({challenge:json.challenge})};
 const credentials={get:async({publicKey})=>{assert.equal(publicKey.challenge,'server_challenge');return {type:'public-key',toJSON:()=>({type:'public-key',id:'credential',response:{authenticatorData:'signed'}})};}};
 const result=await runPasskeyCeremony({kind:'login',alias:'kris@quantaphi.org',request,Credential,credentials,locationLike,secureContext:true});
 assert.equal(result.verified,true);assert.equal(result.sessionEstablished,true);
 assert.equal(beginCount,1);assert.equal(endCount,1);
});
test('enrollment refuses an unauthenticated wallet even before sending a request',async()=>{
 let calls=0;
 await assert.rejects(()=>runPasskeyCeremony({kind:'register',alias:'kris@quantaphi.org',
   walletToken:null,request:async()=>{calls++;},locationLike,secureContext:true,credentials:{},Credential:{}}),
  /verified_wallet_required/);
 assert.equal(calls,0);
});
test('registration requires server-stored credential, never merely local phone confirmation',async()=>{
 const request=async(url)=>{
  if(url.endsWith('/register/begin'))return {ok:true,json:async()=>({ok:true,attemptId:'abc',publicKey:{rp:{id:'quantaphi.org'},challenge:'xyz',authenticatorSelection:{userVerification:'required'}}})};
  return {ok:true,json:async()=>({ok:true,passkeyVerified:true,alias:'kris@quantaphi.org',rpId:'quantaphi.org',registrationStored:false})};
 };
 await assert.rejects(()=>runPasskeyCeremony({kind:'register',alias:'kris@quantaphi.org',
  walletToken:'sq_'+'A'.repeat(32),request,Credential:{parseCreationOptionsFromJSON:()=>({})},
  credentials:{create:async()=>({type:'public-key',toJSON:()=>({type:'public-key',id:'c'})})},
  locationLike,secureContext:true}),/passkey_registration_not_saved/);
});
test('admin alias cannot elevate privileges through an address choice',()=>{
 assert.equal(ownerPasskeyEligibility({...verifier}).allowed,true);
 assert.equal(ownerPasskeyEligibility({...verifier,alias:'administrator@quantaphi.org'}).reason,'admin_role_not_verified');
 assert.equal(ownerPasskeyEligibility({...verifier,alias:'administrator@quantaphi.org',adminRoleVerified:true}).allowed,true);
 assert.equal(ownerPasskeyEligibility({...verifier,alias:'administrator@quantaphi.org',adminRoleVerified:true,assertionAt:verifier.now-400000}).reason,'fresh_admin_step_up_required');
 assert.equal(ownerPasskeyEligibility({...verifier,accountSubject:'other-owner'}).allowed,false);
 assert.equal(ownerPasskeyEligibility({...verifier,credentialOwnerSubject:'attacker'}).allowed,false);
 assert.equal(ownerPasskeyEligibility({...verifier,verifierOrigin:'https://evil.example'}).allowed,false);
 assert.equal(ownerPasskeyEligibility({...verifier,verifiedPasskey:false}).allowed,false);
 assert.equal(ownerPasskeyEligibility({...verifier,challengeConsumed:false}).allowed,false);
 assert.equal(ownerPasskeyEligibility({...verifier,mode:'register'}).reason,'owner_session_required');
 assert.equal(ownerPasskeyEligibility({...verifier,mode:'register',verifiedOwnerSession:true}).allowed,true);
});
test('Quant Mail keeps passkey setup explicitly gated pending server implementation',()=>{
 const page=readFileSync(new URL('../quant-mail.html',import.meta.url),'utf8');
 assert.match(page,/quantMailPasskeyRegister" disabled/);
 assert.match(page,/quantMailPasskeyLogin" disabled/);
 assert.match(page,/administrator@quantaphi\.org/);
 assert.match(page,/quant-mail-passkeys\.mjs/);
 assert.match(page,/Mailbox delivery is not configured yet/);
});
