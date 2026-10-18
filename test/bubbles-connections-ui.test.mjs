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
test('redeeming a pairing does not require an existing wallet in the destination browser',async()=>{
  const client=new AccountConnections({token:()=>assert.fail('destination has no wallet'),root:{},request:async(url,options)=>{assert.ok(!options.headers.Authorization);return Response.json({ok:true});}});
  assert.equal((await client.call('/pair/redeem',{code:'example'})).ok,true);
});
test('OAuth return checks exact popup, callback origin, provider and state before code exchange',async()=>{
  const listeners=new Map(),calls=[],popup={location:{},close(){this.closed=true;}};
  const root={location:{origin:'https://quantaphi.org'},open:()=>popup,setTimeout:()=>1,clearTimeout(){},addEventListener:(key,value)=>listeners.set(key,value),removeEventListener:key=>listeners.delete(key)};
  const request=async(url,options)=>{calls.push({url,options});return Response.json(url.endsWith('/start')?{ok:true,authorizationUrl:'https://accounts.google.com/o/oauth2/v2/auth?state=expected-state'}:{ok:true,account:{label:'connected'}});};
  const client=new AccountConnections({token:()=> 'private-device-token',request,root});let completed=false;
  await client.connect('google',['drive.read'],()=>completed=true);
  const listener=listeners.get('message'),message={type:'bubbles:oauth-return',provider:'google',state:'expected-state',code:'authorization-code'};
  for(const event of [{origin:'https://evil.test',source:popup,data:message},{origin:'https://quantaphi.org',source:{},data:message},{origin:'https://quantaphi.org',source:popup,data:{...message,state:'wrong'}}])await listener(event);
  assert.equal(calls.length,1);assert.equal(completed,false);
  await listener({origin:'https://quantaphi.org',source:popup,data:message});
  assert.equal(calls.length,2);assert.equal(completed,true);assert.equal(popup.closed,true);
  assert.ok(calls.every(c=>!c.url.includes('private-device-token')&&!c.options.body.includes('private-device-token')));
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
