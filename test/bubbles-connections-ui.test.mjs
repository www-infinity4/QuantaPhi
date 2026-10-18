import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AccountConnections} from '../bubbles-connections.mjs';
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
