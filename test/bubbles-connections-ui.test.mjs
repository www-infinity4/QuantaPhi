import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AccountConnections,resolveConnectorWalletToken,connectionCodeMessage} from '../bubbles-connections.mjs';
test('connector waits for device bridge and supports both wallet runtime exports',async()=>{
  let ready=false;const token='sq_'+'a'.repeat(40);
  assert.equal(await resolveConnectorWalletToken({QuantaCloudConnection:{ready:Promise.resolve().then(()=>ready=true),resolveDeviceToken:async()=>{assert.ok(ready);return token;}}}),token);
  assert.equal(await resolveConnectorWalletToken({InfinityUnifiedWallet:class{token(){return token;}}}),token);
  await assert.rejects(resolveConnectorWalletToken({}),/verified_wallet_required/);
  await assert.rejects(resolveConnectorWalletToken({QuantaCloudConnection:{resolveDeviceToken:async()=>''},InfinityUnifiedWallet:class{token(){return token;}}}),/verified_wallet_required/);
});
test('connection check times out even when wallet readiness never settles',async()=>{
 const client=new AccountConnections({token:()=>new Promise(()=>{}),request:()=>assert.fail('request must not run'),root:{},timeoutMs:15});
 await assert.rejects(client.call('/gate/status'),/connection_timeout/);
 assert.match(connectionCodeMessage(Error('connection_timeout')),/timed out/);
});
test('connection check aborts a hung fetch and bounds JSON body reads',async()=>{
 let signal;
 const stalled=new AccountConnections({token:()=> 'device-token',root:{},timeoutMs:15,request:async(_url,options)=>{
  signal=options.signal;
  return new Promise(()=>{});
 }});
 await assert.rejects(stalled.call('/gate/status'),/connection_timeout/);
 assert.equal(signal.aborted,true);
 const stalledBody=new AccountConnections({token:()=> 'device-token',root:{},timeoutMs:15,request:async(_url,options)=>{
  signal=options.signal;
  return {ok:true,json:()=>new Promise(()=>{})};
 }});
 await assert.rejects(stalledBody.call('/gate/status'),/connection_timeout/);
 assert.equal(signal.aborted,true);
});
test('live gate transport bypasses the historical pinned module and aborts hung calls',async()=>{
 const {AccountConnections:GateClient}=await import('../bubbles-connections-gate.mjs');
 const client=new GateClient({token:()=>new Promise(()=>{}),root:{},timeoutMs:15,
  request:()=>assert.fail('Unresolved wallet must not trigger network access')});
 await assert.rejects(client.call('/gate/status'),/connection_timeout/);
 let signal;
 const stalled=new GateClient({token:async()=> 'device-token',root:{},timeoutMs:15,
  request:async(_url,options)=>{signal=options.signal;return new Promise(()=>{})}});
 await assert.rejects(stalled.call('/gate/status'),/connection_timeout/);
 assert.equal(signal.aborted,true);
});
test('redeeming a pairing does not require an existing wallet in the destination browser',async()=>{
  const client=new AccountConnections({token:()=>assert.fail('destination has no wallet'),root:{},request:async(url,options)=>{assert.ok(!options.headers.Authorization);return Response.json({ok:true});}});
  assert.equal((await client.call('/pair/redeem',{code:'example'})).ok,true);
});
test('OAuth resumes after Android browser return without sharing a popup or code',async()=>{
  const listeners=new Map(),calls=[],popup={location:{},close(){this.closed=true;}};
  const state='a'.repeat(43);let serverStatus='pending';
  const root={open:()=>popup,setTimeout:()=>1,clearTimeout(){},
    addEventListener:(key,value)=>listeners.set(key,value),removeEventListener:key=>listeners.delete(key)};
  const request=async(url,options)=>{
    calls.push({url,options});
    if(url.endsWith('/start'))return Response.json({ok:true,authorizationUrl:'https://accounts.google.com/o/oauth2/v2/auth?state='+state});
    if(url.endsWith('/handoff/status'))return Response.json({ok:true,status:serverStatus});
    if(url.endsWith('/handoff/finish'))return Response.json({ok:true,status:'connected',account:{label:'verified'}});
    throw Error('unexpected endpoint');
  };
  const client=new AccountConnections({token:()=> 'private-device-token',request,root});
  let completed=null;
  await client.connect('google',['drive.read'],(error,account)=>{completed={error,account};});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(completed,null);
  assert.match(popup.location.href,/accounts.google.com/);
  serverStatus='received';
  listeners.get('focus')();
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(completed.account.label,'verified');
  assert.equal(completed.error,null);
  assert.equal(popup.closed,true);
  assert.ok(calls.some(c=>c.url.endsWith('/handoff/finish')));
  assert.ok(calls.every(c=>!c.url.endsWith('/complete')&&!String(c.options.body).includes('authorization-code')));
});
test('unsafe authorization URL closes the popup without navigating to it',async()=>{
  const popup={location:{},close(){this.closed=true;}},root={open:()=>popup};
  const client=new AccountConnections({token:()=> 'device-token',root,request:async()=>Response.json({ok:true,authorizationUrl:'https://evil.test/?state=state'})});
  await assert.rejects(client.connect('google',['drive.read'],()=>{}),/address rejected/);
  assert.equal(popup.location.href,undefined);assert.equal(popup.closed,true);
});

test('pairing reports bounded service errors without exposing raw server details',()=>{
 for(const message of ['wallet_validation_unavailable','origin_not_allowed','connection_operation_failed','connections_not_configured','connection_response_invalid'])assert.ok(connectionCodeMessage(Error(message)).length>30);
 assert.match(connectionCodeMessage(Error('connection_operation_failed')),/service repair/);
 assert.ok(!connectionCodeMessage(Error('secret-provider-token')).includes('secret-provider-token'));
});
test('non-JSON connection responses produce a stable diagnostic',async()=>{
 const client=new AccountConnections({token:()=> 'device-token',root:{},request:async()=>new Response('<html>Bad Gateway</html>',{status:502})});
 await assert.rejects(client.call('/pair/create',{}),/connection_response_invalid/);
});

test('default browser fetch is called without the connection client as receiver',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async function(url,options){
  assert.equal(this,undefined);
  assert.equal(url,'/api/bubbles/connections/pair/create');
  assert.equal(options.headers.Authorization,'Bearer device-token');
  return Response.json({ok:true,code:'test-code'});
 };
 try{
  const client=new AccountConnections({token:()=> 'device-token',root:{}});
  assert.equal((await client.call('/pair/create',{})).code,'test-code');
 }finally{globalThis.fetch=original;}
});

test('Cloudflare OAuth uses its real consent endpoint and verifies scopes before connection',async()=>{
 const {cloudflareAdapter}=await import('../workers/bubbles-connections/providers.mjs');
 const calls=[];
 const scopes='user-details.read memberships.read workers-scripts.admin d1.write page.write d1.read';
 const request=async(url,options)=>{
  calls.push({url,method:options?.method||'GET'});
  if(url==='https://dash.cloudflare.com/oauth2/token'){
   assert.equal(options.method,'POST');
   assert.match(options.headers.Authorization,/^Basic /);
   const body=options.body;
   assert.equal(body.get('code_verifier'),'verifier-test');
   return Response.json({access_token:'private-access',refresh_token:'private-refresh',token_type:'Bearer',expires_in:3600,scope:scopes});
  }
  if(url==='https://dash.cloudflare.com/oauth2/userinfo'){
   assert.equal(options.headers.Authorization,'Bearer private-access');
   return Response.json({sub:'cloudflare-stable-user',email:'owner@example.test'});
  }
  throw Error('Unexpected Cloudflare endpoint');
 };
 const adapter=cloudflareAdapter({clientId:'cf-client',clientSecret:'server-only-secret',redirectUri:'https://quantaphi.org/api/bubbles/connections/cloudflare/callback'},request);
 const url=new URL(adapter.authorization({state:'state-test',challenge:'challenge-test',actions:['account.read','projects.build','ledger.read']}));
 assert.equal(url.origin,'https://dash.cloudflare.com');
 assert.equal(url.pathname,'/oauth2/auth');
 assert.equal(url.searchParams.get('code_challenge'),'challenge-test');
 assert.equal(url.searchParams.get('code_challenge_method'),'S256');
 assert.match(url.searchParams.get('scope'),/workers-scripts\.admin/);
 assert.match(url.searchParams.get('scope'),/d1\.write/);
 assert.doesNotMatch(url.href,/server-only-secret/);
 assert.throws(()=>adapter.authorization({state:'x',challenge:'y',actions:['wallet.mint']}),/unsupported_action/);
 const exchanged=await adapter.exchange({code:'code-test',verifier:'verifier-test',actions:['account.read','projects.build','ledger.read']});
 assert.equal(exchanged.subject,'cloudflare-stable-user');
 assert.deepEqual(exchanged.grantedActions,['account.read','projects.build','ledger.read']);
 assert.equal(calls.length,2);
});
test('Bubbles full project grant requests real provider scopes and requires every scope',async()=>{
 const {cloudflareAdapter}=await import('../workers/bubbles-connections/providers.mjs');
 const all=['user-details.read','memberships.read','workers-scripts.admin','d1.write','page.write','d1.read',
   'workers-routes.read','workers-routes.write','page.read','workers-kv-storage.read','workers-kv-storage.write',
   'workers-r2.read','workers-r2.write','queues.read','queues.write','ai.read','ai.write',
   'browser-rendering.read','browser-rendering.write','containers.read','containers.write','workers-observability.read',
   'dns.read','dns.write'];
 let providerScopes=all;
 const adapter=cloudflareAdapter({clientId:'client-id',clientSecret:'server-side',redirectUri:'https://quantaphi.org/api/bubbles/connections/cloudflare/callback'},async url=>url.endsWith('/token')?
   Response.json({access_token:'test-token',refresh_token:'refresh',token_type:'Bearer',expires_in:3600,scope:providerScopes.join(' ')}):
   Response.json({sub:'cloudflare-owner',email:'owner@example.test'}));
 const actions=['account.read','projects.build','ledger.read','projects.full'];
 const url=new URL(adapter.authorization({state:'state',challenge:'challenge',actions}));
 const requested=new Set(url.searchParams.get('scope').split(' '));
 for(const scope of all)assert.ok(requested.has(scope),scope+' must be requested');
 assert.equal(requested.size,all.length,'no unreviewed OAuth scopes');
 assert.doesNotMatch(url.href,/server-side/);
 const complete=await adapter.exchange({code:'code',verifier:'verifier',actions});
 assert.deepEqual(complete.grantedActions,actions);
 providerScopes=all.filter(scope=>scope!=='queues.write');
 const partial=await adapter.exchange({code:'code',verifier:'verifier',actions});
 assert.deepEqual(partial.grantedActions,['account.read','projects.build','ledger.read']);
});
test('Cloudflare OAuth never mistakes limited consent for project management permission',async()=>{
 const {cloudflareAdapter}=await import('../workers/bubbles-connections/providers.mjs');
 const adapter=cloudflareAdapter({clientId:'cf-client',clientSecret:'secret',redirectUri:'https://quantaphi.org/api/bubbles/connections/cloudflare/callback'},async(url)=>{
  if(url.endsWith('/token'))return Response.json({access_token:'limited',refresh_token:'refresh',token_type:'bearer',expires_in:3600,scope:'user-details.read memberships.read'});
  return Response.json({sub:'unique-cloudflare-user',email:'user@example.test'});
 });
 const result=await adapter.exchange({code:'code',verifier:'verifier',actions:['account.read','projects.build']});
 assert.deepEqual(result.grantedActions,['account.read']);
});

test('Cloudflare Bubbles client restricts requests to scopes registered on its own OAuth app',async()=>{
 const {cloudflareAdapter,cloudflareAvailableActions}=await import('../workers/bubbles-connections/providers.mjs');
 const allowed='user-details.read memberships.read d1.read';
 assert.deepEqual(cloudflareAvailableActions(allowed),['account.read','ledger.read']);
 assert.deepEqual(cloudflareAvailableActions(''),[]);
 const adapter=cloudflareAdapter({clientId:'bubble-app',clientSecret:'server-only',allowedScopes:allowed,
   redirectUri:'https://quantaphi.org/api/bubbles/connections/cloudflare/callback'});
 assert.throws(()=>adapter.authorization({state:'x',challenge:'y',actions:['projects.full']}),/cloudflare_client_scopes_unavailable/);
 const url=new URL(adapter.authorization({state:'x',challenge:'y',actions:['account.read','ledger.read']}));
 assert.equal(url.searchParams.get('scope'),'user-details.read memberships.read d1.read');
 assert.ok(!url.href.includes('server-only'));
});
test('Cloudflare account discovery is verified with the users token and strips private API fields',async()=>{
 const {cloudflareAdapter}=await import('../workers/bubbles-connections/providers.mjs');
 const id='a'.repeat(32),calls=[];
 const adapter=cloudflareAdapter({clientId:'app',clientSecret:'secret',allowedScopes:'user-details.read memberships.read',
   redirectUri:'https://quantaphi.org/api/bubbles/connections/cloudflare/callback'},async(url,options)=>{
     calls.push({url,authorization:options.headers.Authorization});
     return Response.json({success:true,result:[{id,name:'Personal account',api_key:'SHOULD_NOT_LEAK'}],result_info:{total_pages:1}});
   });
 const result=await adapter.accounts({accessToken:'user-specific-token'});
 assert.deepEqual(result,{accounts:[{id,name:'Personal account'}],truncated:false});
 assert.equal(calls[0].authorization,'Bearer user-specific-token');
 assert.equal(calls[0].url,'https://api.cloudflare.com/client/v4/accounts?page=1&per_page=50');
 assert.ok(!JSON.stringify(result).includes('SHOULD_NOT_LEAK'));
});

test('separate Chrome context needs no BroadcastChannel or window.opener',async()=>{
 const popup={location:{},close(){this.closed=true;}},calls=[];
 const state='b'.repeat(43);
 const root={open:()=>popup,setTimeout:()=>1,clearTimeout(){},
   BroadcastChannel:class{constructor(){throw Error('should not create a channel');}},
   addEventListener(){},removeEventListener(){}};
 const client=new AccountConnections({root,token:()=> 'private-device-token',request:async(url)=>{
   calls.push(url);
   if(url.endsWith('/start'))return Response.json({ok:true,authorizationUrl:'https://github.com/login/oauth/authorize?state='+state});
   if(url.endsWith('/handoff/status'))return Response.json({ok:true,status:'received'});
   if(url.endsWith('/handoff/finish'))return Response.json({ok:true,status:'connected',account:{label:'github-owner'}});
   throw Error('unexpected request');
 }});
 let completion=0;
 await client.connect('github',['repository.read'],(error,account)=>{
   assert.equal(error,null);assert.equal(account.label,'github-owner');completion++;
 });
 await new Promise(resolve=>setImmediate(resolve));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(completion,1);
 assert.equal(popup.closed,true);
 assert.ok(calls.includes('/api/bubbles/connections/handoff/finish'));
});
