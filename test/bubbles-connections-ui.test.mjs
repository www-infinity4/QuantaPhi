import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AccountConnections,mountConnections,resolveConnectorWalletToken,connectionCodeMessage,availableCloudflareLoginActions} from '../bubbles-connections.mjs';

test('account page launches real Cloudflare consent with registered actions even without the full project toolkit',async t=>{
 class Element {
  constructor(tag){this.tag=tag;this.childNodes=[];this.dataset={};this.listeners={};this.textContent='';this.classList={add(){}};}
  append(...nodes){this.childNodes.push(...nodes);}
  prepend(...nodes){this.childNodes.unshift(...nodes);}
  replaceChildren(...nodes){this.childNodes=nodes;}
  setAttribute(name,value){this[name]=value;}
  removeAttribute(name){delete this[name];}
  addEventListener(name,callback){this.listeners[name]=callback;}
 }
 const originals={document:globalThis.document,window:globalThis.window,sessionStorage:globalThis.sessionStorage,fetch:globalThis.fetch};
 t.after(()=>Object.assign(globalThis,originals));
 const document={createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),addEventListener(){}};
 const storage=new Map(),sessionStorage={getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 const popup={location:{},close(){}},calls=[];let accountRecords=[{id:'github-a',provider:'github',label:'www-infinity4',status:'connected',expiresAt:Date.now()+600000,grantedActions:['repository.read']}];
 const window={document,sessionStorage,location:{pathname:'/bubbles-accounts.html'},open:()=>popup,setTimeout:()=>1,clearTimeout(){},addEventListener(){},removeEventListener(){}};
 Object.assign(globalThis,{document,sessionStorage,window,fetch:async(url,options)=>{
  const path=String(url).replace('/api/bubbles/connections','');
  const body=options.body?JSON.parse(options.body):null;calls.push({path,body});
  if(path==='/catalog')return Response.json({ok:true,providers:[{id:'github',configured:true,actions:['repository.read']},{id:'cloudflare',configured:true,fullProjectConfigured:false,actions:['account.read','projects.build','ledger.read']},{id:'google',configured:false}]});
  if(path==='/accounts')return Response.json({ok:true,accounts:accountRecords});
  if(path==='/start')return Response.json({ok:true,authorizationUrl:'https://dash.cloudflare.com/oauth2/auth?state='+'s'.repeat(43),expiresIn:300});
  if(path==='/handoff/status')return Response.json({ok:true,status:'pending'});
  assert.fail('Unexpected endpoint '+path);
 }});
 const container=new Element('main'),panel=mountConnections(container,{token:async()=>'sq_'+'a'.repeat(40)});
 await panel.refresh();
 const descendants=node=>[node,...(node.childNodes||[]).flatMap(descendants)];
 assert.equal(descendants(container).some(node=>node.dataset?.provider==='github'),false,'Connected GitHub must not show a second sign-in button');
 assert.ok(descendants(container).some(node=>node.textContent?.includes('GitHub · Signed in as www-infinity4')));
 const button=descendants(container).find(node=>node.dataset?.provider==='cloudflare');
 assert.equal(button.disabled,false);
 assert.equal(button.textContent,'Sign in with Cloudflare');
 assert.equal(descendants(container).find(node=>node.tag==='fieldset').hidden,true);
 await button.listeners.click();
 assert.deepEqual(calls.find(call=>call.path==='/start').body,{provider:'cloudflare',actions:['account.read','projects.build','ledger.read']});
 assert.equal(new URL(popup.location.href).origin,'https://dash.cloudflare.com');
 assert.equal(JSON.parse(storage.get('bubbles:oauth-pending:v1')).returnPath,'/bubbles-accounts.html');
 panel.client.cancelConnect();
 accountRecords=[...accountRecords,{id:'cf-a',provider:'cloudflare',label:'owner@example.test',status:'connected',expiresAt:Date.now()+600000,grantedActions:['account.read']}];
 await panel.refresh();
 assert.equal(descendants(container).some(node=>node.dataset?.provider==='cloudflare'),false,'Connected Cloudflare button must disappear');
 assert.ok(descendants(container).some(node=>node.textContent?.includes('Cloudflare · Signed in as owner@example.test')));
 // An expired provider grant must not claim sign-in, even if the historical
 // row still has a connected status until the service refreshes it.
 accountRecords=accountRecords.map(row=>row.provider==='cloudflare'?{...row,expiresAt:Date.now()-10000}:row);
 await panel.refresh();
 assert.ok(descendants(container).some(node=>node.dataset?.provider==='cloudflare'));
 assert.ok(descendants(container).some(node=>String(node.textContent).includes('reconnect required')));

});

test('Android Cloudflare sign-in navigates this tab directly and never opens about:blank',async()=>{
 const state='m'.repeat(43),saved=new Map();let navigated='',popups=0;
 const root={
  location:{pathname:'/bubbles-accounts.html',assign(url){navigated=url;}},
  sessionStorage:{getItem:key=>saved.get(key)||null,setItem:(key,value)=>saved.set(key,value),removeItem:key=>saved.delete(key)},
  open(){popups++;throw Error('blank popup must not open');},
  setTimeout:()=>1,clearTimeout(){},addEventListener(){},removeEventListener(){}
 };
 const client=new AccountConnections({token:()=> 'existing-device-session',root,request:async url=>{
  if(url.endsWith('/start'))return Response.json({ok:true,authorizationUrl:'https://dash.cloudflare.com/oauth2/auth?state='+state,expiresIn:300});
  if(url.endsWith('/handoff/status'))return Response.json({ok:true,status:'pending'});
  assert.fail('Unexpected connection endpoint '+url);
 }});
 await client.connect('cloudflare',['account.read'],()=>{});
 assert.equal(popups,0);
 assert.equal(JSON.parse(saved.get('bubbles:oauth-pending:v1')).flow,'same-window');
 assert.equal(new URL(navigated).origin,'https://dash.cloudflare.com');
 assert.equal(JSON.parse(saved.get('bubbles:oauth-pending:v1')).returnPath,'/bubbles-accounts.html');
 assert.ok(!saved.get('bubbles:oauth-pending:v1').includes('existing-device-session'));
 client.cancelConnect();
});


test('old blank-popup authorization does not strand Sign in on a fresh page',()=>{
 const state='p'.repeat(43),data=new Map();
 const storage={getItem:key=>data.get(key)||null,setItem:(key,v)=>data.set(key,v),removeItem:key=>data.delete(key)};
 const root={sessionStorage:storage};
 const old={provider:'cloudflare',state,returnPath:'/bubbles-accounts.html',expiresAt:Date.now()+120000};
 storage.setItem('bubbles:oauth-pending:v1',JSON.stringify(old));
 const client=new AccountConnections({token:()=> 'current-device',root});
 assert.equal(client.readPendingHandoff(),null,'Legacy popup state must not block new login');
 assert.equal(data.has('bubbles:oauth-pending:v1'),false);
 storage.setItem('bubbles:oauth-pending:v1',JSON.stringify({...old,flow:'same-window'}));
 assert.equal(client.readPendingHandoff()?.state,state,'Verified same-tab callback state must remain resumable');
});

test('failed Cloudflare code exchange reports a specific retry message before expiring',async()=>{
 const state='r'.repeat(43),popup={location:{},close(){this.closed=true;}};
 const root={open:()=>popup,setTimeout:()=>1,clearTimeout(){},addEventListener(){},removeEventListener(){}};
 let completed;
 const client=new AccountConnections({token:()=> 'device-session',root,request:async url=>{
  if(url.endsWith('/start'))return Response.json({ok:true,authorizationUrl:'https://dash.cloudflare.com/oauth2/auth?state='+state,expiresIn:300});
  if(url.endsWith('/handoff/status'))return Response.json({ok:true,status:'received'});
  if(url.endsWith('/handoff/finish'))return Response.json({ok:false,error:'connection_operation_failed'},{status:503});
  assert.fail('Unexpected URL '+url);
 }});
 await client.connect('cloudflare',['account.read'],(error,account)=>{completed={error,account};});
 for(let i=0;i<6&&!completed;i++)await new Promise(resolve=>setImmediate(resolve));
 assert.ok(completed?.error);
 assert.match(completed.error.message,/could not complete the account connection/i);
 assert.doesNotMatch(completed.error.message,/expired/i);
 assert.equal(client.pending,null);
 assert.equal(popup.closed,true);
});

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

test('Android popup-blocked viewer can resume after returning from external Chrome',async()=>{
  const state='z'.repeat(43),data=new Map(),calls=[];let serverStatus='pending',navigated='';
  const root={open:()=>null,location:{assign:url=>{navigated=url;}},sessionStorage:{
    getItem:key=>data.get(key)||null,setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)
  },setTimeout:()=>1,clearTimeout(){},addEventListener(){},removeEventListener(){}};
  const request=async(url,options)=>{
    calls.push({url,body:options.body});
    if(url.endsWith('/start'))return Response.json({ok:true,authorizationUrl:'https://github.com/login/oauth/authorize?state='+state,expiresIn:300});
    if(url.endsWith('/handoff/status'))return Response.json({ok:true,status:serverStatus});
    if(url.endsWith('/handoff/finish'))return Response.json({ok:true,status:'connected',account:{label:'verified-github'}});
    throw Error('unexpected route');
  };
  const first=new AccountConnections({token:()=> 'wallet-bound-session',root,request});
  await first.connect('github',['repository.read'],()=>assert.fail('old viewer was navigated away'));
  assert.match(navigated,/^https:\/\/github.com\/login\/oauth\/authorize/);
  assert.ok(data.has('bubbles:oauth-pending:v1'));
  assert.ok(!data.get('bubbles:oauth-pending:v1').includes('wallet-bound-session'));
  assert.ok(!data.get('bubbles:oauth-pending:v1').includes('code'));
  first.cleanup(); // Android destroys the original page on external navigation.
  serverStatus='received';
  const restored=new AccountConnections({token:()=> 'wallet-bound-session',root,request});
  let outcome=null;
  assert.equal(restored.resumePending((error,account)=>outcome={error,account}),true);
  await new Promise(resolve=>setImmediate(resolve));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(outcome.error,null);
  assert.equal(outcome.account.label,'verified-github');
  assert.equal(data.has('bubbles:oauth-pending:v1'),false);
  assert.ok(calls.some(x=>x.url.endsWith('/handoff/finish')));
});
test('popup-blocked viewer refuses redirect when it cannot preserve authorization state',async()=>{
  const root={open:()=>null,location:{assign:()=>assert.fail('must not navigate without session storage')}};
  const client=new AccountConnections({token:()=> 'wallet',root,request:()=>assert.fail('must not start OAuth')});
  await assert.rejects(client.connect('github',['repository.read'],()=>{}),/Open Account Connections in Chrome/);
});

test('Android return accepts a sealed connected receipt without repeating token exchange',async()=>{
 const state='r'.repeat(43),popup={location:{},close(){this.closed=true;}},calls=[];
 const root={open:()=>popup,setTimeout:()=>1,clearTimeout(){},addEventListener(){},removeEventListener(){}};
 const client=new AccountConnections({root,token:()=> 'wallet-bound-session',request:async url=>{
  calls.push(url);
  if(url.endsWith('/start'))return Response.json({ok:true,authorizationUrl:'https://github.com/login/oauth/authorize?state='+state});
  if(url.endsWith('/handoff/status'))return Response.json({ok:true,status:'connected',account:{label:'saved-github'}});
  if(url.endsWith('/handoff/finish'))throw Error('must not exchange a second time');
  throw Error('unexpected route');
 }});
 let completed=null;
 await client.connect('github',['repository.read'],(error,account)=>{completed={error,account};});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(completed.error,null);
 assert.equal(completed.account.label,'saved-github');
 assert.equal(popup.closed,true);
 assert.equal(calls.filter(x=>x.endsWith('/handoff/finish')).length,0);
});

test('Account Connections Cloudflare sign-in is usable without unregistered full-project scopes',()=>{
 const provider={id:'cloudflare',configured:true,fullProjectConfigured:false,actions:['account.read']};
 assert.deepEqual(availableCloudflareLoginActions(provider),['account.read']);
 assert.deepEqual(availableCloudflareLoginActions({...provider,actions:['account.read','ledger.read','projects.full']}),['account.read','ledger.read','projects.full']);
 assert.deepEqual(availableCloudflareLoginActions({...provider,configured:false}),[]);
 assert.deepEqual(availableCloudflareLoginActions({...provider,actions:[]}),[]);
 assert.deepEqual(availableCloudflareLoginActions({...provider,id:'github'}),[]);
});
