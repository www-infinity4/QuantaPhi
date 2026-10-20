import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handleConnections,PREFIX} from '../workers/bubbles-connections/router.mjs';
const bearer='Bearer sq_'+ 'a'.repeat(40);
function request(path,{method='GET',origin='https://quantaphi.org',authorization=bearer,body}={}) {
  return new Request('https://quantaphi.org'+PREFIX+path,{method,headers:{Origin:origin,Authorization:authorization,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
}
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
test('caller supplied identities cannot replace verified wallet identity or device session',async()=>{
  let received;
  const response=await handleConnections(request('/start',{method:'POST',body:{userId:'victim',sessionId:'attacker',provider:'google',actions:['drive.read']}}),env,async id=>{
    assert.equal(id,'verified-alice');return {start:async input=>{received=input;return {authorizationUrl:'https://accounts.google.com/'};}};
  });assert.equal(response.status,200);assert.equal(received.userId,'verified-alice');assert.notEqual(received.sessionId,'attacker');assert.ok(!received.sessionId.includes('sq_'));
});
test('unconfigured service exposes catalog status without claiming accounts are connected',async()=>{
  const e={...env,CONNECTIONS_READY:false};
  const response=await handleConnections(request('/catalog'),e,()=>assert.fail());
  assert.ok((await response.json()).providers.every(p=>p.configured===false));
  assert.equal((await handleConnections(request('/accounts'),e,()=>assert.fail())).status,503);
});
test('callback has no-store, referrer protection, fixed target origins and code removal',async()=>{
  const response=await handleConnections(request('/google/callback?code=private-code'),{},()=>assert.fail());
  const html=await response.text();assert.equal(response.status,200);assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
  assert.ok(html.includes('history.replaceState'));assert.ok(response.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
  assert.ok(!html.includes('private-code'));assert.ok(!html.includes("postMessage(message,'*')"));
});
test('unexpected provider error text is redacted and no token appears in response',async()=>{
  const response=await handleConnections(request('/refresh',{method:'POST',body:{id:'id'}}),env,()=>({refresh:async()=>{throw Error('secret-token-would-be-leaked');}}));
  assert.equal(response.status,503);assert.equal((await response.json()).error,'connection_operation_failed');
});

test('two-provider gate reuses tenant-scoped verified records and never gives chat permission itself',async()=>{
 const now=Date.now();
 const configured={...env,GITHUB_CLIENT_ID:'app-github',GITHUB_CLIENT_SECRET:'not-exposed',
  CLOUDFLARE_CLIENT_ID:'app-cloudflare',CLOUDFLARE_CLIENT_SECRET:'not-exposed'};
 let seen=null;
 const service={
  gateStatus:async input=>{
   seen=input;
   return [
    {provider:'github',status:'connected',label:'user-github',expiresAt:now+60000,grantedActions:[]},
    {provider:'cloudflare',status:'connected',label:'user-cloudflare',
     expiresAt:now+60000,grantedActions:['account.read','projects.build','ledger.read']}
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
test('Cloudflare OAuth callback is fixed-origin and removes incoming code from its HTML',async()=>{
 const response=await handleConnections(request('/cloudflare/callback?code=private-code'),{},()=>assert.fail());
 const html=await response.text();
 assert.equal(response.status,200);
 assert.match(html,/bubbles:oauth-return/);
 assert.ok(html.includes("history.replaceState"));
 assert.ok(!html.includes('private-code'));
 assert.ok(response.headers.get('Content-Security-Policy').includes("frame-ancestors 'none'"));
});

test('automatic first backup gets account and StarCoins from verified Cloudflare services, not request body',async()=>{
 const e={...env,STARQUEST_LEDGER:{fetch:async(url,options)=>{
  assert.equal(url,'https://starquest.internal/v1/state');
  assert.equal(options.headers.Authorization,bearer);
  return Response.json({ok:true,state:{username:'verified-user',starCoins:56,
   pendingShareCredits:6,shareCount:4,ledger:[]}});
 }},BOT_WALLET:{fetch:async(url,options)=>{
  assert.equal(url,'https://wallet.internal/v1/wallet/state');
  assert.equal(options.headers.Authorization,bearer);
  return Response.json({ok:true,user:{id:'verified-alice',username:'verified-user'},
   balances:{STARCOIN:56.6}});
 }}};
 let count=0;
 const response=await handleConnections(request('/github/starcoins/auto-bootstrap',{
  method:'POST',body:{userId:'victim',repository:'attacker/private',hash:'evil'}}),e,async id=>{
   assert.equal(id,'verified-alice');
   return {autoStarCoinBootstrap:async ({userId,snapshot})=>{
    count++;assert.equal(userId,'verified-alice');assert.equal(snapshot.data.balanceTenths,566);
    assert.equal(snapshot.data.schema,'infinity-starcoin-backup-v1');
    assert.ok(!JSON.stringify(snapshot).includes('attacker/private'));
    return {status:'committed',repository:'verified-user/private',private:true,
     coverage:'starcoins_pilot',commit:'a'.repeat(40)};
   }};
 });
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.ok,true);assert.equal(result.status,'committed');assert.equal(count,1);
});
test('automatic GitHub backup requires a live device token, not a connector pairing token',async()=>{
 const e={...env,STARQUEST_LEDGER:{fetch:()=>assert.fail('cannot fetch ledger')}};
 const requestPair=new Request('https://quantaphi.org'+PREFIX+'/github/starcoins/auto-bootstrap',{
  method:'POST',headers:{Origin:'https://quantaphi.org',Authorization:'Bearer bc_'+'a'.repeat(43),
   'Content-Type':'application/json'},body:'{}'});
 const envPair={...e,CONNECTIONS:{idFromName:x=>x,get:()=>({pairIdentity:async()=>({userId:'alice',sessionId:'pair'})})}};
 const response=await handleConnections(requestPair,envPair,()=>assert.fail('must not access user storage'));
 assert.equal(response.status,401);
 assert.equal((await response.json()).error,'starcoin_verified_device_required');
});
test('automatic GitHub backup status returns only the verified account records',async()=>{
 const response=await handleConnections(request('/github/starcoins/auto-status'),env,
  async userId=>{assert.equal(userId,'verified-alice');return {autoStarCoinStatus:async({userId:id})=>{
   assert.equal(id,'verified-alice');return {status:'not_created',coverage:'starcoins_pilot'};
  }};});
 assert.equal(response.status,200);
 assert.equal((await response.json()).status,'not_created');
});
