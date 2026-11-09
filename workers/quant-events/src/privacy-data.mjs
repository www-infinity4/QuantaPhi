/**
 * Owner-controlled, first-party analytics export and erasure.
 * No production deployment or activation is implied by this source.
 *
 * A minimal revoked-consent tombstone intentionally remains after erasure:
 * queued events cannot be reinserted after deletion, and a later opt-in
 * begins a new consent epoch. The Wallet and all coin ledgers are untouched.
 */
import {walletIdentity} from '../../bubbles-connections/router.mjs';

const ORIGINS=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const PAGE_SIZE=100;
const enc=new TextEncoder();
const json=(body,status=200)=>Response.json(body,{status,headers:{
  'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'
}});
async function ownerId(request,env){
  const identity=await walletIdentity(request,env);
  const raw=String(identity?.userId??'');
  if(!raw||raw.length>160)throw Error('wallet_session_not_verified');
  const key=await crypto.subtle.importKey('raw',enc.encode(env.USER_IDENTITY_HMAC_SECRET),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const sig=new Uint8Array(await crypto.subtle.sign('HMAC',key,enc.encode('quant-events-user-v1\n'+raw)));
  return 'ev_'+[...sig].map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function eraseBody(request){
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type')||''))
    return {error:'json_required',status:415};
  if(Number(request.headers.get('content-length')||0)>256)
    return {error:'body_too_large',status:413};
  const reader=request.body?.getReader();
  if(!reader)return {error:'malformed_json',status:400};
  let body='',bytes=0;
  const decoder=new TextDecoder('utf-8',{fatal:true});
  try{
    while(true){
      const part=await reader.read();
      if(part.done)break;
      bytes+=part.value.byteLength;
      if(bytes>256){await reader.cancel();return {error:'body_too_large',status:413};}
      body+=decoder.decode(part.value,{stream:true});
    }
    body+=decoder.decode();
    const parsed=JSON.parse(body);
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||
       Object.keys(parsed).length!==2||parsed.action!=='erase'||
       parsed.confirm!=='DELETE_MY_ANALYTICS')return {error:'explicit_erasure_confirmation_required',status:422};
    return {valid:true};
  }catch{return {error:'malformed_json',status:400};}
}
function parseCursor(request){
  const url=new URL(request.url);
  if([...url.searchParams.keys()].some(key=>key!=='cursor'))return {error:'invalid_cursor'};
  const encoded=url.searchParams.get('cursor');
  if(encoded===null)return {cursor:null};
  if(encoded.length>152)return {error:'invalid_cursor'};
  const dot=encoded.indexOf('.');
  if(dot<1)return {error:'invalid_cursor'};
  const timestamp=encoded.slice(0,dot),id=encoded.slice(dot+1);
  if(!/^[0-9]{1,16}$/.test(timestamp)||!/^[A-Za-z0-9._:-]{8,128}$/.test(id))
    return {error:'invalid_cursor'};
  const at=Number(timestamp);
  if(!Number.isSafeInteger(at)||at<=0)return {error:'invalid_cursor'};
  return {cursor:{at,id}};
}
export async function handleEventData(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/api/quant-events/data')return json({error:'not_found'},404);
  if(request.method!=='GET'&&request.method!=='POST')return json({error:'method_not_allowed'},405);
  if(env?.EVENT_DATA_MANAGEMENT_ENABLED!=='true')return json({error:'data_management_disabled'},503);

  const origin=request.headers.get('origin');
  const safeGet=request.method==='GET'&&!origin&&ORIGINS.has(url.origin)&&
    request.headers.get('sec-fetch-site')==='same-origin';
  if(!ORIGINS.has(origin)&&!safeGet)return json({error:'origin_not_allowed'},403);
  if(!/^Bearer sq_[A-Za-z0-9_-]{32,}$/.test(request.headers.get('authorization')||''))
    return json({error:'wallet_session_required'},401);
  if(!env.BOT_WALLET?.fetch||!env.USER_IDENTITY_HMAC_SECRET||!env.EVENT_CONSENT_DB?.prepare)
    return json({error:'data_service_unavailable'},503);
  const cursor=request.method==='GET'?parseCursor(request):null;
  if(cursor?.error)return json({error:cursor.error},422);
  let confirmation;
  if(request.method==='POST'){
    confirmation=await eraseBody(request);
    if(!confirmation.valid)return json({error:confirmation.error},confirmation.status);
    if(!env.EVENT_CONSENT_DB?.batch)return json({error:'data_service_unavailable'},503);
  }
  let id;
  try{id=await ownerId(request,env);}
  catch{return json({error:'wallet_session_not_verified'},401);}
  const db=env.EVENT_CONSENT_DB;
  try{
    if(request.method==='GET'){
      const c=cursor.cursor;
      const query=c
        ? 'SELECT id,event_type,target_entity,numerical_value,created_at_ms FROM events WHERE user_id=? AND (created_at_ms<? OR (created_at_ms=? AND id<?)) ORDER BY created_at_ms DESC,id DESC LIMIT 101'
        : 'SELECT id,event_type,target_entity,numerical_value,created_at_ms FROM events WHERE user_id=? ORDER BY created_at_ms DESC,id DESC LIMIT 101';
      const result=c
        ? await db.prepare(query).bind(id,c.at,c.at,c.id).all()
        : await db.prepare(query).bind(id).all();
      if(!Array.isArray(result?.results))return json({error:'export_unavailable'},503);
      const rows=result.results.slice(0,PAGE_SIZE).map(row=>({
        id:row.id,event_type:row.event_type,target_entity:row.target_entity,
        numerical_value:row.numerical_value,created_at_ms:row.created_at_ms
      }));
      const last=rows.at(-1);
      const nextCursor=result.results.length>PAGE_SIZE&&last
        ? last.created_at_ms+'.'+last.id : null;
      return json({events:rows,nextCursor});
    }
    // D1.batch is transactional. Revocation + deletion must commit together;
    // a failed operation must never be reported as a successful erasure.
    const now=Date.now();
    const statements=[
      db.prepare("INSERT INTO quant_event_consents (user_id,purpose,policy_version,consented_at_ms,revoked_at_ms) VALUES (?,'analytics','v1',?,?) ON CONFLICT(user_id,purpose) DO UPDATE SET revoked_at_ms=MAX(quant_event_consents.consented_at_ms,COALESCE(quant_event_consents.revoked_at_ms,0),excluded.revoked_at_ms)")
        .bind(id,now,now),
      db.prepare('DELETE FROM events WHERE user_id=?').bind(id),
      db.prepare('DELETE FROM users WHERE id=?').bind(id)
    ];
    const results=await db.batch(statements);
    if(!Array.isArray(results)||results.length!==3||results.some(r=>r?.success!==true))
      return json({error:'erasure_not_confirmed'},503);
    const verified=await db.prepare(
      "SELECT (SELECT COUNT(*) FROM events WHERE user_id=?) AS events,(SELECT COUNT(*) FROM users WHERE id=?) AS users,(SELECT COUNT(*) FROM quant_event_consents WHERE user_id=? AND purpose='analytics' AND revoked_at_ms IS NOT NULL) AS revoked"
    ).bind(id,id,id).first();
    if(verified?.events!==0||verified?.users!==0||verified?.revoked!==1)
      return json({error:'erasure_not_confirmed'},503);
    return json({erased:true,remainingEvents:0,analyticsConsent:false});
  }catch{
    return json({error:'data_operation_unavailable'},503);
  }
}
