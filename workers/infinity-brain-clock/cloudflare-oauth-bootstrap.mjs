// Single-purpose, owner-approved Cloudflare OAuth client bootstrap.
// NEVER returns API tokens, OAuth client secrets, or parent token material.
// Registered client starts PRIVATE; publication and domain verification are separate.
import {parentTokenManager,issueScopedCloudflareToken,TOKEN_MANAGER_ACCOUNT} from './cloudflare-token-broker.mjs';

export const OAUTH_BOOTSTRAP_SCOPES=Object.freeze([
 'user-details.read','memberships.read',
 'workers-scripts.admin','d1.read','d1.write','page.write',
 'workers-r2.read','workers-r2.write'
]);
const TARGET='bubbles-connections';
const CALLBACK='https://quantaphi.org/api/bubbles/connections/cloudflare/callback';
const SITE='https://quantaphi.org';
const STATE_KEY='cloudflare-oauth-client-bootstrap-v1';
const PLAN_KEY='cloudflare-oauth-client-bootstrap-plan-v1';
const TTL=5*60*1000;
const NO_CACHE={cache:'no-store'};
const error=(code,status=409)=>({ok:false,status:'blocked',error:code,httpStatus:status});
const safeReceipt=(state)=>({ok:true,status:state.status,clientId:state.clientId||null,
 clientName:'Bubbles AI - QuantaPhi',redirectUri:CALLBACK,
 publicVisibilityVerified:false,secretExposed:false,accountAccessGranted:false,
 installed:state.status==='installed',needsPublicReview:true});
const toBytes=s=>new TextEncoder().encode(s);
async function vaultKey(env){
 if(typeof env.BOT_WORK_SECRET!=='string'||env.BOT_WORK_SECRET.length<24)throw Error('vault_key_unavailable');
 const source=await crypto.subtle.importKey('raw',toBytes(env.BOT_WORK_SECRET),'HKDF',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'HKDF',hash:'SHA-256',
  salt:toBytes(env.WRITER_OWNER_HASH||'owner'),
  info:toBytes('Bubbles-Cloudflare-OAuth-Client-Bootstrap-v1')},
 source,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function seal(secret,env){
 const key=await vaultKey(env),iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,toBytes(secret));
 return {v:1,iv:Array.from(iv),cipher:Array.from(new Uint8Array(cipher))};
}
async function unseal(stored,env){
 if(stored?.v!==1||!Array.isArray(stored.iv)||!Array.isArray(stored.cipher))
  throw Error('vault_data_invalid');
 const key=await vaultKey(env);
 const value=await crypto.subtle.decrypt({name:'AES-GCM',iv:new Uint8Array(stored.iv)},
  key,new Uint8Array(stored.cipher));
 return new TextDecoder().decode(value);
}
async function api(path,token,{method='GET',body,request=fetch}={}){
 const res=await request('https://api.cloudflare.com/client/v4'+path,{
  method,headers:{Authorization:'Bearer '+token,Accept:'application/json',
   ...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),
  redirect:'error',signal:AbortSignal.timeout(15000)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok||data?.success!==true)throw Error('cloudflare_http_'+res.status);
 return data.result;
}
function ephemeralPlan(capability,now){
 return {capability,requestId:'cft_'+crypto.randomUUID(),expiresAt:now+60*60*1000};
}
async function revokeChild(parent,id,request){
 if(!id)return false;
 try{await api('/user/tokens/'+encodeURIComponent(id),parent,{method:'DELETE',request});return true}
 catch{return false}
}
export async function planOAuthClient(storage,env,{now=Date.now()}={}){
 const existing=await storage.get(STATE_KEY);
 if(existing?.status==='installed')return {...safeReceipt(existing),alreadyConfigured:true};
 if(existing?.clientId&&existing.status==='ready_for_install')
  return {...safeReceipt(existing),resumeInstallation:true};
 if(existing?.status==='creating')return error('previous_registration_outcome_unverified');
 const parent=parentTokenManager(env);
 const plan={id:'ocp_'+crypto.randomUUID(),createdAt:now,expiresAt:now+TTL,
  status:'approval_required'};
 await storage.put(PLAN_KEY,plan);
 return {ok:true,status:'owner_approval_required',requestId:plan.id,
  expiresAt:plan.expiresAt,clientName:'Bubbles AI - QuantaPhi',
  redirectUri:CALLBACK,clientUri:SITE,
  clientTokenMethod:'client_secret_basic',usesPKCE:true,
  scopes:[...OAUTH_BOOTSTRAP_SCOPES],visibility:'private',
  requiresOwnerApproval:true,managerConfigured:!!parent,
  secretWillBeStoredOnlyInServer:true,createsShortLivedScopedApiTokens:true,
  risk:'Creates one Cloudflare OAuth application and writes three server-side Worker secrets; users still approve access separately'};
}
export async function confirmOAuthClient(storage,body,env,{now=Date.now(),request=fetch}={}){
 const parent=parentTokenManager(env);
 if(!parent)return error('cloudflare_token_manager_not_configured',503);
 if(typeof env.BOT_WORK_SECRET!=='string'||env.BOT_WORK_SECRET.length<24)
  return error('cloudflare_token_vault_unavailable',503);
 const plan=await storage.get(PLAN_KEY);
 if(!plan||!/^ocp_[0-9a-f-]{36}$/.test(body?.requestId||'')||
  plan.id!==body.requestId||plan.expiresAt<=now)return error('owner_approval_missing_or_expired',403);
 const prior=await storage.get(STATE_KEY);
 if(prior?.status==='installed')return safeReceipt(prior);
 if(prior?.status==='creating')return error('previous_registration_outcome_unverified');
 if(!['approval_required','reusable'].includes(plan.status))return error('owner_approval_already_used');
 const claimed=await storage.transaction(async txn=>{
  const current=await txn.get(PLAN_KEY);
  if(current?.id!==plan.id||!['approval_required','reusable'].includes(current.status))return false;
  await txn.put(PLAN_KEY,{...current,status:'in_progress'});
  return true;
 });
 if(!claimed)return error('owner_approval_already_used');
 let clientToken=null,writerToken=null;
 try{
  const created=prior?.status==='ready_for_install';
  // The token manager exists already on Brain; issue bounded one-hour
  // USER tokens with only OAuth Clients Write / Workers Scripts Edit.
  writerToken=await issueScopedCloudflareToken(ephemeralPlan('workers-script-edit',now),parent,{now,request});
  const workerPath='/accounts/'+TOKEN_MANAGER_ACCOUNT+'/workers/scripts/'+TARGET;
  const settings=await api(workerPath+'/settings',writerToken.secret,{request});
  const names=(settings?.bindings||[]).map(x=>x.name);
  if(!names.includes('CONNECTIONS')||!names.includes('CONNECTION_KEYRING'))
   throw Error('connection_worker_binding_drift');
  if(!created&&names.includes('CLOUDFLARE_CLIENT_ID'))
   throw Error('oauth_client_already_configured_check_existing');
  let state=prior;
  if(!created){
   // Fail closed on an interrupted create. Never blindly retry a mutation
   // that could have succeeded without an accessible receipt.
   await storage.put(STATE_KEY,{status:'creating',startedAt:now});
   clientToken=await issueScopedCloudflareToken(ephemeralPlan('oauth-client-write',now),parent,{now,request});
   const registration=await api('/accounts/'+TOKEN_MANAGER_ACCOUNT+'/oauth_clients',clientToken.secret,{
    request,method:'POST',body:{
     client_name:'Bubbles AI - QuantaPhi',
     response_types:['code'],
     grant_types:['authorization_code','refresh_token'],
     token_endpoint_auth_method:'client_secret_basic',
     redirect_uris:[CALLBACK],client_uri:SITE,
     allowed_cors_origins:[SITE],
     scopes:[...OAUTH_BOOTSTRAP_SCOPES],
     optional_scopes:OAUTH_BOOTSTRAP_SCOPES.filter(x=>!['user-details.read','memberships.read'].includes(x))
    }});
   const id=String(registration?.client_id||registration?.id||'');
   const secret=String(registration?.client_secret||'');
   if(!/^[a-zA-Z0-9._~-]{10,300}$/.test(id)||secret.length<16)
    throw Error('oauth_registration_receipt_missing_secret');
   state={status:'ready_for_install',clientId:id,encryptedSecret:await seal(secret,env),
    createdAt:now,scopes:[...OAUTH_BOOTSTRAP_SCOPES]};
   await storage.put(STATE_KEY,state);
  }
  const secret=await unseal(state.encryptedSecret,env);
  // Workers secrets API never returns secret values; do not log responses.
  for(const [name,text] of [
   ['CLOUDFLARE_CLIENT_ID',state.clientId],
   ['CLOUDFLARE_CLIENT_SECRET',secret],
   ['CLOUDFLARE_OAUTH_ALLOWED_SCOPES',state.scopes.join(' ')]
  ])await api(workerPath+'/secrets',writerToken.secret,{method:'PUT',request,
    body:{name,type:'secret_text',text}});
  const verified=await api(workerPath+'/settings',writerToken.secret,{request});
  const installedNames=new Set((verified?.bindings||[]).map(x=>x.name));
  if(!['CLOUDFLARE_CLIENT_ID','CLOUDFLARE_CLIENT_SECRET','CLOUDFLARE_OAUTH_ALLOWED_SCOPES']
    .every(n=>installedNames.has(n)))throw Error('oauth_secrets_readback_unverified');
  state={status:'installed',clientId:state.clientId,createdAt:state.createdAt,
   installedAt:Date.now(),scopes:state.scopes};
  await storage.put(STATE_KEY,state); // discard encrypted secret after verified installation
  await storage.put(PLAN_KEY,{...plan,status:'completed'});
  return safeReceipt(state);
 }catch(e){
  const saved=await storage.get(STATE_KEY);
  const safe=String(e?.message||'').replace(/[^a-z0-9_]/gi,'_').slice(0,85);
  const retry=saved?.status==='ready_for_install';
  await storage.put(PLAN_KEY,{...plan,status:retry?'reusable':'blocked'});
  return error(retry?'client_created_secret_install_retryable':'oauth_bootstrap_blocked_'+safe,503);
 }finally{
  const [a,b]=await Promise.all([revokeChild(parent,clientToken?.id,request),revokeChild(parent,writerToken?.id,request)]);
  // Child tokens expire in one hour even if an explicit revocation fails.
  // Never return or log their values.
  void a;void b;
 }
}
