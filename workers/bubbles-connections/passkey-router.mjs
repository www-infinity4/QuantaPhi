const PREFIX='/api/quant-mail/passkeys';
const ORIGIN='https://quantaphi.org',RP_ID='quantaphi.org';
const json=(value,status=200,extra={})=>Response.json(value,{status,headers:{
 'Cache-Control':'no-store, private','X-Content-Type-Options':'nosniff',
 'Referrer-Policy':'no-referrer','Vary':'Origin',...extra}});
const deny=(error,status=403)=>json({ok:false,error},status);
const cookieName='qp_owner_passkey';
export function passkeyCookie(token){
 return cookieName+'='+token+'; Path='+PREFIX+'; Secure; HttpOnly; SameSite=Strict; Max-Age=43200';
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
 'credential_exists_or_limit','passkey_unrecognized','credential_revoked',
 'counter_replay','passkey_record_invalid'].includes(name))return name;
 return 'passkey_verification_failed';
}
export async function handleOwnerPasskeyRequest(request,env,verifyWallet){
 const url=new URL(request.url),suffix=url.pathname.slice(PREFIX.length);
 const allowed=new Set(['/status','/register/begin','/register/finish',
 '/login/begin','/login/finish','/session']);
 if(!allowed.has(suffix))return deny('not_found',404);
 if(!['GET','POST'].includes(request.method))return deny('method_not_allowed',405);
 if(request.method==='POST'&&request.headers.get('Origin')!==ORIGIN)return deny('origin_not_allowed');
 const enabled=String(env.PASSKEY_ENABLED||'')==='true'&&Boolean(env.CONNECTIONS&&env.BOT_WALLET?.fetch);
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
 let body;
 try{body=await readJson(request);}catch{return deny('invalid_json',400);}
 const alias=body?.alias;
 if(typeof alias!=='string'||!['kris@quantaphi.org','administrator@quantaphi.org'].includes(alias))
  return deny('owner_alias_invalid',400);
 if(!body||JSON.stringify(body).length>24000)return deny('invalid_payload',400);
 try{
  if(suffix.startsWith('/register/')){
   const identity=await verifyWallet(request,env);
   if(!identity?.userId||request.headers.get('Authorization')?.startsWith('Bearer bc_'))
    return deny('owner_wallet_required',401);
   // Only the Unified Wallet may assert owner subject by matching its
   // server-configured RECOVERY_OWNER_ACCOUNT_ID; never use a browser-supplied role.
   const auth=await env.BOT_WALLET.fetch('https://wallet.internal/v1/wallet/passkey-owner',{
    headers:{Authorization:request.headers.get('Authorization')||''},
    signal:AbortSignal.timeout(9000)});
   const proof=await auth.json().catch(()=>({}));
   if(!auth.ok||proof?.ok!==true||proof?.ownerVerified!==true)
    return deny('owner_verification_required');
   const args={alias,subject:identity.userId};
   const value=suffix==='/register/begin'
    ?await svc.passkeyRegisterBegin(args)
    :await svc.passkeyRegisterFinish({...args,attemptId:body.attemptId,credential:body.credential});
   return json({ok:true,...value});
  }
  if(suffix==='/login/begin'){
   const value=await svc.passkeyLoginBegin({alias});
   return json({ok:true,...value});
  }
  if(suffix==='/login/finish'){
   const value=await svc.passkeyLoginFinish({alias,attemptId:body.attemptId,credential:body.credential});
   if(!value?.sessionEstablished||!value.sessionToken)return deny('passkey_session_unavailable');
   const {sessionToken,...publicValue}=value;
   return json(publicValue,200,{'Set-Cookie':passkeyCookie(sessionToken)});
  }
 }catch(error){
  const code=errorCode(error);
  return deny(code,code==='owner_verification_required'?403:400);
 }
 return deny('not_found',404);
}
export const PASSKEY_PREFIX=PREFIX;
