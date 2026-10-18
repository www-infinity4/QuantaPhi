import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ConsentService} from '../workers/bubbles-connections/consent.mjs';
import {TokenVault, randomToken} from '../workers/bubbles-connections/vault.mjs';
import {googleAdapter, githubAdapter} from '../workers/bubbles-connections/providers.mjs';
import {executeGoogleRead,googleReadURL,selectGoogleResource} from '../workers/bubbles-connections/google-read.mjs';

// Serialized transactions model DO atomic storage; failures roll back writes.
function storage() {
  const rows = new Map(); let queue = Promise.resolve();
  const list = (map,options) => new Map([...map].filter(([key])=>key.startsWith(options.prefix)).slice(0,options.limit || 100));
  return {rows, get:async key=>rows.get(key), list:async options=>list(rows,options), transaction(fn) {
    const task = queue.then(async () => {
      const draft = new Map(rows);
      const value = await fn({get:async key => draft.get(key), put:async (key,value) => draft.set(key,value), delete:async key => draft.delete(key),list:async options=>list(draft,options)});
      rows.clear(); for (const [key,value] of draft) rows.set(key,value);
      return value;
    }); queue = task.catch(() => {}); return task;
  }};
}
function fixture() {
  let time = 1000, calls = 0;
  const db = storage(), vault = new TokenVault({v1:randomToken()}, 'v1');
  const adapter = {authorization:({state,challenge}) => 'https://accounts.google.com/o/oauth2/v2/auth?'+new URLSearchParams({state,code_challenge:challenge}),
    exchange:async () => {calls++; return {subject:'google-subject',label:'owner@example.test',accessToken:'secret-access',refreshToken:'secret-refresh',expiresIn:3600,grantedActions:['drive.read']};}};
  const service = new ConsentService({storage:db,vault,adapters:{google:adapter},now:()=>time});
  const input = {userId:'alice',sessionId:'session-a',provider:'google',actions:['drive.read']};
  const begin = async () => new URL((await service.start(input)).authorizationUrl).searchParams.get('state');
  const finish = state => service.complete({...input,state,code:'code'});
  return {db,vault,adapter,service,input,begin,finish,setTime:t=>time=t,get calls(){return calls;}};
}

test('vault encrypts secrets and authenticates user/connection context', async () => {
  const key = randomToken(), vault = new TokenVault({v1:key},'v1');
  const record = await vault.seal({token:'private-token'},'alice/google');
  assert.ok(!JSON.stringify(record).includes('private-token'));
  assert.deepEqual(await vault.open(record,'alice/google'),{token:'private-token'});
  await assert.rejects(vault.open(record,'bob/google'));
  await assert.rejects(new TokenVault({v1:randomToken()},'v1').open(record,'alice/google'));
  assert.deepEqual(await new TokenVault({v1:key,v2:randomToken()},'v2').open(record,'alice/google'),{token:'private-token'});
});
test('consent state uses PKCE and neither state storage nor response contains raw secrets', async () => {
  const f = fixture(), state = await f.begin();
  const result = await f.finish(state), stored = JSON.stringify([...f.db.rows]);
  assert.equal(result.status,'connected'); assert.deepEqual(result.grantedActions,['drive.read']);
  for (const secret of ['secret-access','secret-refresh','credentialRef','userId']) assert.ok(!JSON.stringify(result).includes(secret));
  assert.ok(!stored.includes('secret-access')); assert.ok(!stored.includes('secret-refresh'));
});
test('callback cannot be replayed or executed twice concurrently', async () => {
  const f = fixture(), state = await f.begin();
  const results = await Promise.allSettled([f.finish(state),f.finish(state)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1); assert.equal(f.calls,1);
  await assert.rejects(f.finish(state),/state_invalid_or_used/);
});
test('wrong user, provider or session cannot consume a legitimate callback', async () => {
  const f = fixture(), state = await f.begin();
  for (const change of [{userId:'bob'},{provider:'github'},{sessionId:'session-b'}]) {
    await assert.rejects(f.service.complete({...f.input,state,code:'code',...change}));
  }
  assert.equal(f.calls,0); assert.equal((await f.finish(state)).status,'connected');
});
test('expired state and missing configuration fail before token exchange', async () => {
  const f = fixture(), state = await f.begin(); f.setTime(301000);
  await assert.rejects(f.finish(state),/state_expired/); assert.equal(f.calls,0);
  await assert.rejects(f.service.start({...f.input,provider:'walmart',actions:['order.place']}),/not_configured/);
  await assert.rejects(f.service.start({...f.input,actions:['order.place']}),/unsupported_action/);
});
test('failed exchange burns state without persisting a connection', async () => {
  const f = fixture(), state = await f.begin(); f.adapter.exchange = async () => {throw Error('provider_unavailable');};
  await assert.rejects(f.finish(state),/provider_unavailable/);
  await assert.rejects(f.finish(state),/state_invalid_or_used/);
  assert.ok(![...f.db.rows.keys()].some(k=>k.includes(':connection:') || k.includes(':credential:')));
});
test('disconnect deletes credentials and cancels a callback already in flight', async () => {
  const f = fixture(), first = await f.finish(await f.begin()), state = await f.begin();
  let release, entered;
  const ready = new Promise(r=>entered=r), gate = new Promise(r=>release=r), exchange = f.adapter.exchange;
  f.adapter.exchange = async () => {entered(); await gate; return exchange();};
  const pending = f.finish(state); await ready;
  await f.service.disconnect({userId:'alice',id:first.id}); release();
  await assert.rejects(pending,/connection_cancelled/);
  assert.ok(![...f.db.rows.keys()].some(k=>k.includes(':credential:')));
  await assert.rejects(f.service.disconnect({userId:'bob',id:first.id}),/not_found/);
});

const config = {clientId:'client',clientSecret:'server-secret',redirectUri:'https://quantaphi.org/api/connections/google/callback'};
test('Google requests only chosen service scopes and explicit account selection', () => {
  const adapter = googleAdapter(config), url = new URL(adapter.authorization({state:'state',challenge:'challenge',actions:['sheets.read']}));
  assert.equal(url.searchParams.get('code_challenge_method'),'S256');
  assert.equal(url.searchParams.get('prompt'),'consent select_account');
  assert.ok(url.searchParams.get('scope').includes('spreadsheets.readonly'));
  assert.ok(!url.searchParams.get('scope').includes('drive.readonly'));
  assert.ok(!url.href.includes('server-secret'));
});
test('Google grants only requested actions actually present in provider response', async () => {
  const replies = [{access_token:'access',token_type:'Bearer',expires_in:3600,scope:'openid email https://www.googleapis.com/auth/drive.readonly'}, {sub:'stable-sub',email:'address@test',email_verified:true}];
  const calls = [];
  const adapter = googleAdapter(config,async (url,options)=>{calls.push({url,options}); return Response.json(replies.shift());});
  const result = await adapter.exchange({code:'code',verifier:'verifier',actions:['drive.read','drive.write']});
  assert.deepEqual(result.grantedActions,['drive.read']); assert.equal(result.subject,'stable-sub');
  assert.equal(calls[0].options.body.get('code_verifier'),'verifier');
  assert.equal(calls[1].options.headers.Authorization,'Bearer access');
});
test('GitHub identity never implies repository write/fork authority', async () => {
  const replies = [{access_token:'access',token_type:'bearer',expires_in:28800}, {id:123,login:'alice'}];
  const adapter = githubAdapter(config,async ()=>Response.json(replies.shift()));
  const url = new URL(adapter.authorization({state:'s',challenge:'c',actions:['repository.write']}));
  assert.equal(url.searchParams.has('scope'),false);
  assert.deepEqual((await adapter.exchange({code:'code',verifier:'verifier'})).grantedActions,[]);
});
test('provider errors and unsafe callback configuration fail closed', async () => {
  assert.throws(()=>googleAdapter({...config,redirectUri:'https://evil.test/path?redirect=anything'}),/configuration/);
  assert.throws(()=>githubAdapter({...config,clientSecret:''}),/not_configured/);
  const adapter = googleAdapter(config,async ()=>Response.json({error:'invalid_grant',error_description:'private token text'}));
  await assert.rejects(adapter.exchange({code:'code',verifier:'v',actions:[]}),/^Error: google_exchange_rejected$/);
});

test('parallel refreshes submit only one rotating refresh token', async () => {
  const f=fixture(),account=await f.finish(await f.begin());let release,entered,calls=0;
  const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  f.adapter.refresh=async()=>{calls++;entered();await gate;return {accessToken:'rotated-access',refreshToken:'rotated-refresh',expiresIn:3600,grantedActions:['drive.read','drive.write']};};
  const first=f.service.refresh({userId:'alice',id:account.id});await ready;
  await assert.rejects(f.service.refresh({userId:'alice',id:account.id}),/refresh_in_progress/);release();
  const result=await first;assert.equal(calls,1);assert.deepEqual(result.grantedActions,['drive.read']);
  const record=[...f.db.rows.values()].find(v=>v.id===account.id);
  const tokens=await f.vault.open(f.db.rows.get(record.credentialRef),record.credentialRef);
  assert.equal(tokens.refreshToken,'rotated-refresh');assert.ok(!JSON.stringify([...f.db.rows]).includes('rotated-access'));
});
test('disconnect wins over a successful refresh already in flight', async () => {
  const f=fixture(),account=await f.finish(await f.begin());let release,entered,revokes=0;
  const ready=new Promise(r=>entered=r),gate=new Promise(r=>release=r);
  f.adapter.refresh=async()=>{entered();await gate;return {accessToken:'late',refreshToken:'late-refresh',expiresIn:3600,grantedActions:['drive.read']};};
  f.adapter.revoke=async()=>{revokes++;};
  const refreshing=f.service.refresh({userId:'alice',id:account.id});await ready;
  const result=await f.service.disconnect({userId:'alice',id:account.id});release();
  assert.equal(result.providerRevocation,'confirmed');await assert.rejects(refreshing,/connection_cancelled/);
  assert.equal(revokes,2);assert.ok(![...f.db.rows.keys()].some(k=>k.includes(':credential:')));
  assert.equal((await f.service.list({userId:'alice'}))[0].status,'disconnected');
});
test('provider revoke failure cannot restore local access; repeated disconnect is safe', async()=>{
  const f=fixture(),account=await f.finish(await f.begin());f.adapter.revoke=async()=>{throw Error('private-provider-body');};
  assert.equal((await f.service.disconnect({userId:'alice',id:account.id})).providerRevocation,'failed');
  assert.equal((await f.service.disconnect({userId:'alice',id:account.id})).status,'disconnected');
  await assert.rejects(f.service.withCredential({userId:'alice',id:account.id,provider:'google',action:'drive.read'},()=>assert.fail()),/connection_not_verified/);
});
test('ambiguous refresh failure requires reconnect rather than replaying a rotated token', async()=>{
  const f=fixture(),account=await f.finish(await f.begin());let calls=0;
  f.adapter.refresh=async()=>{calls++;throw Error('lost response');};
  await assert.rejects(f.service.refresh({userId:'alice',id:account.id}),/reconnect_required/);
  await assert.rejects(f.service.refresh({userId:'alice',id:account.id}),/connection_not_verified/);assert.equal(calls,1);
});
test('Google refresh without a new refresh token retains the prior one', async()=>{
  const f=fixture(),account=await f.finish(await f.begin());
  f.adapter.refresh=async()=>({accessToken:'new',expiresIn:3600,grantedActions:['drive.read']});
  await f.service.refresh({userId:'alice',id:account.id});
  const record=[...f.db.rows.values()].find(v=>v.id===account.id);
  assert.equal((await f.vault.open(f.db.rows.get(record.credentialRef),record.credentialRef)).refreshToken,'secret-refresh');
});
test('Google read tool uses fixed endpoints, verifies caller and suppresses results after disconnect', async()=>{
  const f=fixture(),account=await f.finish(await f.begin());let calls=0;
  const request=async(url,options)=>{calls++;assert.equal(new URL(url).hostname,'www.googleapis.com');assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer secret-access');return Response.json({files:[{id:'f1',name:'report'}]});};
  const result=await executeGoogleRead(f.service,{userId:'alice',id:account.id,operation:'drive.list',args:{url:'https://attacker.test',query:'https://attacker.test'}},request);
  assert.equal(result.receipt.status,'provider_confirmed');assert.equal(result.data.files[0].id,'f1');
  await assert.rejects(executeGoogleRead(f.service,{userId:'bob',id:account.id,operation:'drive.list'},request));assert.equal(calls,1);
  await assert.rejects(executeGoogleRead(f.service,{userId:'alice',id:account.id,operation:'sheets.values',args:{spreadsheetId:'f1',range:'A1'}},request),/consent_required/);
  await assert.rejects(executeGoogleRead(f.service,{userId:'alice',id:account.id,operation:'drive.list'},async()=>{await f.service.disconnect({userId:'alice',id:account.id});return Response.json({files:[{name:'must not return'}]});}),/connection_cancelled/);
});
test('Sheets and Calendar require selected resources and encode path input',()=>{
  assert.throws(()=>googleReadURL('sheets.values',{spreadsheetId:'id',range:'A1'},{}),/resource_selection_required/);
  const url=new URL(googleReadURL('sheets.values',{spreadsheetId:'id',range:'A1:B9'},{resourceGrants:{sheets:['id']}}));
  assert.equal(url.hostname,'sheets.googleapis.com');assert.equal(url.pathname,'/v4/spreadsheets/id/values/A1%3AB9');
  assert.throws(()=>googleReadURL('calendar.events',{calendarId:'primary'},{}),/resource_selection_required/);
});
test('consent requests are rate limited and old states are cleaned up',async()=>{
  const f=fixture();for(let i=0;i<10;i++)await f.begin();await assert.rejects(f.begin(),/too_many_requests/);
  f.setTime(302000);await f.begin();assert.equal([...f.db.rows.keys()].filter(k=>k.includes(':state:')).length,1);
});
test('Google and GitHub refresh/revoke adapters keep credentials out of URLs',async()=>{
  const requests=[];
  const google=googleAdapter(config,async(url,options)=>{requests.push({url,options});return url.endsWith('/revoke')?new Response(null,{status:200}):Response.json({access_token:'new-access',token_type:'Bearer',expires_in:3600});});
  const tokens=await google.refresh({refreshToken:'private-refresh',actions:['drive.read']});assert.deepEqual(tokens.grantedActions,['drive.read']);
  await google.revoke({refreshToken:'private-refresh'});assert.ok(requests.every(r=>!r.url.includes('private-refresh')));
  const github=githubAdapter(config,async()=>Response.json({access_token:'new-access',token_type:'bearer',expires_in:28800}));
  await assert.rejects(github.refresh({refreshToken:'private-refresh',actions:[]}),/rotation_incomplete/);
});
test('explicit resource selection requires provider permission before saving a grant',async()=>{
  const f=fixture();f.adapter.exchange=async()=>({subject:'sub',accessToken:'secret',expiresIn:3600,grantedActions:['sheets.read']});
  const pending=await f.service.start({...f.input,actions:['sheets.read']});
  const account=await f.finish(new URL(pending.authorizationUrl).searchParams.get('state'));
  const input={userId:'alice',id:account.id,kind:'sheets',resourceId:'sheet1'};
  await assert.rejects(selectGoogleResource(f.service,input,async()=>new Response(null,{status:403})),/google_read_http_403/);
  const before=[...f.db.rows.values()].find(r=>r.id===account.id);assert.equal(before.resourceGrants,undefined);
  await selectGoogleResource(f.service,input,async url=>{assert.equal(new URL(url).hostname,'sheets.googleapis.com');return Response.json({spreadsheetId:'sheet1'});});
  const after=[...f.db.rows.values()].find(r=>r.id===account.id);assert.deepEqual(after.resourceGrants.sheets,['sheet1']);
  const result=await executeGoogleRead(f.service,{userId:'alice',id:account.id,operation:'sheets.values',args:{spreadsheetId:'sheet1',range:'A1'}},async()=>Response.json({values:[['hello']]}));
  assert.equal(result.data.values[0][0],'hello');
});


test('default provider fetch keeps the global receiver required by Web APIs',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async function(){
  assert.equal(this,globalThis,'fetch must retain its global receiver');
  calls++;return Response.json(calls===1?{access_token:'test-access',token_type:'bearer',expires_in:28800}:{id:123,login:'test-user'});
 };
 try{
  const adapter=githubAdapter({clientId:'test-client',clientSecret:'test-secret',redirectUri:'https://example.test/callback'});
  const result=await adapter.exchange({code:'test-code',verifier:'test-verifier'});
  assert.equal(result.subject,'123');assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});

test('default GitHub request blocks token redirects before forwarding credentials',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async function(url,options){
  calls++;assert.equal(options.redirect,'manual');
  assert.equal(options.headers['User-Agent'],'Bubbles-User-Connections');
  return new Response(null,{status:302,headers:{Location:'https://untrusted.example/token'}});
 };
 try{
  const adapter=githubAdapter({clientId:'test-client',clientSecret:'test-secret',redirectUri:'https://example.test/callback'});
  await assert.rejects(adapter.exchange({code:'test-code',verifier:'test-verifier'}),/github_token_redirect_external/);
  assert.equal(calls,1);
 }finally{globalThis.fetch=original;}
});
