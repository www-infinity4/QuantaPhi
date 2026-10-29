/* Quant Mail recovery eligibility only. Not a token issuer or WebAuthn verifier.
 * SERVER-ONLY: call after independent cryptographic/OTP proof verification.
 * NEVER pass browser-provided "verified" booleans as trusted evidence.
 */
export const RECOVERY_METHODS=Object.freeze([
 'passkey','backup_security_key','external_email','authenticator','phone','offline_code'
]);
export const REQUIRED_RECOVERY_METHODS=3;
export const PROOF_MAX_AGE_MS=10*60*1000;
const TYPES=new Set(RECOVERY_METHODS);
const identifier=v=>typeof v==='string'&&v.length>=4&&v.length<=200;
const owner=v=>typeof v==='string'&&v.length>=8&&v.length<=160;
export function isExternalRecoveryEmail(email){
 if(typeof email!=='string'||email.length>254)return false;
 const normalized=email.trim().toLowerCase();
 return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)&&
  !normalized.endsWith('@quantaphi.org');
}
export function recoveryEligibility({accountId,challengeId,enrolledMethods,verifiedReceipts,at=Date.now()}={}){
 const base={eligible:false,status:'blocked',verifiedCount:0,required:REQUIRED_RECOVERY_METHODS,
  missing:RECOVERY_METHODS,reason:'unverified_recovery'};
 if(!owner(accountId)||!identifier(challengeId)||!Number.isFinite(at)||
    !Array.isArray(enrolledMethods)||!Array.isArray(verifiedReceipts))
  return {...base,reason:'invalid_recovery_context'};
 const enrolled=new Map();
 for(const method of enrolledMethods){
  if(!method||!TYPES.has(method.type)||method.accountId!==accountId||
     method.verified!==true||method.revoked===true||
     !identifier(method.identifier)||enrolled.has(method.type))continue;
  if(method.type==='external_email'&&!isExternalRecoveryEmail(method.identifier))continue;
  enrolled.set(method.type,method);
 }
 const accepted=new Set(),proofIds=new Set(),devices=new Set();
 for(const receipt of verifiedReceipts){
  if(!receipt||!TYPES.has(receipt.type)||receipt.accountId!==accountId||
    receipt.challengeId!==challengeId||receipt.serverVerified!==true||
    !Number.isFinite(receipt.verifiedAt)||receipt.verifiedAt>at||
    at-receipt.verifiedAt>PROOF_MAX_AGE_MS||
    !identifier(receipt.proofId)||proofIds.has(receipt.proofId))continue;
  const registered=enrolled.get(receipt.type);
  if(!registered||registered.identifier!==receipt.identifier||accepted.has(receipt.type))continue;
  if(['passkey','backup_security_key'].includes(receipt.type)){
   // Both passkey roles cannot count separately if backed by the same
   // authenticator/credential synchronization source.
   if(!identifier(receipt.independentAuthenticatorId)||devices.has(receipt.independentAuthenticatorId))continue;
   devices.add(receipt.independentAuthenticatorId);
  }
  proofIds.add(receipt.proofId);
  accepted.add(receipt.type);
 }
 const missing=RECOVERY_METHODS.filter(x=>!accepted.has(x));
 const verifiedCount=accepted.size,hasPasskey=accepted.has('passkey')||accepted.has('backup_security_key');
 if(verifiedCount<REQUIRED_RECOVERY_METHODS)
  return {...base,verifiedCount,missing,reason:'three_independent_verifications_required'};
 if(!hasPasskey)
  return {...base,verifiedCount,missing,status:'manual_review',reason:'passkey_unavailable_manual_recovery'};
 // Pure eligibility is NEVER approval to create a session, reset auth or
 // change a wallet. The caller must atomically consume challenges/one-time
 // codes and re-evaluate before an independently reviewed commit.
 return {eligible:true,status:'eligible_for_server_commit',verifiedCount,required:REQUIRED_RECOVERY_METHODS,
  missing,reason:'await_atomic_commit'};
}
export function evaluateOutboundCommunication(input={}){
 const channel=input.channel,kind=input.kind;
 const blocked=(reason)=>({allowed:false,reason});
 if(!['email','sms','voice','x_reply'].includes(channel))return blocked('unknown_channel');
 if(!['transactional','customer_response','marketing'].includes(kind))return blocked('unknown_purpose');
 if(input.blockedByRecipient===true||input.optedOut===true)return blocked('recipient_opted_out');
 if(input.accountAuthorized!==true||input.senderVerified!==true)return blocked('account_or_sender_not_authorized');
 if(input.verifiedRecipient!==true)return blocked('recipient_unverified');
 if(input.deduplicationKeyVerified!==true)return blocked('missing_idempotency');
 if(channel==='x_reply'){
  if(input.xWrittenAiBotApproval!==true||input.officialAuthorizedApi!==true)return blocked('x_ai_reply_approval_required');
  if(input.recipientExplicitOptIn!==true)return blocked('x_recipient_opt_in_required');
 }
 if(kind==='marketing'){
  // AI outbound sales campaigns require seller-specific permissions, not
  // generic website signup consent or scraping of prospective customers.
  if(input.consentSellerMatches!==true||input.recipientExplicitOptIn!==true||
    input.doNotCallClear!==true)return blocked('marketing_consent_required');
  if(['voice','sms'].includes(channel)&&input.expressWrittenConsent!==true)return blocked('written_consent_required');
  if(channel==='voice'&&(input.aiVoiceConsent!==true||input.aiIdentityDisclosureReady!==true||
    input.callHoursCompliant!==true))return blocked('ai_call_safeguards_required');
 }
 if(input.aiReadsPrivateContent===true&&input.aiAccessGranted!==true)return blocked('ai_content_permission_required');
 return {allowed:true,reason:'authorization_gates_passed_not_dispatched'};
}
