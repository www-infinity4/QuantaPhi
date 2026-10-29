import test from 'node:test';
import assert from 'node:assert/strict';
import {RECOVERY_METHODS,REQUIRED_RECOVERY_METHODS,recoveryEligibility,
 isExternalRecoveryEmail,evaluateOutboundCommunication} from '../workers/quant-mail/recovery-communication-policy.mjs';
const accountId='account_owner_123',challengeId='challenge_from_server_123456',at=1770000000000;
const enroll=(type,identifier)=>({type,identifier,accountId,verified:true,revoked:false});
const receipt=(type,identifier,proofId,independentAuthenticatorId)=>
 ({type,identifier,proofId:'proof-'+proofId,accountId,challengeId,serverVerified:true,verifiedAt:at-2000,independentAuthenticatorId});
const pass=enroll('passkey','credential-1'),mail=enroll('external_email','outside@gmail.com'),
 auth=enroll('authenticator','totp-enrollment-1'),phone=enroll('phone','+15550001111'),
 backup=enroll('backup_security_key','credential-2'),offline=enroll('offline_code','recovery-credential-1');
const P=receipt('passkey','credential-1','p1','authenticator-a'),
 M=receipt('external_email','outside@gmail.com','p2'),
 A=receipt('authenticator','totp-enrollment-1','p3'),
 B=receipt('backup_security_key','credential-2','p4','authenticator-b');
const check=(enrolledMethods,verifiedReceipts,options={})=>recoveryEligibility({accountId,challengeId,enrolledMethods,verifiedReceipts,at,...options});
test('six available recovery methods and three proofs; eligibility never creates a session',()=>{
 assert.equal(RECOVERY_METHODS.length,6);
 assert.equal(REQUIRED_RECOVERY_METHODS,3);
 assert.deepEqual(check([pass,mail,auth],[P,M]).eligible,false);
 const decision=check([pass,mail,auth],[P,M,A]);
 assert.equal(decision.eligible,true);
 assert.equal(decision.status,'eligible_for_server_commit');
 assert.equal(decision.verifiedCount,3);
 assert.equal(Object.hasOwn(decision,'token'),false);
});
test('proofs are bound to the same wallet, challenge, enrolled method and freshness',()=>{
 const cases=[
  {...M,accountId:'someone_else'}, {...M,challengeId:'another-challenge'},
  {...M,serverVerified:false},{...M,verifiedAt:at-600001},{...M,verifiedAt:at+1},
  {...M,identifier:'wrong@gmail.com'}, {...M,proofId:P.proofId}
 ];
 for(const bad of cases){
  const r=check([pass,mail,auth],[P,bad,A]);
  assert.equal(r.eligible,false,JSON.stringify(bad));
 }
 assert.equal(check([pass,mail,auth],[P,M,A],{accountId:'wrong'}).eligible,false);
 assert.equal(check([pass,mail,auth],[P,M,A],{challengeId:'wrong'}).eligible,false);
});
test('only active verified and external recovery emails count',()=>{
 assert.equal(isExternalRecoveryEmail('outside@gmail.com'),true);
 assert.equal(isExternalRecoveryEmail('backup@quantaphi.org'),false);
 assert.equal(isExternalRecoveryEmail('other@QUANTAPHI.ORG'),false);
 const internal=enroll('external_email','kris@quantaphi.org');
 const r=check([pass,internal,auth],[P,receipt('external_email','kris@quantaphi.org','p2'),A]);
 assert.equal(r.eligible,false);
 assert.equal(check([pass,{...mail,revoked:true},auth],[P,M,A]).eligible,false);
});
test('two passkeys from one authenticator count only once',()=>{
 const collocated={...B,independentAuthenticatorId:'authenticator-a'};
 const r=check([pass,backup,mail],[P,collocated,M]);
 assert.equal(r.verifiedCount,2);
 assert.equal(r.eligible,false);
 const separate=check([pass,backup,mail],[P,B,M]);
 assert.equal(separate.eligible,true);
});
test('three weaker proofs without passkey get manual review, never automatic recovery',()=>{
 const r=check([mail,auth,phone,offline],[M,A,receipt('phone','+15550001111','p5')]);
 assert.equal(r.eligible,false);
 assert.equal(r.status,'manual_review');
 assert.equal(r.reason,'passkey_unavailable_manual_recovery');
});
test('AI marketing and X replies fail closed without scoped consent',()=>{
 const base={channel:'voice',kind:'marketing',accountAuthorized:true,senderVerified:true,
  verifiedRecipient:true,deduplicationKeyVerified:true,recipientExplicitOptIn:true,
  consentSellerMatches:true,doNotCallClear:true};
 assert.equal(evaluateOutboundCommunication(base).allowed,false);
 assert.equal(evaluateOutboundCommunication({...base,expressWrittenConsent:true}).allowed,false);
 assert.equal(evaluateOutboundCommunication({...base,expressWrittenConsent:true,aiVoiceConsent:true,
  aiIdentityDisclosureReady:true,callHoursCompliant:true}).allowed,true);
 assert.equal(evaluateOutboundCommunication({...base,expressWrittenConsent:true,aiVoiceConsent:true,
  aiIdentityDisclosureReady:true,callHoursCompliant:true,optedOut:true}).allowed,false);
 assert.equal(evaluateOutboundCommunication({channel:'voice',kind:'transactional',accountAuthorized:true,
  senderVerified:true,verifiedRecipient:true,deduplicationKeyVerified:true,aiIdentityDisclosureReady:true}).allowed,false);
 const x={...base,channel:'x_reply',kind:'customer_response'};
 assert.equal(evaluateOutboundCommunication(x).reason,'x_ai_reply_approval_required');
 assert.equal(evaluateOutboundCommunication({...x,xWrittenAiBotApproval:true,officialAuthorizedApi:true}).allowed,true);
 assert.equal(evaluateOutboundCommunication({...x,xWrittenAiBotApproval:true,officialAuthorizedApi:true,
  recipientExplicitOptIn:false}).allowed,false);
});
test('private mail content cannot be inspected without separate AI permission',()=>{
 const call={channel:'email',kind:'customer_response',accountAuthorized:true,senderVerified:true,
  verifiedRecipient:true,deduplicationKeyVerified:true,aiReadsPrivateContent:true};
 assert.equal(evaluateOutboundCommunication(call).reason,'ai_content_permission_required');
 assert.equal(evaluateOutboundCommunication({...call,aiAccessGranted:true}).allowed,true);
});
