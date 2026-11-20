import {createHmac,timingSafeEqual} from 'node:crypto';
/** SIP webhook authenticity is one gate; it is NOT subscriber identity.
 * Provider must supply replay-protected delivery and app challenge proof.
 */
export function verifyDialerEvent({body,signature,secret,now=Date.now()}={}){
 if(typeof body!=='string'||body.length>4000||!secret||!/^sha256=[a-f0-9]{64}$/i.test(signature||''))throw Error('dialer_signature_required');
 const expected=Buffer.from(createHmac('sha256',secret).update(body).digest('hex'),'hex');
 const actual=Buffer.from(signature.slice(7),'hex');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw Error('dialer_signature_mismatch');
 let p;try{p=JSON.parse(body)}catch{throw Error('dialer_json_invalid')}
 if(p?.dialed!=='4-333-3333#'||!Number.isFinite(p.issuedAt)||Math.abs(now-p.issuedAt)>60000)throw Error('dialer_event_expired_or_unsupported');
 if(!/^[a-z0-9-]{12,80}$/i.test(p.nonce||'')||!/^[a-z0-9_-]{3,80}$/i.test(p.accountId||''))throw Error('dialer_identity_invalid');
 return Object.freeze({dialed:p.dialed,nonce:p.nonce,accountId:p.accountId,issuedAt:p.issuedAt,sipSignatureVerified:true});
}
export function planDialerSession(event,{ownerChallengeVerified=false,userApproved=false}={}){
 if(!event?.sipSignatureVerified)throw Error('dialer_signed_event_required');
 return Object.freeze({status:!ownerChallengeVerified?'challenge_required':!userApproved?'session_consent_required':'ready_to_create_session',
  accountId:event.accountId,dialed:event.dialed,nonce:event.nonce,
  sessionCreated:false,callbackSent:false,callerIdAuthenticated:false,
  next:'Require server-side single-use nonce, owner-device challenge, active SIP/WebRTC adapter and explicit callback confirmation.'});
}
