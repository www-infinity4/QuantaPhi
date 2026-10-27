// Synchronize Bubbles' REAL Cloudflare OAuth client registration with its
// server-side allowlist. Never create a new OAuth client, modify other secrets,
// edit Cloudflare security/DNS, or infer grants from selected-scope counts.
import {parentTokenManager,issueScopedCloudflareToken,TOKEN_MANAGER_ACCOUNT} from './cloudflare-token-broker.mjs';
const CLIENT_ID='8f676e020d9ff91a2951e415d144c9b7';
const CALLBACK='https://quantaphi.org/api/bubbles/connections/cloudflare/callback';
const WORKER='bubbles-connections';
const PLAN_KEY='bubbles-cloudflare-registered-scopes-plan-v1';
const TTL=5*60*1000;
const EXPECTED=386;
const fail=(code,status=409)=>({ok:false,status:'blocked',error:code,httpStatus:status});
const sanitize=s=>String(s||'').replace(/[^a-z0-9_-]/gi,'_').slice(0,90);
const getResult=async(path,token,{method='GET',body,request=fetch}={})=>{
 const response=await request('https://api.cloudflare.com/client/v4'+path,{
  method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{}),
  redirect:'error',signal:AbortSignal.timeout(18000)});
 const json=await response.json().catch(()=>({}));
 if(!response.ok||json?.success!==true)throw Error('cloudflare_http_'+response.status);
 return json.result;
};
async function revoke(parent,id,request){
 if(!id)return;
 try{await getResult('/user/tokens/'+encodeURIComponent(id),parent,{method:'DELETE',request})}catch{}
}
export async function planBubblesScopeSync(storage,env,{now=Date.now()}={}){
 const plan={id:'css_'+crypto.randomUUID(),expiresAt:now+TTL,status:'pending'};
 await storage.put(PLAN_KEY,plan);
 return {ok:true,status:'owner_approval_required',requestId:plan.id,
  expiresAt:plan.expiresAt,clientIdPrefix:CLIENT_ID.slice(0,16),expectedScopeCount:EXPECTED,
  managerConfigured:Boolean(parentTokenManager(env)),
  target:'CLOUDFLARE_OAUTH_ALLOWED_SCOPES_PART_1..3',
  scope:'Read the existing Cloudflare OAuth client; synchronize three size-safe Worker bindings only',
  deletesClient:false,createsClient:false,changesDns:false,changesWallet:false,
  requiresOwnerApproval:true,loginStillRequiresConsent:true};
}
export async function confirmBubblesScopeSync(storage,body,env,{
 now=Date.now(),request=fetch,issue=issueScopedCloudflareToken
}={}){
 const plan=await storage.get(PLAN_KEY);
 if(!plan||!/^css_[a-f0-9-]{36}$/.test(body?.requestId||'')||
   plan.id!==body.requestId||plan.expiresAt<=now)return fail('scope_sync_owner_approval_missing_or_expired',403);
 const parent=parentTokenManager(env);
 if(!parent)return fail('cloudflare_token_manager_not_configured',503);
 const claimed=await storage.transaction(async txn=>{
  const p=await txn.get(PLAN_KEY);
  if(p?.id!==plan.id||p.status!=='pending')return false;
  await txn.put(PLAN_KEY,{...p,status:'in_progress'});
  return true;
 });
 if(!claimed)return fail('scope_sync_approval_already_used');
 let reader=null,writer=null,wrote=false;
 try{
  const mintPlan=capability=>({capability,requestId:'cft_'+crypto.randomUUID(),expiresAt:now+60*60*1000});
  reader=await issue(mintPlan('oauth-client-read'),parent,{now,request});
  const registration=await getResult('/accounts/'+TOKEN_MANAGER_ACCOUNT+
   '/oauth_clients/'+CLIENT_ID,reader.secret,{request});
  if(registration?.client_id!==CLIENT_ID&&registration?.id!==CLIENT_ID)
   throw Error('oauth_client_identity_mismatch');
  if(!(registration?.redirect_uris||[]).includes(CALLBACK))
   throw Error('oauth_client_callback_mismatch');
  // Cloudflare may include OAuth protocol scopes automatically when refresh
  // tokens are enabled. These are NOT the 386 project permission checkboxes.
  const rawScopes=registration?.scopes;
  if(!Array.isArray(rawScopes))throw Error('oauth_client_scope_list_missing');
  const protocol=new Set(['openid','offline','offline_access']);
  const scopes=rawScopes.filter(s=>!protocol.has(s));
  if(scopes.length!==EXPECTED)throw Error('oauth_client_scope_count_not_386');
  if(!scopes.every(s=>typeof s==='string'&&/^[a-zA-Z][\w.-]{1,100}$/.test(s))||
    new Set(scopes).size!==scopes.length)throw Error('oauth_client_scopes_invalid');
  const existing=await request('https://quantaphi.org/api/bubbles/connections/scope-inventory',{
   headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
  const catalog=existing.ok?await existing.json().catch(()=>({})):{};
  const cloudflare=catalog.ok===true&&catalog.configured===true?catalog:null;
  if(cloudflare?.clientIdPrefix!==CLIENT_ID.slice(0,16))
   throw Error('active_bubbles_client_does_not_match');
  // We have verified the registered scope inventory AND that this is the live client.
  writer=await issue(mintPlan('workers-script-edit'),parent,{now,request});
  const prefix='/accounts/'+TOKEN_MANAGER_ACCOUNT+'/workers/scripts/'+WORKER;
  const before=await getResult(prefix+'/settings',writer.secret,{request});
  const names=(before?.bindings||[]).map(x=>x.name);
  if(!['CLOUDFLARE_CLIENT_ID','CLOUDFLARE_CLIENT_SECRET',
    'CLOUDFLARE_OAUTH_ALLOWED_SCOPES','CONNECTIONS','CONNECTION_KEYRING'].every(n=>names.includes(n)))
    throw Error('bubbles_worker_binding_drift');
  if(Number(cloudflare?.scopeInventory?.serverAllowlistCount)===EXPECTED)
   return {ok:true,status:'already_synchronized',clientIdPrefix:CLIENT_ID.slice(0,16),
    verifiedRegisteredScopeCount:scopes.length,serverScopeCount:EXPECTED,secretExposed:false,
    needsUserCloudflareConsent:true};
  // Each Worker secret is capped at 5 KB. The 386 scope identifiers exceed
  // that cap when joined, so install three smaller bindings instead. The live
  // Worker continues using its legacy allowlist until all parts are present.
  const size=Math.ceil(scopes.length/3);
  const chunks=[0,1,2].map(i=>scopes.slice(i*size,(i+1)*size).join(' '));
  if(chunks.some(chunk=>!chunk||new TextEncoder().encode(chunk).length>4800))
   throw Error('oauth_scope_chunk_exceeds_worker_secret_limit');
  for(let i=0;i<chunks.length;i++){
   const name='CLOUDFLARE_OAUTH_ALLOWED_SCOPES_PART_'+(i+1);
   // On a network error the provider may still have applied the write.
   wrote=true;
   await getResult(prefix+'/secrets',writer.secret,{method:'PUT',request,
    body:{name,type:'secret_text',text:chunks[i]}});
  }
  const after=await getResult(prefix+'/settings',writer.secret,{request});
  const afterNames=new Set((after?.bindings||[]).map(x=>x.name));
  if(![1,2,3].every(i=>afterNames.has('CLOUDFLARE_OAUTH_ALLOWED_SCOPES_PART_'+i)))
   throw Error('updated_worker_scope_chunks_missing_on_readback');
  // The Worker secret value cannot be read back. Never claim 386 is in use
  // until a fresh public catalog read actually returns the new count.
  let count=null;
  try{
   const check=await request('https://quantaphi.org/api/bubbles/connections/scope-inventory?scopeSync=1',
    {headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});
   if(check.ok){const data=await check.json();count=data?.scopeInventory?.serverAllowlistCount??null;}
  }catch{}
  return {ok:true,status:count===EXPECTED?'live_scope_count_verified':'installed_awaiting_live_verification',
   clientIdPrefix:CLIENT_ID.slice(0,16),verifiedRegisteredScopeCount:scopes.length,
   serverScopeCount:Number.isInteger(count)?count:null,secretExposed:false,
   needsUserCloudflareConsent:true};
 }catch(e){return fail(wrote?'scope_write_outcome_needs_live_verification_':
    'scope_sync_failed_'+sanitize(e?.message),503)}
 finally{
  await Promise.all([revoke(parent,reader?.id,request),revoke(parent,writer?.id,request)]);
  await storage.put(PLAN_KEY,{...plan,status:'consumed'});
 }
}
