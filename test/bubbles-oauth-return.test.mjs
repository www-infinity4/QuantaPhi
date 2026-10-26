import {test} from 'node:test';
import assert from 'node:assert/strict';
import {completeBubblesReturn,BUBBLES_RETURN} from '../bubbles-oauth-return.mjs';
import {AccountConnections} from '../bubbles-connections-gate.mjs';
const state='s'.repeat(43),token='sq_'+'x'.repeat(40);
function fixture(){
 const status={textContent:''},calls=[],listeners=new Map(),popup={location:{},closed:false,close(){this.closed=true}};
 const root={location:{replace:url=>calls.push({replace:url})},open:()=>popup,
  setTimeout:()=>1,clearTimeout(){},setInterval:()=>2,clearInterval(){},
  addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};
 const doc={getElementById:()=>status};
 const start='https://github.com/login/oauth/authorize?'+new URLSearchParams({state,redirect_uri:'https://quantaphi.org/api/bubbles/connections/github/callback'});
 const request=async(url,options)=>{calls.push({url,options});return Response.json(url.endsWith('/start')?{ok:true,authorizationUrl:start}:{ok:true,account:{provider:'github',status:'connected'}});};
 return {root,status,calls,listeners,popup,document:doc,request};
}
test('current transport rejects a provider URL pointing to an old application callback',async()=>{
 const f=fixture(),client=new AccountConnections({root:f.root,token:()=>token,request:async()=>Response.json({ok:true,authorizationUrl:'https://github.com/login/oauth/authorize?'+new URLSearchParams({state,redirect_uri:'https://old.example/callback'})})});
 await assert.rejects(client.connect('github',['repository.read'],()=>{}),/callback must return to the current/);
 assert.equal(f.popup.closed,true);assert.equal(client.pending,null);
});
test('malformed, duplicate or fragment-bearing consent URLs fail before leaving Bubbles',async()=>{
 const callback='https://quantaphi.org/api/bubbles/connections/github/callback';
 const url=(nonce=state)=>'https://github.com/login/oauth/authorize?'+new URLSearchParams({state:nonce,redirect_uri:callback});
 const invalid=[url('short'),url('
 const f=fixture(),client=new AccountConnections({root:f.root,token:()=>token,request:f.request});let completed=0;
 await client.connect('github',['repository.read'],error=>{assert.ifError(error);completed++;});
 const listener=f.listeners.get('message'),data={type:'bubbles:oauth-return',provider:'github',state,code:'synthetic-code'};
 for(const event of [{origin:'https://evil.test',source:f.popup,data},{origin:'https://quantaphi.org',source:{},data},{origin:'https://quantaphi.org',source:f.popup,data:{...data,provider:'cloudflare'}},{origin:'https://quantaphi.org',source:f.popup,data:{...data,state:'wrong'}}])await listener(event);
 assert.equal(f.calls.length,1);assert.equal(completed,0);
 await listener({origin:'https://quantaphi.org',source:f.popup,data});
 assert.equal(completed,1);assert.equal(f.calls.length,2);assert.equal(f.popup.closed,true);
 assert.equal(f.listeners.size,0);
});
test('popup startup is serialized even before the server returns its consent URL',async()=>{
 const f=fixture();let release;
 const client=new AccountConnections({root:f.root,token:()=>token,request:()=>new Promise(resolve=>release=resolve)});
 const first=client.connect('github',[],()=>{});await Promise.resolve();await Promise.resolve();
 await assert.rejects(client.connect('github',[],()=>{}),/Finish the current/);
 release(Response.json({ok:true,authorizationUrl:'https://evil.test/'}));
 await assert.rejects(first,/Sign-in address rejected/);
});
test('missing opener completes with the verified session and fixed current application, never a request URL',async()=>{
 const f=fixture(),client={call:async(path,body)=>{assert.equal(path,'/complete');assert.equal(body.state,state);f.calls.push(body);return {ok:true,account:{status:'connected'}};}};
 assert.equal(await completeBubblesReturn({...f,provider:'github',state,code:'synthetic-code',client}),true);
 assert.deepEqual(f.calls.at(-1),{replace:BUBBLES_RETURN});
 assert.ok(!JSON.stringify(f.status).includes('synthetic-code'));
});
test('invalid, declined or session-mismatched callback never redirects or claims a connection',async()=>{
 for(const change of [{state:'wrong'},{error:true},{code:''},{provider:'fake'}]){
  const f=fixture();assert.equal(await completeBubblesReturn({...f,provider:'github',state,code:'code',...change,client:{call:()=>assert.fail()}}),false);
  assert.equal(f.calls.length,0);
 }
 const f=fixture();
 assert.equal(await completeBubblesReturn({...f,provider:'github',state,code:'code',client:{call:async()=>{throw Error('callback_session_mismatch')}}}),false);
 assert.match(f.status.textContent,/No connection is confirmed/);assert.equal(f.calls.length,0);
});
test('popup callback rejects missing or oversized authorization codes before messaging the opener',async()=>{
 for(const code of ['', 'x'.repeat(4097)]){
  const f=fixture(),posts=[];
  f.root.opener={postMessage:(message,target)=>posts.push({message,target})};
  assert.equal(await completeBubblesReturn({...f,provider:'github',state,code,client:{call:()=>assert.fail()}}),false);
  assert.equal(posts.length,0);
  assert.match(f.status.textContent,/valid sign-in code/);
 }
});

test('popup callback posts only to fixed Bubbles origins and never navigates the opener',async()=>{
 const f=fixture(),posts=[];f.root.opener={postMessage:(message,target)=>posts.push({message,target})};
 assert.equal(await completeBubblesReturn({...f,provider:'github',state,code:'code',client:{call:()=>assert.fail()}}),true);
 assert.deepEqual(posts.map(x=>x.target),['https://quantaphi.org','https://www.quantaphi.org']);
 assert.equal(f.calls.length,0);
});

test('malformed or declined popup returns fail closed, close the window and release retry',async()=>{
 for(const bad of [{code:''},{code:'x'.repeat(4097)},{code:null},{code:'code',error:'provider_declined'}]){
  const f=fixture(),failures=[];
  const client=new AccountConnections({root:f.root,token:()=>token,request:f.request});
  await client.connect('github',['repository.read'],error=>failures.push(error));
  const listener=f.listeners.get('message');
  await listener({origin:'https://quantaphi.org',source:f.popup,
   data:{type:'bubbles:oauth-return',provider:'github',state,...bad}});
  assert.equal(f.calls.length,1,'invalid callbacks must never reach /complete');
  assert.equal(f.popup.closed,true,'failed popup must close');
  assert.equal(client.pending,null,'owner must be able to retry');
  assert.equal(failures.length,1);
  assert.match(failures[0].message,bad.error?/declined/:/valid authorization code/);
 }
});
.repeat(43)),url()+'&state=duplicate',
  url()+'&redirect_uri='+encodeURIComponent('https://old.example/callback'),url()+'#fragment'];
 for(const authorizationUrl of invalid){
  const f=fixture();
  const client=new AccountConnections({root:f.root,token:()=>token,
   request:async()=>Response.json({ok:true,authorizationUrl})});
  await assert.rejects(client.connect('github',['repository.read'],()=>{}),/Sign-in address rejected/);
  assert.equal(f.popup.closed,true,'bad authorization must close the popup');
  assert.equal(client.pending,null,'failed authorization must allow retry');
  assert.equal(f.listeners.has('message'),false,'bad authorization must not install a listener');
 }
});

test('current transport checks origin, exact popup, provider and state before exchanging a code',async()=>{
 const f=fixture(),client=new AccountConnections({root:f.root,token:()=>token,request:f.request});let completed=0;
 await client.connect('github',['repository.read'],error=>{assert.ifError(error);completed++;});
 const listener=f.listeners.get('message'),data={type:'bubbles:oauth-return',provider:'github',state,code:'synthetic-code'};
 for(const event of [{origin:'https://evil.test',source:f.popup,data},{origin:'https://quantaphi.org',source:{},data},{origin:'https://quantaphi.org',source:f.popup,data:{...data,provider:'cloudflare'}},{origin:'https://quantaphi.org',source:f.popup,data:{...data,state:'wrong'}}])await listener(event);
 assert.equal(f.calls.length,1);assert.equal(completed,0);
 await listener({origin:'https://quantaphi.org',source:f.popup,data});
 assert.equal(completed,1);assert.equal(f.calls.length,2);assert.equal(f.popup.closed,true);
 assert.equal(f.listeners.size,0);
});
test('popup startup is serialized even before the server returns its consent URL',async()=>{
 const f=fixture();let release;
 const client=new AccountConnections({root:f.root,token:()=>token,request:()=>new Promise(resolve=>release=resolve)});
 const first=client.connect('github',[],()=>{});await Promise.resolve();await Promise.resolve();
 await assert.rejects(client.connect('github',[],()=>{}),/Finish the current/);
 release(Response.json({ok:true,authorizationUrl:'https://evil.test/'}));
 await assert.rejects(first,/Sign-in address rejected/);
});
test('missing opener completes with the verified session and fixed current application, never a request URL',async()=>{
 const f=fixture(),client={call:async(path,body)=>{assert.equal(path,'/complete');assert.equal(body.state,state);f.calls.push(body);return {ok:true,account:{status:'connected'}};}};
 assert.equal(await completeBubblesReturn({...f,provider:'github',state,code:'synthetic-code',client}),true);
 assert.deepEqual(f.calls.at(-1),{replace:BUBBLES_RETURN});
 assert.ok(!JSON.stringify(f.status).includes('synthetic-code'));
});
test('invalid, declined or session-mismatched callback never redirects or claims a connection',async()=>{
 for(const change of [{state:'wrong'},{error:true},{code:''},{provider:'fake'}]){
  const f=fixture();assert.equal(await completeBubblesReturn({...f,provider:'github',state,code:'code',...change,client:{call:()=>assert.fail()}}),false);
  assert.equal(f.calls.length,0);
 }
 const f=fixture();
 assert.equal(await completeBubblesReturn({...f,provider:'github',state,code:'code',client:{call:async()=>{throw Error('callback_session_mismatch')}}}),false);
 assert.match(f.status.textContent,/No connection is confirmed/);assert.equal(f.calls.length,0);
});
test('popup callback rejects missing or oversized authorization codes before messaging the opener',async()=>{
 for(const code of ['', 'x'.repeat(4097)]){
  const f=fixture(),posts=[];
  f.root.opener={postMessage:(message,target)=>posts.push({message,target})};
  assert.equal(await completeBubblesReturn({...f,provider:'github',state,code,client:{call:()=>assert.fail()}}),false);
  assert.equal(posts.length,0);
  assert.match(f.status.textContent,/valid sign-in code/);
 }
});

test('popup callback posts only to fixed Bubbles origins and never navigates the opener',async()=>{
 const f=fixture(),posts=[];f.root.opener={postMessage:(message,target)=>posts.push({message,target})};
 assert.equal(await completeBubblesReturn({...f,provider:'github',state,code:'code',client:{call:()=>assert.fail()}}),true);
 assert.deepEqual(posts.map(x=>x.target),['https://quantaphi.org','https://www.quantaphi.org']);
 assert.equal(f.calls.length,0);
});

test('malformed or declined popup returns fail closed, close the window and release retry',async()=>{
 for(const bad of [{code:''},{code:'x'.repeat(4097)},{code:null},{code:'code',error:'provider_declined'}]){
  const f=fixture(),failures=[];
  const client=new AccountConnections({root:f.root,token:()=>token,request:f.request});
  await client.connect('github',['repository.read'],error=>failures.push(error));
  const listener=f.listeners.get('message');
  await listener({origin:'https://quantaphi.org',source:f.popup,
   data:{type:'bubbles:oauth-return',provider:'github',state,...bad}});
  assert.equal(f.calls.length,1,'invalid callbacks must never reach /complete');
  assert.equal(f.popup.closed,true,'failed popup must close');
  assert.equal(client.pending,null,'owner must be able to retry');
  assert.equal(failures.length,1);
  assert.match(failures[0].message,bad.error?/declined/:/valid authorization code/);
 }
});
