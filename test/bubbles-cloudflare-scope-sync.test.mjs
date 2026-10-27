import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planBubblesScopeSync,confirmBubblesScopeSync} from '../workers/infinity-brain-clock/cloudflare-scope-sync.mjs';
import {inspectCloudflareTokenManager,issueScopedCloudflareToken} from '../workers/infinity-brain-clock/cloudflare-token-broker.mjs';
import {resolveCloudflareScopeConfig,cloudflareScopeInventory} from '../workers/bubbles-connections/providers.mjs';
const ID='8f676e020d9ff91a2951e415d144c9b7';
const CB='https://quantaphi.org/api/bubbles/connections/cloudflare/callback';
const OLD=['BOT_WALLET','CLOUDFLARE_CLIENT_ID','CLOUDFLARE_CLIENT_SECRET','CLOUDFLARE_OAUTH_ALLOWED_SCOPES',
 'CONNECTIONS','CONNECTION_KEYRING','CONNECTION_ACTIVE_KEY','GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','STARQUEST_LEDGER'];
function storage(){
 const data=new Map();
 return {get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v)},
  transaction:async fn=>fn({get:async k=>data.get(k),put:async(k,v)=>data.set(k,v)})};
}
const fakeScopeIDs=()=>['user-details.read','memberships.read','workers-scripts.admin','d1.read','d1.write','page.write',
 ...Array.from({length:380},(_,i)=>'test-provider-scope-'+i+'.read')];
function harness({scopes=fakeScopeIDs(),client=ID,active=ID.slice(0,16),live=386}={}){
 const logs=[],issued=[],bindings=new Set(OLD);
 const endpoint='https://api.cloudflare.com/client/v4';
 const json=x=>Response.json({success:true,result:x});
 const issue=async(plan)=>{
  issued.push(plan.capability);return {secret:'temporary-child-token-'+plan.capability,
   id:'temporary-token-'+plan.capability};
 };
 let catalogCalls=0;
 const request=async (url,opts={})=>{
  const path=String(url);
  logs.push({url:path,method:opts.method||'GET',body:opts.body});
  if(path.startsWith('https://quantaphi.org/api/bubbles/connections/scope-inventory')){
   catalogCalls++;return Response.json({ok:true,configured:true,clientIdPrefix:active,
    scopeInventory:{serverAllowlistCount:catalogCalls>1?live:6}});
  }
  assert.ok(path.startsWith(endpoint));
  if(path.endsWith('/oauth_clients/'+ID))return json({client_id:client,redirect_uris:[CB],scopes});
  if(path.endsWith('/workers/scripts/bubbles-connections/settings'))return json({bindings:[...bindings].map(name=>({name,type:'secret_text'}))});
  if(path.endsWith('/workers/scripts/bubbles-connections/secrets')){
   const payload=JSON.parse(opts.body);
   if(new TextEncoder().encode(payload.text).length>5120)
    return Response.json({success:false,errors:[{code:1000,message:'Secret exceeds limit'}]},{status:400});
   bindings.add(payload.name);return json({ok:true});
  }
  if(/\/user\/tokens\/temporary-token-/.test(path))return json({});
  throw Error('unexpected_mock_endpoint:'+path);
 };
 return {issue,request,issued,logs};
}
const env={CLOUDFLARE_TOKEN_MANAGER:'test-parent-manager-key-with-minimum-length'};
test('plan is read-only and explicitly requires owner approval',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env);
 assert.equal(plan.ok,true);assert.equal(plan.managerConfigured,true);
 assert.equal(plan.expectedScopeCount,386);
 assert.equal(plan.deletesClient,false);
 assert.equal(plan.createsClient,false);
 assert.equal(plan.changesDns,false);
 assert.equal(plan.requiresOwnerApproval,true);
});
test('verified exact client + 386 scopes installs three size-safe secrets and checks live count',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env);
 const h=harness();
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,true);
 assert.equal(result.status,'live_scope_count_verified');
 assert.deepEqual(h.issued,['oauth-client-read','workers-script-edit']);
 const write=h.logs.filter(x=>x.url.endsWith('/workers/scripts/bubbles-connections/secrets'));
 assert.equal(write.length,3);
 const payloads=write.map(entry=>JSON.parse(entry.body));
 assert.deepEqual(payloads.map(v=>v.name),[1,2,3].map(i=>'CLOUDFLARE_OAUTH_ALLOWED_SCOPES_PART_'+i));
 assert.equal(payloads.flatMap(v=>v.text.split(' ')).length,386);
 assert.ok(payloads.every(v=>new TextEncoder().encode(v.text).length<=5120));
 const chunks=Object.fromEntries(payloads.map(v=>[v.name,v.text]));
 assert.equal(cloudflareScopeInventory(resolveCloudflareScopeConfig(chunks)).serverAllowlistCount,386);
 assert.equal(cloudflareScopeInventory(resolveCloudflareScopeConfig(chunks)).signInRequestScopeCount,386);
 assert.equal(cloudflareScopeInventory(resolveCloudflareScopeConfig({...chunks,CLOUDFLARE_OAUTH_ALLOWED_SCOPES_PART_3:''})).serverAllowlistCount,0);
 assert.ok(!JSON.stringify(result).includes('test-parent-manager'));
 assert.equal(h.logs.filter(x=>/\/user\/tokens\/temporary-token-/.test(x.url)).length,2);
 const repeat=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(repeat.ok,false);
});
test('refresh-token protocol scope is not counted as an application permission',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env);
 const h=harness({scopes:[...fakeScopeIDs(),'offline_access']});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,true);
 assert.equal(result.verifiedRegisteredScopeCount,386);
 const chunks=h.logs.filter(x=>x.url.endsWith('/workers/scripts/bubbles-connections/secrets'));
 assert.equal(chunks.flatMap(x=>JSON.parse(x.body).text.split(' ')).length,386);
 assert.ok(chunks.every(x=>!JSON.parse(x.body).text.includes('offline_access')));
});
test('385 scoped client is never guessed or altered',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env),h=harness({scopes:fakeScopeIDs().slice(0,385)});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,false);assert.match(result.error,/oauth_client_scope_count_not_386/);
 assert.equal(h.logs.filter(x=>x.url.endsWith('/secrets')).length,0);
});
test('never mutate if the client ID or callback is not the active Bubbles registration',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env),h=harness({active:'49081c8b98c58a21'});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,false);assert.match(result.error,/active_bubbles_client_does_not_match/);
 assert.equal(h.logs.filter(x=>x.url.endsWith('/secrets')).length,0);
});
test('approval is mandatory and no token is issued for absent authorization',async()=>{
 const h=harness(),db=storage();
 const result=await confirmBubblesScopeSync(db,{requestId:'css_bad'},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,false);assert.equal(result.httpStatus,403);assert.equal(h.issued.length,0);
});

test('read-only preflight identifies the failing Cloudflare endpoint before any token mint',async()=>{
 const requests=[];
 const request=async(url,options)=>{
  requests.push({url,method:options.method||'GET'});
  return Response.json({success:false,errors:[{code:6003,message:'DO NOT ECHO SECRET MATERIAL'}]},
   {status:400});
 };
 const diagnostic=await inspectCloudflareTokenManager(env,{request});
 assert.equal(diagnostic.ok,false);
 assert.equal(diagnostic.stage,'permission_group_lookup');
 assert.equal(diagnostic.httpStatus,400);
 assert.deepEqual(diagnostic.providerCodes,[6003]);
 assert.equal(requests.length,1);
 assert.equal(requests[0].method,'GET');
 assert.ok(!JSON.stringify(diagnostic).includes('DO NOT ECHO'));
 assert.ok(!JSON.stringify(diagnostic).includes(env.CLOUDFLARE_TOKEN_MANAGER));
});
test('preflight checks both relevant permission groups and is_selectable flag',async()=>{
 const groups=[
  {id:'a'.repeat(32),name:'OAuth Clients Read',is_selectable:true,meta:{scopes:'com.cloudflare.api.account'}},
  {id:'b'.repeat(32),name:'Workers Scripts Edit',is_selectable:true,meta:{scopes:'com.cloudflare.api.account'}}
 ];
 const request=async()=>Response.json({success:true,result:groups});
 const d=await inspectCloudflareTokenManager(env,{request});
 assert.equal(d.ok,true);
 assert.equal(d.stage,'token_manager_ready');
 assert.equal(d.capabilityChecks.length,2);
 const blocked=await inspectCloudflareTokenManager(env,{request:async()=>Response.json({
  success:true,result:[groups[0],{...groups[1],is_selectable:false}]})});
 assert.equal(blocked.ok,false);
 assert.equal(blocked.stage,'required_permission_group_unavailable');
});
test('Cloudflare token provisioning 400 identifies whether group lookup or creation failed',async()=>{
 const now=Date.now();
 const plan={capability:'oauth-client-read',requestId:'cft_'+crypto.randomUUID(),expiresAt:now+600000};
 const groups=[{id:'a'.repeat(32),name:'OAuth Clients Read',meta:{scopes:'com.cloudflare.api.account'}}];
 const issued=[];
 const postError=async(url,options)=>{
  issued.push({url,method:options.method});
  if(url.endsWith('/permission_groups'))return Response.json({success:true,result:groups});
  return Response.json({success:false,errors:[{code:1004,message:'PRIVATE BODY'}]},{status:400});
 };
 await assert.rejects(()=>issueScopedCloudflareToken(plan,env.CLOUDFLARE_TOKEN_MANAGER,{now,request:postError}),
  /cloudflare_temporary_token_create_http_400_codes_1004/);
 assert.deepEqual(issued.map(x=>x.method),['GET','POST']);
 const lookupError=async()=>Response.json({success:false,errors:[{code:1006,message:'PRIVATE'}]},{status:400});
 await assert.rejects(()=>issueScopedCloudflareToken(plan,env.CLOUDFLARE_TOKEN_MANAGER,{now,request:lookupError}),
  /cloudflare_permission_group_lookup_http_400_codes_1006/);
});
