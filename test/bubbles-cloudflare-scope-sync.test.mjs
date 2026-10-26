import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planBubblesScopeSync,confirmBubblesScopeSync} from '../workers/infinity-brain-clock/cloudflare-scope-sync.mjs';
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
function harness({scopes=fakeScopeIDs(),client=ID,active=ID.slice(0,16),
 live=386,liveRequested=live,postActive=active,initial=6,initialRequested=initial}={}){
 const logs=[],issued=[];
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
   return Response.json({ok:true,configured:true,clientIdPrefix:after?postActive:active,
    scopeInventory:{serverAllowlistCount:after?live:initial,
     signInRequestScopeCount:after?liveRequested:initialRequested}});
  }
  assert.ok(path.startsWith(endpoint));
  if(path.endsWith('/oauth_clients/'+ID))return json({client_id:client,redirect_uris:[CB],scopes});
  if(path.endsWith('/workers/scripts/bubbles-connections/settings'))return json({bindings:OLD.map(name=>({name,type:'secret_text'}))});
  if(path.endsWith('/workers/scripts/bubbles-connections/secrets'))return json({ok:true});
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
test('verified exact client + 386 scopes updates one secret and checks live count',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env);
 const h=harness();
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,true);
 assert.equal(result.status,'live_scope_count_verified');
 assert.deepEqual(h.issued,['oauth-client-read','workers-script-edit']);
 const write=h.logs.filter(x=>x.url.endsWith('/workers/scripts/bubbles-connections/secrets'));
 assert.equal(write.length,1);
 const payload=JSON.parse(write[0].body);
 assert.equal(payload.name,'CLOUDFLARE_OAUTH_ALLOWED_SCOPES');
 assert.equal(payload.text.split(' ').length,386);
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
 const request=h.logs.find(x=>x.url.endsWith('/workers/scripts/bubbles-connections/secrets'));
 assert.equal(JSON.parse(request.body).text.split(' ').length,386);
 assert.ok(!JSON.parse(request.body).text.includes('offline_access'));
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

test('post-write allowlist of 386 is pending when sign-in still requests only six',async()=>{
 const db=storage(),plan=await planBubblesScopeSync(db,env);
 const h=harness({live:386,liveRequested:6});
 const result=await confirmBubblesScopeSync(db,{requestId:plan.requestId},env,{issue:h.issue,request:h.request});
 assert.equal(result.ok,true);
 assert.equal(result.status,'installed_awaiting_live_verification');
 assert.equal(result.serverScopeCount,386);
 assert.equal(result.signInRequestScopeCount,6);
 assert.equal(h.logs.filter(x=>x.url.endsWith('/secrets')).length,1);
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
