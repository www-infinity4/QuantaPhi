import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planBubblesScopeSync,confirmBubblesScopeSync} from '../workers/infinity-brain-clock/cloudflare-scope-sync.mjs';
import {inspectCloudflareTokenManager,issueScopedCloudflareToken} from '../workers/infinity-brain-clock/cloudflare-token-broker.mjs';
import {resolveCloudflareScopeConfig,cloudflareScopeInventory,cloudflareAdapter} from '../workers/bubbles-connections/providers.mjs';
import {cloudflareScopeConfigProof} from '../workers/bubbles-connections/scope-config.mjs';
const ID='8f676e020d9ff91a2951e415d144c9b7';
const CB='https://quantaphi.org/api/bubbles/connections/cloudflare/callback';
const OLD=['BOT_WALLET','CLOUDFLARE_CLIENT_ID','CLOUDFLARE_CLIENT_SECRET','CLOUDFLARE_OAUTH_ALLOWED_SCOPES',
 'CONNECTIONS','CONNECTION_KEYRING','CONNECTION_ACTIVE_KEY','GITHUB_CLIENT_ID','GITHUB_CLIENT_SECRET','STARQUEST_LEDGER'];
function storage(){
 const data=new Map();
 return {get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v)},
  transaction:async fn=>fn({get:async k=>data.get(k),put:async(k,v)=>data.set(k,v)})};
}
const fakeScopeIDs=(count=386)=>['user-details.read','memberships.read','workers-scripts.admin','d1.read','d1.write','page.write',
 ...Array.from({length:count-6},(_,i)=>'test-provider-scope-'+i+'.read')];
function harness({scopes=fakeScopeIDs(),client=ID,active=ID.slice(0,16),
 live=386,liveRequested=live,postActive=active,initial=6,initialRequested=initial,
 initialScopes=fakeScopeIDs(initial),postDigest,postRevision,supportsVersioned=true}={}){
 const logs=[],issued=[],bindings=new Set(OLD);
 const configuration={CLOUDFLARE_OAUTH_ALLOWED_SCOPES:initialScopes.join(' ')};

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
   catalogCalls++;
   const after=catalogCalls>1;
   const proof=await cloudflareScopeConfigProof(configuration);
   if(after&&postDigest!==undefined)proof.scopeSetDigest=postDigest;
   if(after&&postRevision!==undefined)proof.configurationRevision=postRevision;
   return Response.json({ok:true,configured:true,clientIdPrefix:after?postActive:active,
    scopeInventory:{serverAllowlistCount:after?live:initial,
     signInRequestScopeCount:after?liveRequested:initialRequested,
     supportsVersionedAllowlist:supportsVersioned,...proof}});
  }
  assert.ok(path.startsWith(endpoint));
  if(path.endsWith('/oauth_clients/'+ID))return json({client_id:client,redirect_uris:[CB],scopes});
  if(path.endsWith('/workers/scripts/bubbles-connections/settings'))return json({bindings:[...bindings].map(name=>({name,type:'secret_text'}))});
  if(path.endsWith('/workers/scripts/bubbles-connections/secrets')){
   const payload=JSON.parse(opts.body);
   if(new TextEncoder().encode(payload.text).length>5120)
    return Response.json({success:false,errors:[{code:1000,message:'Secret exceeds limit'}]},{status:400});
   bindings.add(payload.name);configuration[payload.name]=payload.text;return json({ok:true});
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
 assert.equal(plan.expectedScopeCount,null);
 assert.equal(plan.scopeCountSource,'verified_oauth_client_registration');
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
 assert.equal(payloads.flatMap(v=>JSON.parse(v.text).scopes).length,386);
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
 assert.equal(chunks.flatMap(x=>JSON.parse(JSON.parse(x.body).text).scopes).length,386);
 assert.ok(chunks.every(x=>!JSON.parse(x.body).text.includes('offline_access')));
});
test('empty registered scope list is never guessed or altered',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env),h=harness({scopes:[]});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,false);assert.match(result.error,/oauth_client_scope_count_outside_limit/);
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

test('403 registered scopes synchronize without an obsolete fixed count',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env);
 const h=harness({scopes:fakeScopeIDs(403),live:403});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,true);
 assert.equal(result.status,'live_scope_count_verified');
 assert.equal(result.verifiedRegisteredScopeCount,403);
 assert.equal(result.signInRequestScopeCount,403);
 const writes=h.logs.filter(x=>x.url.endsWith('/secrets')).map(x=>JSON.parse(x.body));
 assert.equal(writes.length,3);
 const configured=resolveCloudflareScopeConfig(Object.fromEntries(writes.map(x=>[x.name,x.text])));
 assert.deepEqual(new Set(configured.split(/\s+/)),new Set(fakeScopeIDs(403)));
 const inventory=cloudflareScopeInventory(configured);
 assert.equal(inventory.serverAllowlistCount,403);
 assert.equal(inventory.signInRequestScopeCount,403);
 const adapter=cloudflareAdapter({clientId:ID,clientSecret:'synthetic-test-secret',
  redirectUri:CB,allowedScopes:configured});
 const authorization=new URL(adapter.authorization({state:'test-state',challenge:'test-challenge',actions:['owner.full']}));
 assert.equal(authorization.searchParams.get('scope').split(' ').length,403);
});

test('same-count different permission sets must be replaced, never treated as already synchronized',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env);
 const h=harness({scopes:fakeScopeIDs(403),initial:403,live:403,
  initialScopes:fakeScopeIDs(403).map(scope=>'old-'+scope)});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.status,'live_scope_count_verified');
 assert.equal(result.scopeSetMatches,true);
 assert.equal(result.configurationRevisionMatches,true);
 assert.equal(h.logs.filter(x=>x.url.endsWith('/secrets')).length,3);
});

test('stale scope digest or configuration revision cannot verify an installed batch',async()=>{
 for(const overrides of [{postDigest:'stale-set'},{postRevision:null},
  {postRevision:'css_11111111-1111-1111-1111-111111111111'}]){
  const db=storage(),plan=await planBubblesScopeSync(db,env),h=harness(overrides);
  const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
  assert.equal(result.status,'installed_awaiting_live_verification');
 }
});

test('old Connections decoder blocks before writer credentials or new secret formats are sent',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env),h=harness({supportsVersioned:false});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,false);
 assert.match(result.error,/scope_configuration_reader_upgrade_required/);
 assert.deepEqual(h.issued,['oauth-client-read']);
 assert.equal(h.logs.filter(x=>x.url.endsWith('/secrets')).length,0);
});

test('invalid and duplicated provider scope entries cannot produce a configuration write',async()=>{
 for(const scopes of [[...fakeScopeIDs(),'user-details.read'],[...fakeScopeIDs(),'invalid scope'],fakeScopeIDs(1001)]){
  const db=storage(),plan=await planBubblesScopeSync(db,env),h=harness({scopes});
  const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
  assert.equal(result.ok,false);
  assert.equal(h.logs.filter(x=>x.url.endsWith('/secrets')).length,0);
 }
});

test('malformed live counts cannot verify a successful scope sync',async()=>{
 for(const live of ['386',true,-1,Infinity]){
  const db=storage(),plan=await planBubblesScopeSync(db,env),h=harness({live});
  const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
  assert.equal(result.status,'installed_awaiting_live_verification');
  assert.equal(result.serverScopeCount,null);
  assert.equal(result.signInRequestScopeCount,null);
 }
});

test('a lost write response requires live readback and cannot reuse the approval',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env),h=harness();
 let writes=0;
 const request=async(url,options={})=>{
  if(url.endsWith('/secrets')&&++writes===2)throw Error('PRIVATE_NETWORK_DETAIL');
  return h.request(url,options);
 };
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request});
 assert.equal(result.ok,false);
 assert.equal(result.error,'scope_write_outcome_needs_live_verification');
 assert.equal(result.needsLiveReadback,true);
 assert.ok(!JSON.stringify(result).includes('PRIVATE_NETWORK_DETAIL'));
 const again=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request});
 assert.equal(again.ok,false);
 assert.equal(writes,2);
});

test('post-write allowlist of 386 is pending when sign-in still requests only six',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env);
 const h=harness({live:386,liveRequested:6});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,true);
 assert.equal(result.status,'installed_awaiting_live_verification');
 assert.equal(result.serverScopeCount,386);
 assert.equal(result.signInRequestScopeCount,6);
 assert.equal(h.logs.filter(x=>x.url.endsWith('/secrets')).length,3);
});
test('post-write client identity drift is pending even when both counts are 386',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env);
 const h=harness({postActive:'ffffffffffffffff'});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,true);
 assert.equal(result.status,'installed_awaiting_live_verification');
 assert.equal(result.liveClientMatches,false);
});
test('already configured allowlist cannot claim success with incomplete sign-in request',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env);
 const h=harness({initial:386,initialRequested:6});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,false);
 assert.match(result.error,/scope_inventory_request_count_mismatch/);
 assert.equal(h.logs.filter(x=>x.url.endsWith('/secrets')).length,0);
});
test('already synchronized requires both verified counts and makes no write',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env);
 const h=harness({initial:386,initialRequested:386});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,true);
 assert.equal(result.status,'already_synchronized');
 assert.equal(result.signInRequestScopeCount,386);
 assert.equal(h.logs.filter(x=>x.url.endsWith('/secrets')).length,0);
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
