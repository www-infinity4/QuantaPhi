/**
 * Source-only QuantaPhi event bridge. Reuses verified Wallet identity; no public
 * route or production bindings are installed by this module.
 */
import {walletIdentity} from '../../bubbles-connections/router.mjs';

const ORIGINS = new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const EVENT_TYPES = new Set([
  'card_click','card_view','card_follow','card_unfollow','card_hide',
  'card_share','card_collect','card_like'
]);
const MAX_BODY_BYTES = 64 * 1024;
const MAX_EVENTS = 100;
const ID = /^[A-Za-z0-9._:-]{8,128}$/;
const TARGET = /^(?:card|media|carousel):[A-Za-z0-9._:-]{1,128}$/;
const enc = new TextEncoder();
function json(body,status) {
  return Response.json(body,{status,headers:{
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff'
  }});
}
function record(value) {
  return value!==null && typeof value==='object' && !Array.isArray(value);
}
async function readLimitedJSON(request) {
  const stream=request.body?.getReader();
  if(!stream) throw Object.assign(Error('malformed_json'),{status:400});
  let bytes=0,body='';
  const decoder=new TextDecoder('utf-8',{fatal:true});
  try {
    while(true) {
      const chunk=await stream.read();
      if(chunk.done) break;
      bytes+=chunk.value.byteLength;
      if(bytes>MAX_BODY_BYTES) {
        await stream.cancel();
        throw Object.assign(Error('body_too_large'),{status:413});
      }
      body+=decoder.decode(chunk.value,{stream:true});
    }
    body+=decoder.decode();
    return JSON.parse(body);
  }catch(error) {
    if(error?.status===413) throw error;
    throw Object.assign(Error('malformed_json'),{status:400});
  }
}
function validateEvents(value) {
  if(!record(value)) return {status:400,error:'queries_required'};
  if(Object.hasOwn(value,'user') || Object.hasOwn(value,'userId')) {
    return {status:422,error:'client_identity_not_accepted'};
  }
  if(!Array.isArray(value.queries) || !value.queries.length || value.queries.length>MAX_EVENTS) {
    return {status:400,error:'queries_required'};
  }
  const seen=new Set(),events=[];
  for(const entry of value.queries) {
    if(!record(entry) || typeof entry.id!=='string' || !ID.test(entry.id) ||
       seen.has(entry.id) || typeof entry.event_type!=='string' ||
       typeof entry.target_entity!=='string' || typeof entry.numerical_value!=='number' ||
       !Number.isFinite(entry.numerical_value) ||
       Math.abs(entry.numerical_value)>1_000_000) return {status:422,error:'invalid_event'};
    const type=entry.event_type.trim().toLowerCase();
    const target=entry.target_entity.trim().toLowerCase();
    if(!EVENT_TYPES.has(type) || !TARGET.test(target)) {
      return {status:422,error:'unsupported_event'};
    }
    seen.add(entry.id);
    events.push({
      id:entry.id,event_type:type,target_entity:target,
      numerical_value:entry.numerical_value
    });
  }
  return {events};
}
async function keyFor(secret) {
  return crypto.subtle.importKey('raw',enc.encode(secret),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
}
async function signHex(key,message) {
  return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode(message)))]
    .map(byte=>byte.toString(16).padStart(2,'0')).join('');
}
function authorizedConsent(value,now) {
  return value?.policy_version==='v1' &&
    Number.isSafeInteger(value.consented_at_ms) &&
    value.consented_at_ms>0 && value.consented_at_ms<=now &&
    value.revoked_at_ms==null;
}

/**
 * Host Worker should invoke only behind an explicit feature flag. Requires:
 * BOT_WALLET, EVENT_CONSENT_DB, EVENTS_SERVICE (service binding),
 * USER_IDENTITY_HMAC_SECRET, INGEST_TOKEN.
 * Consent rows can be issued only by a separately reviewed, authenticated
 * consent workflow; no consent-writing endpoint is provided here.
 */
export async function handleWalletEventIngress(request,env) {
  const url=new URL(request.url);
  if(url.pathname!=='/api/quant-events') return json({error:'not_found'},404);
  if(request.method!=='POST') return json({error:'post_required'},405);
  if(env?.EVENTS_BRIDGE_ENABLED!=='true') return json({error:'event_collection_disabled'},503);
  if(!ORIGINS.has(request.headers.get('origin')||'')) return json({error:'origin_not_allowed'},403);
  if(!/^Bearer sq_[A-Za-z0-9_-]{32,}$/.test(request.headers.get('authorization')||'')) {
    return json({error:'wallet_session_required'},401);
  }
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||'')) {
    return json({error:'json_required'},415);
  }
  if(!env.BOT_WALLET?.fetch || !env.EVENT_CONSENT_DB?.prepare ||
     !env.EVENTS_SERVICE?.fetch || !env.USER_IDENTITY_HMAC_SECRET || !env.INGEST_TOKEN) {
    return json({error:'event_bridge_unavailable'},503);
  }
  const length=Number(request.headers.get('content-length')||0);
  if(Number.isFinite(length)&&length>MAX_BODY_BYTES) return json({error:'body_too_large'},413);
  let parsed;
  try { parsed=validateEvents(await readLimitedJSON(request)); }
  catch(error) {return json({error:error?.message||'malformed_json'},error?.status||400);}
  if(!parsed.events) return json({error:parsed.error},parsed.status);

  let identity;
  try { identity=await walletIdentity(request,env); }
  catch {return json({error:'wallet_session_not_verified'},401);}
  const rawId=String(identity?.userId||'');
  if(!rawId || rawId.length>160) return json({error:'wallet_session_not_verified'},401);

  let key,userId;
  try {
    key=await keyFor(env.USER_IDENTITY_HMAC_SECRET);
    userId='ev_'+await signHex(key,'quant-events-user-v1\n'+rawId);
  } catch {return json({error:'identity_signing_unavailable'},503);}
  let consent;
  try {
    consent=await env.EVENT_CONSENT_DB.prepare(
      "SELECT consented_at_ms, revoked_at_ms, policy_version FROM quant_event_consents WHERE user_id=? AND purpose=? LIMIT 1"
    ).bind(userId,'analytics').first();
  } catch {return json({error:'consent_validation_unavailable'},503);}
  if(!authorizedConsent(consent,Date.now())) return json({error:'analytics_consent_required'},403);

  const timestamp=Date.now();
  const proof=await signHex(key,['v1',userId,timestamp,'0'].join('\n'));
  const sent=new Request('https://quant-events.internal/v1/events',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+env.INGEST_TOKEN,
      'x-quant-identity-time':String(timestamp),
      'x-quant-identity-geo':'0',
      'x-quant-identity-signature':proof
    },
    body:JSON.stringify({
      user:{id:userId,device_type:'unknown'},
      queries:parsed.events
    })
  });
  try {
    const upstream=await env.EVENTS_SERVICE.fetch(sent);
    if(upstream.status!==202) return json({error:'ingestion_not_accepted'},503);
    const receipt=await upstream.json();
    if(receipt?.persisted!==false || receipt?.accepted!==parsed.events.length ||
       receipt?.received!==parsed.events.length) {
      return json({error:'invalid_ingestion_receipt'},502);
    }
    return json({received:parsed.events.length,accepted:parsed.events.length,persisted:false},202);
  } catch {return json({error:'ingestion_unavailable'},503);}
}

// Separately deployable Worker entrypoint: the site uses a private service binding.
export default {fetch: handleWalletEventIngress};
