/* Owner-scoped wallet email delivery preference.
 * Google OAuth proves the mailbox; Bubbles' verified wallet proves the owner.
 * No digest is ever sent until an authenticated, audited sender is provisioned.
 */
const CADENCES=new Set(['daily','weekly']);
export async function walletEmailPreference(service,{userId,action='read',cadence='weekly',connectionId}){
 const prefix=await service.namespace(userId),key=prefix+'wallet-email-digest:v1';
 const old=await service.storage.get(key);
 if(action==='read'){
  if(!old)return {ok:true,enabled:false,cadence:'weekly',status:'not_enrolled',deliveryEnabled:false};
  const connected=await service.storage.get(prefix+'connection:'+old.connectionId);
  const verified=connected?.userId===userId&&connected?.provider==='google'&&
   connected?.status==='connected'&&connected?.verifiedEmail===old.email&&
   connected?.revision===old.connectionRevision;
  return {ok:true,enabled:verified&&old.enabled===true,cadence:old.cadence,
   email:verified?old.email:null,
   status:verified?'pending_email_sender_setup':'verification_expired',
   deliveryEnabled:false};
 }
 if(action==='disable'){
  await service.storage.delete(key);
  return {ok:true,enabled:false,cadence:'weekly',status:'disabled',deliveryEnabled:false};
 }
 if(action!=='enroll'||!CADENCES.has(cadence))throw Error('invalid_wallet_email_cadence');
 if(typeof connectionId!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(connectionId))
  throw Error('verified_google_connection_required');
 const connection=await service.storage.get(prefix+'connection:'+connectionId);
 if(connection?.userId!==userId||connection?.provider!=='google'||
    connection?.status!=='connected'||typeof connection?.verifiedEmail!=='string'||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(connection.verifiedEmail))
  throw Error('verified_google_connection_required');
 const value={enabled:true,cadence,email:connection.verifiedEmail,
   connectionId,connectionRevision:connection.revision,enrolledAt:Date.now()};
 await service.storage.put(key,value);
 return {ok:true,enabled:true,cadence,email:value.email,
  status:'pending_email_sender_setup',deliveryEnabled:false};
}
