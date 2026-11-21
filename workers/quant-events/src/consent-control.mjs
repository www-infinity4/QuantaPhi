/**
 * Explicit, per-Wallet-account analytics preferences.
 * This module never enables ingestion or writes events, wallet credits, or
 * device/location profiles. Hosts must separately enable consent management.
 */
import {walletIdentity} from '../../bubbles-connections/router.mjs';

const ORIGINS=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const enc=new TextEncoder();
const POLICY='v1';
const REPLY={policyVersion:POLICY,location:false};
const json=(value,status=200)=>Response.json(value,{status,headers:{
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'
}});
async function pseudonym(identity,secret) {
  const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode('quant-events-user-v1\n'+identity)));
  return 'ev_'+[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function valid(value,now) {
  return value?.policy_version===POLICY && Number.isSafeInteger(value.consented_at_ms) &&
    value.consented_at_ms>0 && value.consented_at_ms<=now && value.revoked_at_ms==null;
}
async function readPost(request) {
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||'')) {
    throw {status:415,error:'json_required'};
  }
  if(Number(request.headers.get('content-length')||0)>1024) throw {status:413,error:'body_too_large'};
  const body=await request.text();
  if(enc.encode(body).length>1024) throw {status:413,error:'body_too_large'};
  let data;
  try {data=JSON.parse(body);}
  catch {throw {status:400,error:'malformed_json'};}
  if(!data||typeof data!=='object'||Array.isArray(data)||
     Object.hasOwn(data,'user')||Object.hasOwn(data,'userId')||Object.hasOwn(data,'user_id')) {
    throw {status:422,error:'client_identity_not_accepted'};
  }
  if(data.action==='grant'&&data.opt_in===true&&data.policy_version===POLICY &&
     Object.keys(data).every(k=>['action','opt_in','policy_version'].includes(k))) return 'grant';
  if(data.action==='revoke'&&Object.keys(data).length===1) return 'revoke';
  throw {status:422,error:'invalid_consent_action'};
}
export async function handleEventConsent(request,env) {
  const url=new URL(request.url);
  if(url.pathname!=='/api/quant-events/consent') return json({error:'not_found'},404);
  if(request.method!=='GET'&&request.method!=='POST') return json({error:'method_not_allowed'},405);
  if(env?.EVENT_CONSENT_MANAGEMENT_ENABLED!=='true') return json({error:'consent_management_disabled'},503);
  const origin=request.headers.get('origin');
  const sameOriginRead=request.method==='GET'&&!origin&&ORIGINS.has(url.origin)&&
    request.headers.get('sec-fetch-site')==='same-origin';
  if(!ORIGINS.has(origin)&&!sameOriginRead) return json({error:'origin_not_allowed'},403);
  if(!/^Bearer sq_[A-Za-z0-9_-]{32,}$/.test(request.headers.get('authorization')||'')) {
    return json({error:'wallet_session_required'},401);
  }
  if(!env.BOT_WALLET?.fetch||!env.USER_IDENTITY_HMAC_SECRET||!env.EVENT_CONSENT_DB?.prepare) {
    return json({error:'consent_service_unavailable'},503);
  }
  let action=null;
  if(request.method==='POST'){
    try {action=await readPost(request);}
    catch(err){return json({error:err.error||'invalid_request'},err.status||400);}
  }
  let identity;
  try {identity=await walletIdentity(request,env);}
  catch {return json({error:'wallet_session_not_verified'},401);}
  const rawId=String(identity?.userId??'');
  if(!rawId||rawId.length>160) return json({error:'wallet_session_not_verified'},401);
  let id;
  try {id=await pseudonym(rawId,env.USER_IDENTITY_HMAC_SECRET);}
  catch {return json({error:'consent_signer_unavailable'},503);}
  try {
    if(action==='grant'){
      const now=Date.now();
      await env.EVENT_CONSENT_DB.prepare(
        "INSERT INTO quant_event_consents (user_id,purpose,policy_version,consented_at_ms,revoked_at_ms) VALUES (?,'analytics','v1',?,NULL) ON CONFLICT(user_id,purpose) DO UPDATE SET policy_version='v1',consented_at_ms=MAX(excluded.consented_at_ms,COALESCE(quant_event_consents.revoked_at_ms,0)+1),revoked_at_ms=NULL"
      ).bind(id,now).run();
    } else if(action==='revoke') {
      await env.EVENT_CONSENT_DB.prepare(
        "UPDATE quant_event_consents SET revoked_at_ms=MAX(consented_at_ms,?) WHERE user_id=? AND purpose='analytics' AND revoked_at_ms IS NULL"
      ).bind(Date.now(),id).run();
    }
    const row=await env.EVENT_CONSENT_DB.prepare(
      "SELECT policy_version,consented_at_ms,revoked_at_ms FROM quant_event_consents WHERE user_id=? AND purpose='analytics' LIMIT 1"
    ).bind(id).first();
    return json({enabled:valid(row,Date.now()),...REPLY});
  }catch {
    return json({error:'consent_database_unavailable'},503);
  }
}
