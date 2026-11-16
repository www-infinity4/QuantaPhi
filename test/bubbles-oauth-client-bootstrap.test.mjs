import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {planOAuthClient,confirmOAuthClient,OAUTH_BOOTSTRAP_SCOPES} from '../workers/infinity-brain-clock/cloudflare-oauth-bootstrap.mjs';
import {CAPABILITIES} from '../workers/infinity-brain-clock/cloudflare-token-broker.mjs';
const now=Date.now();
const env={
 Cloudflare_token_manager:'this-is-owner-managed-parent-api-token-not-real',
 BOT_WORK_SECRET:'test-only-encrypted-backend-secret-never-real-12345678',
 WRITER_OWNER_HASH:'f'.repeat(64)
};
function fixture({denyPermission=false,failFirstSecret=false}={}){
 const values=new Map(),events=[],installed=new Map();
 let failed=false,created=0;
 const storage={
  async get(k){return values.get(k)},
  async put(k,v){values.set(k,v)},
  async transaction(fn){return fn(storage)}
 };
 const json=(data,status=200)=>Response.json({success:status<400,result:data,errors:status>=400?[{code:10000,message:'invalid'}]:[]},{status});
 async function request(url,opt){
  const u=new URL(url);const method=opt.method;
  events.push({path:u.pathname,method});
  if(u.pathname==='/client/v4/user/tokens/permission_groups'){
   const groups=[
    {id:'a'.repeat(32),name:'Workers Scripts Write',meta:{scopes:'account'}},
    ...(!denyPermission?[{id:'b'.repeat(32),name:'OAuth Clients Write',meta:{scopes:'account'}}]:[])
   ];
   return json(groups);
  }
  if(u.pathname==='/client/v4/user/tokens'&&method==='POST'){
   const body=JSON.parse(opt.body);
   assert.equal(body.policies[0].resources['com.cloudflare.api.account.ef25728c096c6ba92cf510caa2058003'],'*');
   const id='child-token-'+events.length;
   return json({id,value:'ephemeral-only-server-secret-'+id});
  }
  if(u.pathname.includes('/user/tokens/child-token-')&&method==='DELETE')return json({});
  if(u.pathname.endsWith('/workers/scripts/bubbles-connections/settings')){
   return json({bindings:[
    {name:'CONNECTIONS',type:'durable_object_namespace'},
    {name:'CONNECTION_KEYRING',type:'secret_text'},
    ...[...installed.keys()].map(name=>({name,type:'secret_text'}))
   ]});
  }
  if(u.pathname.endsWith('/oauth_clients')&&method==='POST'){
   const body=JSON.parse(opt.body);created++;
   assert.equal(body.client_name,'Bubbles AI - QuantaPhi');
   assert.equal(body.token_endpoint_auth_method,'client_secret_basic');
   assert.deepEqual(body.response_types,['code']);
   assert.equal(body.redirect_uris[0],'https://quantaphi.org/api/bubbles/connections/cloudflare/callback');
   assert.ok(body.scopes.includes('workers-r2.write'));
   assert.ok(body.scopes.includes('user-details.read'));
   return json({client_id:'generated-client-id-bubbles123',client_secret:'secret-only-server-1234567890123'});
  }
  if(u.pathname.endsWith('/workers/scripts/bubbles-connections/secrets')&&method==='PUT'){
   if(failFirstSecret&&!failed){failed=true;return json(null,503)}
   const body=JSON.parse(opt.body);installed.set(body.name,body.text);
   return json({name:body.name,type:'secret_text'});
  }
  throw Error('Unexpected request '+method+' '+u.pathname);
 }
 return {storage,request,events,installed,get created(){return created}};
}
test('one-time owner approval creates a private OAuth client and installs three secrets without exposing values',async()=>{
 const {storage,request,installed,events,created}=fixture();
 const plan=await planOAuthClient(storage,env,{now});
 assert.equal(plan.status,'owner_approval_required');
 assert.equal(plan.managerConfigured,true);
 assert.equal(plan.visibility,'private');
 const result=await confirmOAuthClient(storage,{requestId:plan.requestId},env,{now,request});
 assert.equal(result.ok,true);
 assert.equal(result.status,'installed');
 assert.equal(result.accountAccessGranted,false);
 assert.equal(result.publicVisibilityVerified,false);
 assert.equal(installed.get('CLOUDFLARE_CLIENT_ID'),'generated-client-id-bubbles123');
 assert.equal(installed.get('CLOUDFLARE_CLIENT_SECRET'),'secret-only-server-1234567890123');
 assert.equal(installed.get('CLOUDFLARE_OAUTH_ALLOWED_SCOPES'),OAUTH_BOOTSTRAP_SCOPES.join(' '));
 assert.ok(!JSON.stringify(result).includes('secret-only-server'));
 assert.ok(!JSON.stringify(result).includes('ephemeral-only-server-secret'));
 assert.equal(events.filter(x=>x.path.endsWith('/oauth_clients')&&x.method==='POST').length,1);
 assert.equal(events.filter(x=>x.method==='DELETE').length,2);
 const repeat=await confirmOAuthClient(storage,{requestId:plan.requestId},env,{now,request});
 assert.equal(repeat.ok,true);
 assert.equal(events.filter(x=>x.path.endsWith('/oauth_clients')&&x.method==='POST').length,1);
});
test('no manager, expired/incorrect owner nonce, and missing permission fail closed',async()=>{
 const f=fixture();
 const plan=await planOAuthClient(f.storage,env,{now});
 assert.equal((await confirmOAuthClient(f.storage,{requestId:'ocp_00000000-0000-0000-0000-000000000000'},env,{now,request:f.request})).httpStatus,403);
 assert.equal((await confirmOAuthClient(f.storage,{requestId:plan.requestId},env,{now:now+5*60*1000+1,request:f.request})).httpStatus,403);
 assert.equal(f.events.length,0);
 const g=fixture();
 const p=await planOAuthClient(g.storage,{}, {now});
 assert.equal(p.managerConfigured,false);
 assert.equal((await confirmOAuthClient(g.storage,{requestId:p.requestId},{},{now,request:g.request})).error,'cloudflare_token_manager_not_configured');
 const h=fixture({denyPermission:true});
 const hp=await planOAuthClient(h.storage,env,{now});
 const blocked=await confirmOAuthClient(h.storage,{requestId:hp.requestId},env,{now,request:h.request});
 assert.equal(blocked.ok,false);assert.equal(h.created,0);
});
test('partial secret installation can resume without creating a duplicate OAuth app',async()=>{
 const f=fixture({failFirstSecret:true});
 const first=await planOAuthClient(f.storage,env,{now});
 const fail=await confirmOAuthClient(f.storage,{requestId:first.requestId},env,{now,request:f.request});
 assert.equal(fail.ok,false);
 assert.equal(fail.error,'client_created_secret_install_retryable');
 assert.equal(f.created,1);
 const again=await planOAuthClient(f.storage,env,{now:now+1000});
 assert.equal(again.resumeInstallation,true);
 const result=await confirmOAuthClient(f.storage,{requestId:again.requestId},env,{now:now+1000,request:f.request});
 assert.equal(result.status,'installed');
 assert.equal(f.created,1);
});
test('owner gate exists on public routes, and client secret is never available through UI',()=>{
 const worker=readFileSync('workers/infinity-brain-clock/worker.js','utf8');
 const ui=readFileSync('bubbles-ai.js','utf8');
 const route=worker.slice(worker.indexOf("if(['/work/cloudflare/oauth-client-plan'"),worker.indexOf('// Read-only scientific tool.'));
 assert.match(route,/ownerAuthorized\(env,token\)/);
 assert.match(route,/origin_not_allowed/);
 assert.match(route,/request_too_large/);
 assert.match(route,/clock\.internal/);
 assert.match(ui,/setupCloudflareOAuthClient/);
 assert.match(ui,/verifiedOwnerHeaders\(\)/);
 assert.match(ui,/Register Bubbles as a private Cloudflare OAuth client/);
 assert.doesNotMatch(ui,/localStorage\.setItem\(['"]CLOUDFLARE_CLIENT_SECRET/);
 assert.ok(CAPABILITIES['oauth-client-write'].groupNames.includes('OAuth Clients Write'));
});
