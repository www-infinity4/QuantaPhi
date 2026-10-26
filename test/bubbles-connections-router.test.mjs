import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleConnections,PREFIX} from '../workers/bubbles-connections/router.mjs';
const bearer='Bearer sq_'+ 'a'.repeat(40);
function request(path,{method='GET',origin='https://quantaphi.org',authorization=bearer,body}={}) {
  return new Request('https://quantaphi.org'+PREFIX+path,{method,headers:{Origin:origin,Authorization:authorization,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
}
const FULL_CLOUDFLARE_SCOPES="user-details.read memberships.read workers-scripts.admin d1.write page.write d1.read workers-routes.read workers-routes.write page.read workers-kv-storage.read workers-kv-storage.write workers-r2.read workers-r2.write queues.read queues.write ai.read ai.write browser-rendering.read browser-rendering.write containers.read containers.write workers-observability.read dns.read dns.write";
const env={CONNECTIONS_READY:true,BOT_WALLET:{fetch:async(url,options)=>{assert.equal(url,'https://wallet.internal/v1/wallet/state');assert.equal(options.headers.Authorization,bearer);return Response.json({ok:true,user:{id:'verified-alice'}});}}};
test('router rejects foreign origins and unauthenticated callers before resolving storage',async()=>{
  const resolve=()=>assert.fail('must not resolve a service');
  assert.equal((await handleConnections(request('/accounts',{origin:'https://evil.test'}),env,resolve)).status,403);
  assert.equal((await handleConnections(request('/accounts',{authorization:''}),env,resolve)).status,401);
});
test('same-origin browser GET works without Origin while cross-site and unsafe requests stay blocked',async()=>{
  const headers={Authorization:bearer,'Sec-Fetch-Site':'same-origin'};
  const url='https://quantaphi.org'+PREFIX+'/catalog';
  const accepted=await handleConnections(new Request(url,{headers}),env,()=>assert.fail('catalog must not resolve user storage'));
  assert.equal(accepted.status,200);
  assert.equal((await accepted.json()).ok,true);
  for(const site of ['cross-site','same-site','none']){
    const denied=await handleConnections(new Request(url,{headers:{Authorization:bearer,'Sec-Fetch-Site':site}}),env,()=>assert.fail());
    assert.equal(denied.status,403);
  }
  const absent=await handleConnections(new Request(url,{headers:{Authorization:bearer}}),env,()=>assert.fail());
  assert.equal(absent.status,403);
  const unsafe=await handleConnections(new Request('https://quantaphi.org'+PREFIX+'/pair/redeem',{
    method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'}),env,()=>assert.fail());
  assert.equal(unsafe.status,403);
});
test('start registers state only for verified wallet identity',async()=>{
  let received,registered;
  const state='a'.repeat(43);
  const configured={...env,CONNECTIONS:{idFromName:name=>name,get:()=>({
    registerOAuthState:async input=>{registered=input;return {registered:true};}
  })}};
  const response=await handleConnections(request('/start',{method:'POST',body:{userId:'victim',sessionId:'attacker',provider:'google',actions:['drive.read']}}),configured,async id=>{
    assert.equal(id,'verified-alice');return {start:async input=>{received=input;return {authorizationUrl:'https://accounts.google.com/o/oauth2/v2/auth?state='+state,expiresIn:300};}};
  });
  assert.equal(response.status,200);
  assert.equal(received.userId,'verified-alice');
  assert.notEqual(received.sessionId,'attacker');
  assert.equal(registered.userId,'verified-alice');
  assert.equal(registered.state,state);
});
test('unconfigured service exposes catalog status without claiming accounts are connected',async()=>{
  const e={...env,CONNECTIONS_READY:false};
  const response=await handleConnections(request('/catalog'),e,()=>assert.fail());
  assert.ok((await response.json()).providers.every(p=>p.configured===false));
  assert.equal((await handleConnections(request('/accounts'),e,()=>assert.fail())).status,503);
});
test('provider callback stores authorization on the server and redirects to a code-free page',async()=>{
  const state='a'.repeat(43),received=[];
  const registry={lookupOAuthState:async input=>{assert.equal(input.state,state);return {userId:'verified-alice'};}};
  const configured={CONNECTIONS:{idFromName:name=>name,get:()=>registry}};
  const resolve=async userId=>({handoff:async input=>{received.push(input);assert.equal(userId,'verified-alice');return {received:true};}});
  const response=await handleConnections(new Request('https://quantaphi.org'+PREFIX+'/google/callback?state='+state+'&code=private-code'),configured,resolve);
  assert.equal(response.status,303);
  assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal(response.headers.get('Location'),PREFIX+'/google/callback?result=received');
  assert.equal(received[0].code,'private-code');
  assert.equal(await response.text(),'');
  const clean=await handleConnections(new Request('https://quantaphi.org'+PREFIX+'/google/callback?result=received'),configured,()=>assert.fail());
  const html=await clean.text();
  assert.equal(clean.status,200);
  assert.ok(!html.includes('private-code'));
  assert.ok(!html.includes('postMessage'));
  assert.match(html,/Return to Bubbles/);
  assert.match(html,/href="quantaphi-bubbles:\/\/return"/);
  assert.match(html,/href="\/bubbles-accounts\.html"/);
  assert.match(html,/Connection is not confirmed until Bubbles checks/);
  assert.ok(!html.includes(state));
  assert.ok(!/Bearer\\s+[A-Za-z0-9._~-]+/.test(html));
});
test('callback rejects unregistered states without revealing provider code',async()=>{
  const state='b'.repeat(43);
  const configured={CONNECTIONS:{idFromName:name=>name,get:()=>({lookupOAuthState:async()=>{throw Error('state_invalid_or_used');}})}};
  const response=await handleConnections(new Request('https://quantaphi.org'+PREFIX+'/github/callback?state='+state+'&code=secret'),configured,()=>assert.fail());
  assert.equal(response.status,303);
  assert.equal(response.headers.get('Location'),PREFIX+'/github/callback?result=failed');
  assert.ok(!response.headers.get('Location').includes('secret'));
});
test('unexpected provider error text is redacted and no token appears in response',async()=>{
  const response=await handleConnections(request('/refresh',{method:'POST',body:{id:'id'}}),env,()=>({refresh:async()=>{throw Error('secret-token-would-be-leaked');}}));
  assert.equal(response.status,503);assert.equal((await response.json()).error,'connection_operation_failed');
});

test('two-provider gate reuses tenant-scoped verified records and never gives chat permission itself',async()=>{
 const now=Date.now();
 const configured={...env,GITHUB_CLIENT_ID:'app-github',GITHUB_CLIENT_SECRET:'not-exposed',
  CLOUDFLARE_CLIENT_ID:'app-cloudflare',CLOUDFLARE_CLIENT_SECRET:'not-exposed',CLOUDFLARE_OAUTH_ALLOWED_SCOPES:FULL_CLOUDFLARE_SCOPES};
 let seen=null;
 const service={
  gateStatus:async input=>{
   seen=input;
   return [
    {provider:'github',status:'connected',label:'user-github',expiresAt:now+60000,grantedActions:[]},
    {provider:'cloudflare',status:'connected',label:'user-cloudflare',
     expiresAt:now+60000,grantedActions:['account.read','projects.build','ledger.read','projects.full']}
   ];
  }
 };
 const response=await handleConnections(request('/gate/status'),configured,async id=>{
  assert.equal(id,'verified-alice');return service;
 });
 const result=await response.json();
 assert.equal(response.status,200);
 assert.equal(seen.userId,'verified-alice');
 assert.equal(result.enforced,false);
 assert.equal(result.mode,'preview');
 assert.equal(result.ready,true);
 assert.equal(result.providers.cloudflare.permissionsApproved,true);
 assert.equal(result.providers.github.permissionsApproved,true);
 assert.ok(!JSON.stringify(result).includes('not-exposed'));
});
test('full Cloudflare project grant is required before reporting full access',async()=>{
 const now=Date.now(),configured={...env,GITHUB_CLIENT_ID:'app',GITHUB_CLIENT_SECRET:'hidden',CLOUDFLARE_CLIENT_ID:'app',CLOUDFLARE_CLIENT_SECRET:'hidden',CLOUDFLARE_OAUTH_ALLOWED_SCOPES:FULL_CLOUDFLARE_SCOPES};
 const service={gateStatus:async()=>[
  {provider:'github',status:'connected',expiresAt:now+60000,grantedActions:[]},
  {provider:'cloudflare',status:'connected',expiresAt:now+60000,
   grantedActions:['account.read','projects.build','ledger.read']}
 ]};
 const value=await (await handleConnections(request('/gate/status'),configured,()=>service)).json();
 assert.equal(value.ready,false);
 assert.deepEqual(value.providers.cloudflare.missingActions,['projects.full']);
 assert.equal(value.providers.cloudflare.permissionsApproved,false);
});
test('gate fails closed for missing Cloudflare setup, expired credentials and partial scopes',async()=>{
 const now=Date.now();
 const e={...env,GITHUB_CLIENT_ID:'github',GITHUB_CLIENT_SECRET:'secret'};
 const service={gateStatus:async()=>[
  {provider:'github',status:'connected',expiresAt:now-5000,grantedActions:[]},
  {provider:'cloudflare',status:'connected',expiresAt:now+60000,grantedActions:['account.read']}
 ]};
 const response=await handleConnections(request('/gate/status'),e,()=>service);
 const result=await response.json();
 assert.equal(result.ready,false);
 assert.equal(result.enforced,false);
 assert.equal(result.providers.cloudflare.configured,false);
 assert.equal(result.providers.github.permissionsApproved,false);
 assert.equal(result.providers.github.reconnectRequired,true);
 assert.equal(result.providers.cloudflare.label,null);
 assert.equal((await handleConnections(request('/gate/status',{authorization:''}),e,
  ()=>assert.fail('must not resolve unauthenticated user'))).status,401);
});
test('Cloudflare callback response never includes provider code or cross-window messaging',async()=>{
 const response=await handleConnections(request('/cloudflare/callback?result=received'),{},()=>assert.fail());
 const html=await response.text();
 assert.equal(response.status,200);
 assert.match(html,/Return to Bubbles/);
 assert.doesNotMatch(html,/BroadcastChannel|postMessage|private-code/);
 assert.ok(response.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
 assert.equal(response.headers.get('Cache-Control'),'no-store');
});

test('Cloudflare missing OAuth client registration is not advertised as ready despite a working platform token',async()=>{
 const result=await (await handleConnections(request('/catalog'),{...env,CLOUDFLARE_OAUTH_ALLOWED_SCOPES:FULL_CLOUDFLARE_SCOPES},
  ()=>assert.fail('catalog must not access private user data'))).json();
 const provider=result.providers.find(x=>x.id==='cloudflare');
 assert.equal(provider.configured,false);
 assert.equal(provider.fullProjectConfigured,false);
 assert.equal(provider.setupRequired,'oauth_client_not_configured');
 assert.equal(provider.actions.includes('projects.full'),true);
});
test('Cloudflare app registered without full project scopes blocks full consent instead of retrying login',async()=>{
 const limited={...env,CLOUDFLARE_CLIENT_ID:'client',CLOUDFLARE_CLIENT_SECRET:'private',
  CLOUDFLARE_OAUTH_ALLOWED_SCOPES:'user-details.read memberships.read'};
 const catalog=await (await handleConnections(request('/catalog'),limited,()=>assert.fail())).json();
 const cf=catalog.providers.find(p=>p.id==='cloudflare');
 assert.equal(cf.configured,true);
 assert.equal(cf.fullProjectConfigured,false);
 assert.deepEqual(cf.actions,['account.read']);
 const gate=await (await handleConnections(request('/gate/status'),limited,
  ()=>({gateStatus:async()=>[]}))).json();
 assert.equal(gate.providers.cloudflare.scopeSetupRequired,true);
 assert.deepEqual(gate.providers.cloudflare.authorizationActions,['account.read']);
 assert.equal(gate.providers.cloudflare.permissionsApproved,false);
 assert.equal(gate.providers.cloudflare.reconnectRequired,false);
});
test('Cloudflare account lookup and selection always receive verified wallet user ID, not supplied ID',async()=>{
 const calls=[],service={cloudflareAccounts:async input=>{calls.push(input);return {accounts:[{id:'a'.repeat(32),name:'Only mine'}]};},
  selectCloudflareAccount:async input=>{calls.push(input);return {account:{id:input.accountId,name:'Only mine'},storageReady:false};}};
 const list=await handleConnections(request('/cloudflare/accounts',{method:'POST',body:{id:'connection',userId:'victim'}}),env,()=>service);
 assert.equal(list.status,200);
 const select=await handleConnections(request('/cloudflare/select-account',{method:'POST',body:{id:'connection',accountId:'a'.repeat(32),userId:'victim'}}),env,()=>service);
 assert.equal(select.status,200);
 assert.ok(calls.every(x=>x.userId==='verified-alice'));
 assert.equal((await select.json()).storageReady,false);
});

test('OAuth callback HTML has no browser messaging or provider secrets',async()=>{
 const {callbackPage}=await import('../workers/bubbles-connections/router.mjs');
 const page=callbackPage('github','received');
 const html=await page.text();
 assert.equal(page.status,200);
 assert.doesNotMatch(html,/BroadcastChannel|postMessage|authorization-code|state=/);
 assert.match(html,/Return to Bubbles/);
 assert.match(page.headers.get('Content-Security-Policy'),/default-src 'none'/);
 assert.equal(page.headers.get('Cache-Control'),'no-store');
 assert.equal(callbackPage('unknown').status,404);
});
