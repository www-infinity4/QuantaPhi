import {parseOwnerAliasRegistry} from './owner-passkeys.mjs';
const PREFIX='/api/quant-mail/passkeys';
const ORIGIN='https://quantaphi.org',RP_ID='quantaphi.org';
const json=(value,status=200,extra={})=>Response.json(value,{status,headers:{
 'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer','Vary':'Origin',...extra}});
const deny=(error,status=403)=>json({ok:false,error},status);
const cookieName='qp_owner_passkey';
export function authorizedOwnerWallet(request,identity,env){
 const token=request.headers.get('Authorization')||'';
 const subject=String(env.PASSKEY_OWNER_ACCOUNT_ID||'');
 return /^Bearer sq_[A-Za-z0-9_-]{32,}$/.test(token)
  &&subject.length>0&&subject.length<160
  &&typeof identity?.userId==='string'&&identity.userId===subject;
}

export function passkeyCookie(token,admin=false){
 return cookieName+'='+token+'; Path='+PREFIX+'; Secure; HttpOnly; SameSite=Strict; Max-Age='+(admin?'300':'43200');
}
async function readJson(request){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))
  throw Error('json_required');
 const raw=await request.text();
 if(raw.length>24000)throw Error('request_too_large');
 return JSON.parse(raw);
}
function errorCode(e){
 const name=String(e?.message||'');
 if(['verified_owner_required','owner_binding_conflict','passkey_limit','owner_alias_invalid',
 'passkey_response_invalid','challenge_invalid','passkey_verification_failed',
 'credential_exists_or_limit','alias_passkey_already_registered','passkey_unrecognized','credential_revoked',
 'counter_replay','passkey_record_invalid','passkey_rate_limited',
 'admin_role_verification_required'].includes(name))return name;
 return 'passkey_verification_failed';
}
export async function handleOwnerPasskeyRequest(request,env,verifyWallet){
 const url=new URL(request.url),suffix=url.pathname.slice(PREFIX.length);
 const allowed=new Set(['/status','/register/begin','/register/finish',
 '/login/begin','/login/finish','/session']);
 if(!allowed.has(suffix))return deny('not_found',404);
 if(!['GET','POST'].includes(request.method))return deny('method_not_allowed',405);
 if(request.method==='POST'&&request.headers.get('Origin')!==ORIGIN)return deny('origin_not_allowed');
 const registry=parseOwnerAliasRegistry(env.OWNER_EMAIL_ALIAS_REGISTRY);
 const enabled=String(env.PASSKEY_ENABLED||'')==='true'&&Boolean(registry&&env.CONNECTIONS&&env.BOT_WALLET?.fetch&&String(env.PASSKEY_OWNER_ACCOUNT_ID||''));
 const base={ok:true,enabled,registrationReady:enabled,loginReady:enabled,rpId:RP_ID};
 if(suffix==='/status'&&request.method==='GET')return json(base);
 if(!enabled)return json({ok:false,error:'passkey_service_not_ready'},503);
 const svc=env.CONNECTIONS.get(env.CONNECTIONS.idFromName('quant-mail-owner-passkeys-v1'));
 if(suffix==='/session'&&request.method==='GET'){
  const token=(request.headers.get('Cookie')||'').split(';').map(x=>x.trim())
   .find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);
  if(!token)return deny('passkey_session_required',401);
  const session=await svc.passkeyValidateSession({token});
  return session?.valid?json({ok:true,passkeyVerified:true,alias:session.alias,role:session.role})
   :deny('passkey_session_expired',401);
 }
 if(request.method!=='POST')return deny('method_not_allowed',405);
 // Authenticate a real owner wallet BEFORE inspecting the requested address.
 // Otherwise unauthenticated callers could probe the private allowlist by
 // comparing owner_alias_invalid with owner_verification_required.
 let enrollmentIdentity=null;
 if(suffix.startsWith('/register/')){
  try{enrollmentIdentity=await verifyWallet(request,env);}
  catch{return deny('owner_verification_required',401);}
  if(!authorizedOwnerWallet(request,enrollmentIdentity,env))
   return deny('owner_verification_required',403);
 }
 let body;
 try{body=await readJson(request);}catch{return deny('invalid_json',400);}
 const alias=body?.alias;
 if(typeof alias!=='string'||!Object.values(registry).includes(alias.toLowerCase().trim()))
  return deny('owner_alias_invalid',400);
 if(!body||JSON.stringify(body).length>24000)return deny('invalid_payload',400);
 try{
  if(suffix.startsWith('/register/')){
   // This identity was authenticated before the alias/JSON was inspected.
   const args={alias,subject:enrollmentIdentity.userId};
   const value=suffix==='/register/begin'
    ?await svc.passkeyRegisterBegin(args)
    :await svc.passkeyRegisterFinish({...args,attemptId:body.attemptId,credential:body.credential});
   return json({ok:true,...value});
  }
  if(suffix==='/login/begin'){
   const ip=request.headers.get('CF-Connecting-IP')||'anonymous';
   const ipHash=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)));
   const fingerprint=Array.from(ipHash.slice(0,12),x=>x.toString(16).padStart(2,'0')).join('');
   const value=await svc.passkeyLoginBegin({alias,fingerprint});
   return json({ok:true,...value});
  }
  if(suffix==='/login/finish'){
   let adminAuthorized=false;
   if(alias===registry.administrator){
    // Administrator is the second reserved alias of the SAME confirmed
    // owner subject. Require a fresh existing owner wallet device session
    // in addition to a user-verified WebAuthn assertion.
    const identity=await verifyWallet(request,env);
    if(!authorizedOwnerWallet(request,identity,env))
     return deny('admin_role_verification_required');
    // Owner wallet authentication alone is NOT administrator RBAC. A separate
    // trusted wallet-server claim must explicitly attest this exact subject.
    // Until that claim exists, administrator login deliberately fails closed.
    let proof;
    try{
     const wallet=await env.BOT_WALLET.fetch('https://wallet.internal/v1/wallet/passkey-owner',{
      headers:{Authorization:request.headers.get('Authorization')},
      signal:AbortSignal.timeout(9000)
     });
     if(!wallet.ok)return deny('admin_role_verification_required');
     proof=await wallet.json();
    }catch{return deny('admin_role_verification_required');}
    if(proof?.ok!==true||proof.ownerVerified!==true||proof.adminVerified!==true||
       typeof proof.userId!=='string'||proof.userId!==identity.userId)
     return deny('admin_role_verification_required');
    adminAuthorized=true;
   }
   const value=await svc.passkeyLoginFinish({alias,attemptId:body.attemptId,credential:body.credential,adminAuthorized});
   if(!value?.sessionEstablished||!value.sessionToken)return deny('passkey_session_unavailable');
   const {sessionToken,...publicValue}=value;
   return json(publicValue,200,{'Set-Cookie':passkeyCookie(sessionToken,alias===registry.administrator)});
  }
 }catch(error){
  const code=errorCode(error);
  return deny(code,code==='owner_verification_required'?403:400);
 }
 return deny('not_found',404);
}
export const PASSKEY_PREFIX=PREFIX;
