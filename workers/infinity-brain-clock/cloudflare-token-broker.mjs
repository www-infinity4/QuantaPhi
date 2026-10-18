/*
 * Bubbles Cloudflare token-management broker.
 * A new token must NEVER be embedded in the Android APK, a model prompt,
 * browser JavaScript, a ticket, or a GitHub commit.
 *
 * Only the signed owner-session Worker route may call the planner/confirm
 * methods. The optional parent credential lives in a Cloudflare Worker secret
 * CLOUDFLARE_TOKEN_MANAGER; it needs API Tokens Edit specifically. It is NOT
 * the GitHub GHP token and NOT the ordinary Workers deployment token.
 *
 * Consent is per capability and token creation. This isn't a general admin
 * proxy and does not infer authorization from model-provided chat text.
 */
export const TOKEN_MANAGER_ACCOUNT='ef25728c096c6ba92cf510caa2058003';
export const TOKEN_PLAN_TTL_MS=5*60*1000;
export const TOKEN_MAX_DURATION_HOURS=168;
export const CAPABILITIES=Object.freeze({
 'workers-script-edit':Object.freeze({
  name:'Workers Scripts Edit',
  groupNames:['Workers Scripts Write','Workers Scripts Edit'],
  resource:'account',
  risk:'Cloudflare Worker source and version changes (not full account administration)'
 }),
 'workers-script-read':Object.freeze({
  name:'Workers Scripts Read',
  groupNames:['Workers Scripts Read'],
  resource:'account',
  risk:'Read Cloudflare Worker scripts and versions'
 })
});
const HEX=/^[a-f0-9]{32}$/i;
const ID=/^cft_[a-f0-9-]{36}$/;
const encode=value=>new TextEncoder().encode(String(value));
function fail(code,status=400){return {ok:false,status:'blocked',error:code,httpStatus:status};}
export function validateTokenIntent(body,{now=Date.now()}={}){
 const capability=body?.capability||'workers-script-edit';
 const allowed=CAPABILITIES[capability];
 if(!allowed)return fail('cloudflare_capability_not_allowed');
 const duration=body?.durationHours??24;
 if(!Number.isInteger(duration)||duration<1||duration>TOKEN_MAX_DURATION_HOURS)
  return fail('cloudflare_token_lifetime_outside_policy');
 const purpose=String(body?.purpose||'').trim().replace(/[\r\n\t]/g,' ').slice(0,140);
 if(purpose.length<10)return fail('cloudflare_token_purpose_required');
 if(/(?:api[_-]?token|secret|bearer|password|authorization:|private[_-]?key)\s*[:=]/i.test(purpose))
  return fail('credential_material_in_description');
 const createdAt=now,expiresAt=now+duration*3600000;
 const requestId='cft_'+crypto.randomUUID();
 return {ok:true,status:'owner_approval_required',requestId,capability,purpose,
  createdAt,approvalExpiresAt:now+TOKEN_PLAN_TTL_MS,expiresAt,
  account:TOKEN_MANAGER_ACCOUNT,permission:allowed.name,
  resource:'one Cloudflare account',risk:allowed.risk,
  tokenValueWillBeSentToApp:false,queued:false,requiresExplicitOwnerAction:true};
}
function getValidPlan(plan,id,{now=Date.now()}={}){
 if(!ID.test(id||'')||!plan||plan.requestId!==id)return fail('cloudflare_token_plan_not_found',404);
 if(plan.approvalExpiresAt<=now)return fail('cloudflare_token_approval_expired',409);
 if(plan.status!=='owner_approval_required')return fail('cloudflare_token_approval_already_processed',409);
 if(!CAPABILITIES[plan.capability]||plan.account!==TOKEN_MANAGER_ACCOUNT)return fail('cloudflare_token_plan_tampered',403);
 return {ok:true};
}
async function cloudflareJSON(path,token,{method='GET',body,request=fetch}={}){
 const res=await request('https://api.cloudflare.com/client/v4/accounts/'+TOKEN_MANAGER_ACCOUNT+path,{
  method,redirect:'manual',signal:AbortSignal.timeout(12000),
  headers:{Authorization:'Bearer '+token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 if(!res?.ok)throw Error('cloudflare_provisioning_api_http_'+(res?.status||0));
 const payload=await res.json();
 if(payload?.success!==true)throw Error('cloudflare_provisioning_api_rejected');
 return payload.result;
}
function selectPermissionGroup(result,capability){
 const rules=CAPABILITIES[capability];
 if(!rules||!Array.isArray(result))throw Error('cloudflare_permission_list_unavailable');
 const matches=result.filter(group=>
  HEX.test(group?.id||'')&&
  rules.groupNames.some(name=>name.toLowerCase()===String(group?.name||'').toLowerCase())&&
  (!group?.meta?.scopes||String(group.meta.scopes).includes('account')));
 if(matches.length!==1)throw Error('cloudflare_permission_group_not_unambiguous');
 return matches[0].id;
}
export async function issueScopedCloudflareToken(plan,parent,{
 request=fetch,now=Date.now()
}={}){
 if(!parent||typeof parent!=='string')throw Error('cloudflare_token_manager_not_configured');
 if(!CAPABILITIES[plan?.capability])throw Error('cloudflare_capability_not_allowed');
 if(plan.expiresAt<=now||plan.expiresAt>now+TOKEN_MAX_DURATION_HOURS*3600000)
  throw Error('cloudflare_token_expiry_invalid');
 const groups=await cloudflareJSON('/tokens/permission_groups',parent,{request});
 const groupId=selectPermissionGroup(groups,plan.capability);
 const body={name:'Bubbles '+plan.capability+' '+plan.requestId.slice(-12),
  expires_on:new Date(plan.expiresAt).toISOString(),
  policies:[{effect:'allow',permission_groups:[{id:groupId}],
   resources:{['com.cloudflare.api.account.'+TOKEN_MANAGER_ACCOUNT]:'*'}}]};
 const minted=await cloudflareJSON('/tokens',parent,{request,method:'POST',body});
 if(typeof minted?.id!=='string'||typeof minted?.value!=='string'||minted.value.length<20)
  throw Error('cloudflare_provisioning_receipt_incomplete');
 return {id:minted.id,secret:minted.value,scope:plan.capability,expiresAt:plan.expiresAt};
}
async function encryptForVault(value,env){
 const secret=env.BOT_WORK_SECRET;
 if(typeof secret!=='string'||secret.length<24)
  throw Error('cloudflare_token_vault_secret_unavailable');
 const material=await crypto.subtle.importKey('raw',encode(secret),'HKDF',false,['deriveKey']);
 const key=await crypto.subtle.deriveKey({
  name:'HKDF',hash:'SHA-256',salt:encode(env.WRITER_OWNER_HASH||'owner'),
  info:encode('Bubbles-Cloudflare-Token-Vault-v1')
 },material,{name:'AES-GCM',length:256},false,['encrypt']);
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encode(value)));
 return {iv:Array.from(iv),ciphertext:Array.from(cipher),version:1};
}
export async function planCloudflareToken(storage,body,env,{now=Date.now()}={}){
 const result=validateTokenIntent(body,{now});
 if(!result.ok)return result;
 const plan={...result,status:'owner_approval_required'};
 await storage.put('cloudflare-token-plan:'+result.requestId,plan);
 return {...result,managerConfigured:typeof env.CLOUDFLARE_TOKEN_MANAGER==='string'&&env.CLOUDFLARE_TOKEN_MANAGER.length>20};
}
export async function confirmCloudflareToken(storage,body,env,{
 now=Date.now(),request=fetch
}={}){
 const id=String(body?.requestId||'');
 if(!ID.test(id))return fail('cloudflare_token_request_id_invalid');
 const key='cloudflare-token-plan:'+id;
 const plan=await storage.get(key);
 const valid=getValidPlan(plan,id,{now});
 if(!valid.ok)return valid;
 if(!env.CLOUDFLARE_TOKEN_MANAGER)return fail('cloudflare_token_manager_not_configured',503);
 if(typeof env.BOT_WORK_SECRET!=='string'||env.BOT_WORK_SECRET.length<24)
  return fail('cloudflare_token_vault_secret_unavailable',503);
 // DO storage transaction first reserves the one-time approval. Concurrent
 // calls cannot create multiple Cloudflare tokens from the same plan.
 const claimed=await storage.transaction(async txn=>{
  const current=await txn.get(key);
  if(!getValidPlan(current,id,{now}).ok)return false;
  await txn.put(key,{...current,status:'creating',approvedAt:now});
  return true;
 });
 if(!claimed)return fail('cloudflare_token_approval_already_processed',409);
 try{
  const issued=await issueScopedCloudflareToken(plan,env.CLOUDFLARE_TOKEN_MANAGER,{request,now});
  // Always keep the minted token server-side and encrypted. No API endpoint
  // returns the value or permits arbitrary model/website access to it.
  const sealed=await encryptForVault(issued.secret,env);
  await storage.put('cloudflare-token-vault:'+issued.id,{id:issued.id,capability:plan.capability,
   expiresAt:issued.expiresAt,createdAt:now,token:sealed,approvedRequest:id});
  const receipt={ok:true,status:'created_server_side',tokenId:issued.id,capability:issued.scope,
   createdAt:now,expiresAt:issued.expiresAt,tokenValueWillBeSentToApp:false,
   availableToModels:false,availableToAndroidApk:false,
   note:'Provisioned credential is encrypted in Brain storage and may only be used by explicitly authorized server-side tools. No client token value is returned.'};
  await storage.put(key,{...plan,status:'created',receipt,approvedAt:now});
  return receipt;
 }catch(error){
  // Fail closed: no token or parent credential is leaked in error details.
  await storage.put(key,{...plan,status:'failed',approvedAt:now,
   error:'cloudflare_token_provisioning_or_vault_failed'});
  return fail('cloudflare_token_provisioning_or_vault_failed',502);
 }
}
