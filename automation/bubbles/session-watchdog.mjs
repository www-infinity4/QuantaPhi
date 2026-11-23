/** Watchdog is read-only; session cookie, refresh token, and wallet balances
 * must remain under their existing authorized provider/storage boundaries.
 */
export function inspectAccountSession({owner=false,sessionStatus,walletStatus,providerReauthAvailable=false}={}){
 if(!owner)return Object.freeze({action:'owner_authentication_required',restoredTokens:false,walletMutated:false});
 const action=sessionStatus==='guest'?'request_provider_reauthentication':
  sessionStatus==='authenticated'?'read_only_wallet_health_check':'verify_session_with_provider';
 return Object.freeze({action,sessionVerified:sessionStatus==='authenticated',
  walletStatus:walletStatus==='ok'?'reported_healthy':'unavailable_or_unverified',
  providerReauthAvailable:Boolean(providerReauthAvailable),restoredTokens:false,
  walletMutated:false,accountIsolationRequired:true});
}
