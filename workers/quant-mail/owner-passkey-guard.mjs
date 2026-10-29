/* Quant Mail owner/passkey authorization boundary.
 * Source-only guard; an actual WebAuthn verifier and persistent registry
 * must cryptographically validate all assertions before calling this.
 */
export const OWNER_ALIASES=Object.freeze(['kris@quantaphi.org','administrator@quantaphi.org']);
export const REQUIRED_RP='quantaphi.org';
export const REQUIRED_ORIGIN='https://quantaphi.org';
const STEP_UP_WINDOW_MS=5*60*1000;
export function ownerPasskeyEligibility({
 mode,alias,accountSubject,configuredOwnerSubject,
 verifiedOwnerSession=false,verifiedPasskey=false,
 verifierRpId,verifierOrigin,userVerified=false,
 challengeConsumed=false,credentialOwnerSubject,
 adminRoleVerified=false,assertionAt,now=Date.now()
}={}){
 const denied=reason=>({allowed:false,reason});
 if(!['register','login'].includes(mode))return denied('unknown_operation');
 if(!OWNER_ALIASES.includes(alias))return denied('unknown_owner_alias');
 if(typeof configuredOwnerSubject!=='string'||configuredOwnerSubject.length<8||
   typeof accountSubject!=='string'||accountSubject!==configuredOwnerSubject)
   return denied('owner_identity_not_verified');
 if(mode==='register'&&verifiedOwnerSession!==true)return denied('owner_session_required');
 if(verifiedPasskey!==true||challengeConsumed!==true||
    userVerified!==true||verifierRpId!==REQUIRED_RP||
    verifierOrigin!==REQUIRED_ORIGIN||credentialOwnerSubject!==accountSubject)
   return denied('passkey_verification_required');
 if(alias==='administrator@quantaphi.org'){
   if(adminRoleVerified!==true)return denied('admin_role_not_verified');
   if(!Number.isFinite(now)||!Number.isFinite(assertionAt)||
      assertionAt>now||now-assertionAt>STEP_UP_WINDOW_MS)
     return denied('fresh_admin_step_up_required');
 }
 return {allowed:true,reason:'eligible_for_server_session_commit',subject:accountSubject,
   role:alias==='administrator@quantaphi.org'?'administrator':'owner'};
}
