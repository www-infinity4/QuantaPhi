import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ConsentService} from '../workers/bubbles-connections/consent.mjs';
import {TokenVault, randomToken} from '../workers/bubbles-connections/vault.mjs';
import {googleAdapter, githubAdapter} from '../workers/bubbles-connections/providers.mjs';

// Serialized transactions model DO atomic storage; failures roll back writes.
function storage() {
  const rows = new Map(); let queue = Promise.resolve();
  return {rows, transaction(fn) {
    const task = queue.then(async () => {
      const draft = new Map(rows);
      const value = await fn({get:async key => draft.get(key), put:async (key,value) => draft.set(key,value), delete:async key => draft.delete(key)});
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
  assert.equal(f.db.rows.size,0);
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
