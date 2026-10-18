import test from 'node:test';
import assert from 'node:assert/strict';
import {validateTokenIntent,planCloudflareToken,confirmCloudflareToken,
 issueScopedCloudflareToken,TOKEN_MANAGER_ACCOUNT} from '../workers/infinity-brain-clock/cloudflare-token-broker.mjs';
const now=Date.parse('2026-10-18T01:00:00Z');
function mockStorage(){
 const map=new Map();
 return {map,get:async key=>map.get(key),put:async(key,value)=>{map.set(key,value)},
  transaction:async fn=>fn({get:async key=>map.get(key),put:async(k,v)=>{map.set(k,v)}})};
}
const env={BOT_WORK_SECRET:'test-only-never-deployed-secret-very-long-12345',
 WRITER_OWNER_HASH:'f'.repeat(64),CLOUDFLARE_TOKEN_MANAGER:'test-parent-token-not-a-live-credential'};
const childSecret='child-token-test-not-a-real-credential-123456';
const groupId='a'.repeat(32);
function fakeCloudflare(calls){
 return async(url,opts)=>{
  const parsed=new URL(url);
  assert.equal(parsed.origin,'https://api.cloudflare.com');
  assert.equal(opts.redirect,'manual');
  assert.equal(opts.headers.Authorization,'Bearer '+env.CLOUDFLARE_TOKEN_MANAGER);
  calls.push({path:parsed.pathname,method:opts.method,body:opts.body&&JSON.parse(opts.body)});
  if(opts.method==='GET')return Response.json({success:true,result:[
   {id:groupId,name:'Workers Scripts Write',meta:{scopes:'com.cloudflare.api.account'}},
   {id:'b'.repeat(32),name:'API Tokens Edit',meta:{scopes:'com.cloudflare.api.account'}}
  ]});
  return Response.json({success:true,result:{id:'test-cf-token-id',value:childSecret}});
 };
}
test('Bubbles cannot ask the token broker for blanket admin or API Tokens Edit child credentials',()=>{
 for(const capability of ['all-access','account-admin','api-tokens-edit','token-factory','d1-write','user-global-key']){
  assert.equal(validateTokenIntent({capability,purpose:'Build a verified website'}, {now}).ok,false,capability);
 }
 assert.equal(validateTokenIntent({purpose:'Build a verified website',durationHours:169},{now}).ok,false);
 assert.equal(validateTokenIntent({purpose:'Build a verified website',durationHours:24},{now}).permission,'Workers Scripts Edit');
});
test('a five-minute token proposal needs an explicit owner approval and contains no credential material',async()=>{
 const storage=mockStorage();
 const plan=await planCloudflareToken(storage,{
  capability:'workers-script-edit',purpose:'Deploy the verified website source',durationHours:12
 },env,{now});
 assert.equal(plan.ok,true);
 assert.equal(plan.status,'owner_approval_required');
 assert.equal(plan.managerConfigured,true);
 assert.equal(plan.requiresExplicitOwnerAction,true);
 assert.equal(plan.expiresAt,now+12*3600000);
 assert.equal(plan.approvalExpiresAt,now+5*60*1000);
 assert.equal(plan.tokenValueWillBeSentToApp,false);
 assert.ok(plan.requestId.startsWith('cft_'));
 assert.equal(JSON.stringify(plan).includes(env.CLOUDFLARE_TOKEN_MANAGER),false);
 const expired=await confirmCloudflareToken(storage,{requestId:plan.requestId},env,{now:now+300001,
  request:async()=>assert.fail('must not access API')});
 assert.equal(expired.error,'cloudflare_token_approval_expired');
});
test('actual Cloudflare POST only requests bounded scripts permissions for the one owner account',async()=>{
 const plan=validateTokenIntent({purpose:'Deploy verified Bubbles website',durationHours:24},{now});
 const calls=[];
 const minted=await issueScopedCloudflareToken(plan,env.CLOUDFLARE_TOKEN_MANAGER,
  {now,request:fakeCloudflare(calls)});
 assert.equal(minted.secret,childSecret);
 assert.equal(calls.length,2);
 assert.equal(calls[0].path,'/client/v4/accounts/'+TOKEN_MANAGER_ACCOUNT+'/tokens/permission_groups');
 assert.equal(calls[1].method,'POST');
 assert.equal(calls[1].path,'/client/v4/accounts/'+TOKEN_MANAGER_ACCOUNT+'/tokens');
 assert.deepEqual(calls[1].body.policies[0].permission_groups,[{id:groupId}]);
 assert.deepEqual(calls[1].body.policies[0].resources,
  {['com.cloudflare.api.account.'+TOKEN_MANAGER_ACCOUNT]:'*'});
 assert.equal(calls[1].body.expires_on,new Date(plan.expiresAt).toISOString());
 assert.ok(!JSON.stringify(calls[1]).includes('API Tokens Edit'));
});
test('owner-confirmed Cloudflare token stays encrypted in DO storage and cannot be replay-minted',async()=>{
 const storage=mockStorage();
 const plan=await planCloudflareToken(storage,{
  capability:'workers-script-edit',purpose:'Build and stage the website',durationHours:24
 },env,{now});
 const calls=[];
 const minted=await confirmCloudflareToken(storage,{requestId:plan.requestId},env,
  {now:now+1000,request:fakeCloudflare(calls)});
 assert.equal(minted.ok,true);
 assert.equal(minted.status,'created_server_side');
 assert.equal(minted.availableToAndroidApk,false);
 assert.equal(minted.availableToModels,false);
 assert.equal(JSON.stringify(minted).includes(childSecret),false);
 const encrypted=storage.map.get('cloudflare-token-vault:test-cf-token-id');
 assert.ok(encrypted?.token?.ciphertext?.length>30);
 assert.ok(!JSON.stringify(encrypted).includes(childSecret));
 assert.equal(storage.map.get('cloudflare-token-plan:'+plan.requestId).status,'created');
 const replay=await confirmCloudflareToken(storage,{requestId:plan.requestId},env,
  {now:now+2000,request:async()=>assert.fail('replay must not mint')});
 assert.equal(replay.error,'cloudflare_token_approval_already_processed');
 assert.equal(calls.filter(x=>x.method==='POST').length,1);
});
test('missing parent permission or vault key never causes a privileged API call',async()=>{
 const storage=mockStorage();
 const plan=await planCloudflareToken(storage,{purpose:'Publish approved website',durationHours:1},{},{now});
 assert.equal(plan.managerConfigured,false);
 for(const localEnv of [
  {...env,CLOUDFLARE_TOKEN_MANAGER:''},
  {...env,BOT_WORK_SECRET:''}
 ]){
  const denied=await confirmCloudflareToken(storage,{requestId:plan.requestId},localEnv,
   {now:now+1,request:async()=>assert.fail('must not fetch')});
  assert.equal(denied.ok,false);
 }
});
test('ambiguous permission group mapping cannot silently mint broad cloudflare access',async()=>{
 const plan=validateTokenIntent({purpose:'Ship tested site code'}, {now});
 let posts=0;
 await assert.rejects(issueScopedCloudflareToken(plan,env.CLOUDFLARE_TOKEN_MANAGER,{
  now,request:async()=>{posts++;return Response.json({success:true,result:[
    {id:'b'.repeat(32),name:'API Tokens Edit'}]});}
 }),/cloudflare_permission_group_not_unambiguous/);
 assert.equal(posts,1);
});
