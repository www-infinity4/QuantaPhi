import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {summarizeGate,mountBubblesSigninGate} from '../bubbles-signin-gate.mjs';
import {cloudflareAdapter} from '../workers/bubbles-connections/providers.mjs';

test('both real authorizations must be server-confirmed before gate says ready',()=>{
 const valid={ready:true,providers:{
  github:{configured:true,connected:true,permissionsApproved:true,label:'gh-account'},
  cloudflare:{configured:true,connected:true,permissionsApproved:true,label:'cf-account',missingActions:[]}
 }};
 const result=summarizeGate(valid);
 assert.equal(result.ready,true);
 assert.equal(result.providers.github.label,'gh-account');
 assert.equal(result.providers.cloudflare.approved,true);
 assert.equal(result.state,'ready');
});
test('browser content cannot turn a disconnected or unconfigured provider into a valid connection',()=>{
 const misconfigured={ready:true,providers:{
  github:{configured:false,connected:true,permissionsApproved:true,label:'unverified'},
  cloudflare:{configured:true,connected:true,permissionsApproved:false,missingActions:['projects.build']}
 }};
 const result=summarizeGate(misconfigured);
 assert.equal(result.ready,false);
 assert.equal(result.providers.github.approved,false);
 assert.equal(result.providers.github.label,'');
 assert.equal(result.providers.cloudflare.connected,true);
 assert.equal(result.providers.cloudflare.approved,false);
 assert.deepEqual(result.providers.cloudflare.missing,['projects.build']);
});
test('missing server status and spoofed local positive status never enable the gate',()=>{
 for(const data of [null,undefined,{}, {ready:true}, {ready:false,providers:{github:{configured:true,connected:true,permissionsApproved:true},cloudflare:{configured:true,connected:true,permissionsApproved:true}}}]){
  assert.equal(summarizeGate(data).ready,false);
 }
});

test('verified Unified Wallet signs into Bubbles without fabricating provider permissions',async t=>{
 const payload={...partialGate(),ok:true,walletVerified:true};
 const summary=summarizeGate(payload);
 assert.equal(summary.walletVerified,true);
 assert.equal(summary.ready,false);
 assert.equal(summary.providers.cloudflare.connected,false);
 assert.equal(summary.providers.cloudflare.approved,false);
 assert.equal(summarizeGate({walletVerified:true}).walletVerified,false);
 const ui=mountedGate(t,payload);await new Promise(setImmediate);
 assert.equal(ui.get('bubblesSigninGate').hidden,true);
 assert.equal(ui.get('bubblesSigninGate').dataset.ready,'false');
 assert.match(ui.get('bubblesWalletIdentity').textContent,/Signed in to Bubbles with your Unified Wallet/);
 assert.equal(ui.calls.some(call=>call.path==='/start'),false);
});

test('main Bubbles gate resumes Android OAuth after same-window navigation',()=>{
 const source=readFileSync(new URL('../bubbles-signin-gate.mjs',import.meta.url),'utf8');
 assert.match(source,/client\.resumePending\(/);
 assert.match(source,/const summary=await refresh\(\)/);
 assert.match(source,/if\(resuming\)/);
 assert.match(source,/Finishing sign-in/);
});

function mountedGate(t,payload,{startFails=false,walletMissing=false,oauthReturn=null,oauthProvider='cloudflare',googleRecovery=false,cloudflareRecovery=false,chat=false,failOnSecondSession=false}={}){
 const ids=chat?['chatBubblesSigninGate','chatBubblesSigninStatus','chatBubblesGithubSignIn',
  'chatBubblesCloudflareSignIn','chatBubblesGithubStatus','chatBubblesCloudflareStatus',
  'chatBubblesGithubCard','chatBubblesCloudflareCard','chatBubblesRetrySignInCheck',
  'chatBubblesRecoverWallet','chatBubblesCancelSignIn','chatBubblesConnectionSummary']:
  ['bubblesSigninGate','bubblesSigninStatus','bubblesGithubSignIn','bubblesCloudflareSignIn',
   'bubblesGithubStatus','bubblesCloudflareStatus','bubblesGithubCard','bubblesCloudflareCard',
   'bubblesAICard','bubblesRetrySignInCheck','bubblesRecoverWallet','bubblesWalletIdentity','bubblesCancelSignIn','bubblesConnectionSummary'];
 const elements=new Map(ids.map(id=>[id,{dataset:{},hidden:false,disabled:false,textContent:'',
  listeners:{},addEventListener(event,callback){this.listeners[event]=callback;},scrollIntoView(){}}]));
 const root={getElementById:id=>elements.get(id)||null,addEventListener(){}};
 const popups=[],calls=[],storage=new Map();
 if(oauthReturn)storage.set('bubbles:oauth-return-note:v1',JSON.stringify({provider:oauthProvider,result:oauthReturn,at:Date.now()}));
 let recoveredGoogle=false,recoveredCloudflare=false,sessionReads=0;
 const host={document:root,QuantaCloudConnection:{resolveDeviceToken:async()=>walletMissing?'':'sq_'+'a'.repeat(40)},
  addEventListener(){},removeEventListener(){},setTimeout:()=>1,clearTimeout(){},
  sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  open(){const popup={location:{},close(){}};popups.push(popup);return popup;}};
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  const path=String(url).replace('/api/bubbles/connections','');
  const body=options.body?JSON.parse(options.body):null;calls.push({path,body});
  if(path==='/session'){
   sessionReads++;
   if(failOnSecondSession&&sessionReads===2)throw Error('temporary_offline');
   return Response.json({ok:true,walletVerified:payload?.walletVerified===true});
  }
  if(path==='/gate/status')return Response.json({ok:true,...payload});
  if(path==='/accounts')return Response.json({ok:true,accounts:googleRecovery&&recoveredGoogle?
   [{provider:'google',id:'verified-google-id',status:'connected',label:'Google account',expiresAt:Date.now()+3600000}]:
   cloudflareRecovery&&recoveredCloudflare?
   [{provider:'cloudflare',id:'verified-cloudflare-id',status:'connected',label:'Cloudflare account',expiresAt:Date.now()+3600000,grantedActions:['account.read']}]:
   payload?.accountRecords||[]});
  if(path==='/handoff/google/resume'&&googleRecovery){
   recoveredGoogle=true;
   return Response.json({ok:true,status:'connected',account:{id:'verified-google-id',provider:'google',label:'Google account'}});
  }
  if(path==='/handoff/cloudflare/resume'){
   if(!cloudflareRecovery)return Response.json({ok:true,status:'missing'});
   recoveredCloudflare=true;
   return Response.json({ok:true,status:'connected',account:{id:'verified-cloudflare-id',provider:'cloudflare',label:'Cloudflare account'}});
  }
  if(path==='/start'){
   if(startFails)return Response.json({ok:false,error:'provider_not_configured'},{status:503});
   const adapter=cloudflareAdapter({clientId:'bubbles-test-client',clientSecret:'server-only',
    redirectUri:'https://quantaphi.org/api/bubbles/connections/cloudflare/callback',
    allowedScopes:body.actions.includes('owner.full')?['user-details.read','memberships.read',...Array.from({length:384},(_,i)=>'preview-scope-'+i+'.read')].join(' '):'user-details.read memberships.read workers-scripts.admin d1.read d1.write page.write'});
   return Response.json({ok:true,authorizationUrl:adapter.authorization({state:'s'.repeat(43),challenge:'c'.repeat(43),actions:body.actions}),expiresIn:300});
  }
  if(path==='/handoff/status')return Response.json({ok:true,status:'pending'});
  assert.fail('Unexpected request '+path);
 };
 t.after(()=>{globalThis.fetch=original;});
 return {controller:mountBubblesSigninGate({root,host,prefix:chat?'chat':''}),get:root.getElementById,calls,popups};
}
const partialGate=()=>({ok:true,walletVerified:true,ready:false,providers:{
 github:{configured:true,connected:true,permissionsApproved:true},
 cloudflare:{configured:true,connected:false,permissionsApproved:false,scopeSetupRequired:true,
  authorizationActions:['account.read','projects.build','ledger.read']}
}});

test('inline chat mounts its real IDs and replaces pending controls with actionable sign-in',async t=>{
 const ui=mountedGate(t,partialGate(),{walletMissing:true,chat:true});
 assert.ok(ui.controller,'The real chat gate must mount');
 await new Promise(setImmediate);
 for(const id of ['chatBubblesGithubSignIn','chatBubblesCloudflareSignIn']){
  assert.equal(ui.get(id).disabled,false);
  assert.match(ui.get(id).textContent,/^Sign in with /);
 }
 assert.match(ui.get('chatBubblesSigninStatus').textContent,/Sign in with StarQuest/);
 assert.equal(ui.get('chatBubblesRecoverWallet').hidden,false);
 assert.equal(ui.get('chatBubblesCancelSignIn').hidden,true);
 await ui.get('chatBubblesCloudflareSignIn').listeners.click();
 assert.equal(ui.calls.some(c=>c.path==='/start'),false);
});

test('inline chat hides the sign-in gate after server wallet verification',async t=>{
 const ui=mountedGate(t,{...partialGate(),walletVerified:true},{chat:true});
 await new Promise(setImmediate);
 assert.equal(ui.get('chatBubblesSigninGate').hidden,true);
 assert.equal(ui.get('chatBubblesSigninGate').dataset.ready,'false','Wallet identity does not grant provider permissions');
});

test('missing extra project scopes does not disable normal Cloudflare sign-in',async t=>{
 const ui=mountedGate(t,partialGate());
 await new Promise(setImmediate);
 const button=ui.get('bubblesCloudflareSignIn');
 assert.equal(button.disabled,false);
 assert.equal(button.textContent,'Sign in with Cloudflare');
 assert.equal(ui.get('bubblesGithubCard').hidden,true);
 assert.equal(ui.get('bubblesCloudflareCard').hidden,false);
 assert.equal(ui.get('bubblesSigninGate').dataset.ready,'false');
 await button.listeners.click();
 assert.deepEqual(ui.calls.find(c=>c.path==='/start').body,{provider:'cloudflare',actions:['account.read']});
 const destination=new URL(ui.popups[0].location.href);
 assert.equal(destination.origin,'https://dash.cloudflare.com');
 assert.equal(destination.pathname,'/oauth2/auth');
 assert.equal(destination.searchParams.get('redirect_uri'),'https://quantaphi.org/api/bubbles/connections/cloudflare/callback');
 assert.equal(destination.searchParams.get('code_challenge_method'),'S256');
 assert.equal(destination.searchParams.get('scope'),'user-details.read memberships.read');
});
test('failed sign-in launch restores the button for another attempt',async t=>{
 const ui=mountedGate(t,partialGate(),{startFails:true});
 await new Promise(setImmediate);
 const button=ui.get('bubblesCloudflareSignIn');
 await button.listeners.click();
 assert.equal(button.disabled,false);
 assert.equal(ui.get('bubblesRetrySignInCheck').disabled,false);
 assert.match(ui.get('bubblesSigninStatus').textContent,/Try again/);
});
test('an abandoned provider sign-in can be cancelled and immediately retried',async t=>{
 const ui=mountedGate(t,partialGate());
 await new Promise(setImmediate);
 const button=ui.get('bubblesCloudflareSignIn'),cancel=ui.get('bubblesCancelSignIn');
 assert.equal(cancel.hidden,true);
 await button.listeners.click();
 assert.equal(button.disabled,true);
 assert.equal(cancel.hidden,false);
 cancel.listeners.click();
 assert.equal(button.disabled,false);
 assert.equal(cancel.hidden,true);
 await button.listeners.click();
 assert.equal(ui.calls.filter(c=>c.path==='/start').length,2);
 cancel.listeners.click();
});
test('already-connected Cloudflare hides login even when optional project scopes are missing',async t=>{
 const payload=partialGate();
 payload.providers.cloudflare.connected=true;
 payload.providers.cloudflare.missingActions=['projects.full'];
 const summary=summarizeGate(payload);
 assert.equal(summary.signedIn,true);
 assert.equal(summary.ready,false);
 assert.equal(summary.providers.cloudflare.approved,false);
 assert.deepEqual(summary.providers.cloudflare.missing,['projects.full']);
 const ui=mountedGate(t,payload);
 await new Promise(setImmediate);
 assert.equal(ui.get('bubblesSigninGate').hidden,true);
 assert.equal(ui.get('bubblesSigninGate').dataset.ready,'false');
 assert.equal(ui.get('bubblesCloudflareCard').hidden,true);
 assert.equal(ui.get('bubblesCloudflareSignIn').hidden,true);
 assert.match(ui.get('bubblesCloudflareStatus').textContent,/^Signed in/);
 assert.match(ui.get('bubblesConnectionSummary').textContent,/✅ Cloudflare signed in/);
 await ui.get('bubblesCloudflareSignIn').listeners.click();
 assert.equal(ui.calls.some(c=>c.path==='/start'),false);
});
test('full project permissions are still requested when registered by the server',()=>{
 const payload=partialGate();
 payload.providers.cloudflare.scopeSetupRequired=false;
 payload.providers.cloudflare.authorizationActions.push('projects.full','invented-action');
 assert.deepEqual(summarizeGate(payload).providers.cloudflare.authorizationActions,
  ['account.read','projects.build','ledger.read','projects.full']);
});

test('missing verified wallet never leaves a dead disabled Cloudflare button',async t=>{
 const ui=mountedGate(t,partialGate(),{walletMissing:true});
 await new Promise(setImmediate);
 const button=ui.get('bubblesCloudflareSignIn');
 assert.equal(button.disabled,false);
 assert.equal(ui.get('bubblesRecoverWallet').hidden,false);
 assert.match(ui.get('bubblesSigninStatus').textContent,/Sign in with StarQuest.*Unified Wallet/i);
 await button.listeners.click();
 assert.equal(button.disabled,false);
 assert.equal(ui.get('bubblesRecoverWallet').hidden,false);
 assert.equal(ui.calls.some(c=>c.path==='/start'),false,'Unverified wallet must never start OAuth or associate a token');
});

test('public Bubbles markup includes clickable Cloudflare action and wallet recovery',()=>{
 const html=readFileSync(new URL('../bubbles.html',import.meta.url),'utf8');
 assert.match(html,/<button id="bubblesCloudflareSignIn"[^>]*type="button"[^>]*>/);
 assert.doesNotMatch(html,/<button id="bubblesCloudflareSignIn"[^>]*disabled/);
 assert.match(html,/id="bubblesRecoverWallet"/);
});

test('a declined Cloudflare callback remains visible through wallet status refresh',async t=>{
 const ui=mountedGate(t,partialGate(),{oauthReturn:'declined'});
 await new Promise(setImmediate);
 assert.match(ui.get('bubblesSigninStatus').textContent,/authorization was declined/i);
 await ui.controller.refresh();
 assert.match(ui.get('bubblesSigninStatus').textContent,/authorization was declined/i);
 assert.equal(ui.get('bubblesCloudflareSignIn').disabled,false);
});
test('received callback with no completion receipt never claims the user is connected',async t=>{
 const ui=mountedGate(t,partialGate(),{oauthReturn:'received'});
 await new Promise(setImmediate);
 assert.match(ui.get('bubblesSigninStatus').textContent,/unverified|Waiting to verify/);
 assert.equal(ui.get('bubblesCloudflareCard').hidden,false);
 assert.equal(ui.get('bubblesSigninGate').dataset.ready,'false');
});

test('a verified Cloudflare identity keeps full 386-scope upgrade separate from sign-in',async t=>{
 const payload=partialGate();
 payload.providers.cloudflare.connected=true;
 payload.providers.cloudflare.authorizationActions=['account.read','owner.full'];
 const ui=mountedGate(t,payload);
 await new Promise(setImmediate);
 const button=ui.get('bubblesCloudflareSignIn');
 assert.equal(button.hidden,true);
 assert.match(ui.get('bubblesCloudflareStatus').textContent,/^Signed in/);
 await button.listeners.click();
 assert.equal(ui.calls.some(x=>x.path==='/start'),false);
});

test('Cloudflare initial sign-in opens the smallest registered account consent rather than 386-scope review',async t=>{
 const payload=partialGate();
 payload.providers.cloudflare.authorizationActions=['account.read','owner.full'];
 const ui=mountedGate(t,payload);
 await new Promise(setImmediate);
 const button=ui.get('bubblesCloudflareSignIn');
 assert.equal(button.textContent,'Sign in with Cloudflare');
 await button.listeners.click();
 assert.deepEqual(ui.calls.find(c=>c.path==='/start').body,{provider:'cloudflare',actions:['account.read']});
 const authorization=new URL(ui.popups[0].location.href);
 const scopes=authorization.searchParams.get('scope').split(' ');
 assert.equal(scopes.length,2);
 assert.deepEqual(scopes,['user-details.read','memberships.read']);
 assert.ok(scopes.includes('user-details.read'));
 assert.ok(scopes.includes('memberships.read'));
 assert.equal(authorization.origin,'https://dash.cloudflare.com');
});


test('Google check is green only when the wallet-bound server account is actively verified',()=>{
 const account={provider:'google',status:'connected',label:'Google person',expiresAt:Date.now()+3600000};
 const good=summarizeGate({...partialGate(),ok:true,walletVerified:true,accountsVerified:true,accountRecords:[account]});
 assert.equal(good.providers.google.connected,true);
 assert.equal(good.providers.google.label,'Google person');
 for(const invalid of [
  {...partialGate(),ok:true,walletVerified:false,accountsVerified:true,accountRecords:[account]},
  {...partialGate(),ok:true,walletVerified:true,accountsVerified:false,accountRecords:[account]},
  {...partialGate(),ok:true,walletVerified:true,accountsVerified:true,accountRecords:[{...account,expiresAt:Date.now()-1000}]},
  {...partialGate(),ok:true,walletVerified:true,accountsVerified:true,accountRecords:[{...account,status:'revoked'}]}
 ])assert.equal(summarizeGate(invalid).providers.google.connected,false);
});

for(const chat of [false,true])test((chat?'inline chat':'main Bubbles')+' shows all three verified checks without reopening login',async t=>{
 const payload={ok:true,walletVerified:true,ready:true,providers:{
  github:{configured:true,connected:true,permissionsApproved:true},
  cloudflare:{configured:true,connected:true,permissionsApproved:true}
 },accountRecords:[{provider:'google',status:'connected',expiresAt:Date.now()+3600000,label:'Google person'}]};
 const ui=mountedGate(t,payload,{chat});
 await new Promise(setImmediate);
 const label=ui.get(chat?'chatBubblesConnectionSummary':'bubblesConnectionSummary');
 assert.equal(label.hidden,false);
 for(const provider of ['Google','GitHub','Cloudflare'])assert.match(label.textContent,new RegExp('✅ '+provider+' signed in'));
 assert.equal(ui.get(chat?'chatBubblesSigninGate':'bubblesSigninGate').hidden,true);
 assert.equal(ui.calls.some(call=>call.path==='/start'),false);
});

test('a missing Google connection never gets a green verified indicator',async t=>{
 const ui=mountedGate(t,{...partialGate(),ok:true,walletVerified:true});
 await new Promise(setImmediate);
 assert.doesNotMatch(ui.get('bubblesConnectionSummary').textContent,/✅ Google signed in/);
 assert.match(ui.get('bubblesConnectionSummary').textContent,/Google not connected/);
});

test('chat owner verification must not bypass the connection status mount',()=>{
 const source=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 assert.doesNotMatch(source,/if\(syncOwnerIdentity\(\)\)return;/);
 assert.match(source,/chatBubblesConnectionSummary/);
});


test('Google callback received in a different Android tab resumes verified wallet handoff inside Bubbles',async t=>{
 const payload={...partialGate(),ok:true,walletVerified:true};
 const ui=mountedGate(t,payload,{oauthReturn:'received',oauthProvider:'google',googleRecovery:true});
 await new Promise(setImmediate);
 await new Promise(setImmediate);
 assert.ok(ui.calls.some(call=>call.path==='/handoff/google/resume'),
  'Bubbles must recover the encrypted Google return even when tab sessionStorage has no pending state');
 assert.equal(ui.calls.some(call=>call.path==='/start'),false,
  'Google must not demand another authorization after the server already received consent');
 assert.match(ui.get('bubblesConnectionSummary').textContent,/✅ Google signed in/);
 assert.match(ui.get('bubblesSigninStatus').textContent,/Google sign-in verified/);
 assert.equal(ui.get('bubblesCloudflareCard').hidden,false,'Google authorization does not grant Cloudflare permissions');
});


test('Bubbles chat and Account Connections share the current Google and Cloudflare connector code',()=>{
 const source=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
 const html=readFileSync(new URL('../bubbles.html',import.meta.url),'utf8');
 const accounts=readFileSync(new URL('../bubbles-accounts.html',import.meta.url),'utf8');
 const gate=readFileSync(new URL('../bubbles-signin-gate.mjs',import.meta.url),'utf8');
 const shared=readFileSync(new URL('../bubbles-connections-gate.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/bubbles-connections\.mjs\?v=20261026-full-consent6/,'Old October connector cannot be loaded in chat');
 for(const content of [source,accounts,shared])
  assert.match(content,/bubbles-connections\.mjs\?v=20261106-google-multi-cloudflare-full8/);
 for(const content of [source,html])
  assert.match(content,/bubbles-signin-gate\.mjs\?v=20261106-google-multi-cloudflare-full8/);
 assert.match(gate,/bubbles-connections-gate\.mjs\?v=20261106-google-multi-cloudflare-full8/);
 assert.match(html,/bubbles-ai\.js\?v=20261108-native-bubbles3/);
});

test('Cloudflare account list is authoritative for a verified wallet if the permission gate returns stale connection state',()=>{
 const live={provider:'cloudflare',id:'id-cloudflare',label:'Verified CF',status:'connected',expiresAt:Date.now()+3600000,grantedActions:['account.read']};
 const payload={...partialGate(),ok:true,walletVerified:true,accountsVerified:true,accountRecords:[live]};
 const result=summarizeGate(payload);
 assert.equal(result.providers.cloudflare.connected,true);
 assert.equal(result.providers.cloudflare.label,'Verified CF');
 assert.equal(result.providers.cloudflare.approved,false,'Account sign-in does not invent project grants');
 for(const invalid of [
  {...payload,walletVerified:false},
  {...payload,accountsVerified:false},
  {...payload,accountRecords:[{...live,status:'revoked'}]},
  {...payload,accountRecords:[{...live,expiresAt:Date.now()-1000}]}
 ])assert.equal(summarizeGate(invalid).providers.cloudflare.connected,false);
});

test('Cloudflare connected in wallet-bound accounts hides the obsolete Cloudflare sign-in button',async t=>{
 const payload={...partialGate(),ok:true,walletVerified:true,accountRecords:[
  {provider:'cloudflare',id:'cf-id',label:'Verified CF',status:'connected',expiresAt:Date.now()+3600000,grantedActions:['account.read']}
 ]};
 const ui=mountedGate(t,payload);
 await new Promise(setImmediate);
 assert.equal(ui.get('bubblesCloudflareSignIn').hidden,true);
 assert.match(ui.get('bubblesConnectionSummary').textContent,/Cloudflare signed in/);
 assert.equal(ui.calls.some(c=>c.path==='/start'),false,'No duplicate OAuth flow');
});

test('main Bubbles automatically recovers an existing Cloudflare consent without launching another OAuth flow',async t=>{
 const payload={...partialGate(),ok:true,walletVerified:true};
 const ui=mountedGate(t,payload,{cloudflareRecovery:true});
 await new Promise(setImmediate);
 await new Promise(setImmediate);
 assert.ok(ui.calls.some(call=>call.path==='/handoff/cloudflare/resume'),
  'Chat checks for a server-sealed Cloudflare authorization even with no callback hint');
 assert.equal(ui.calls.some(call=>call.path==='/start'),false,'No new Cloudflare login');
 assert.match(ui.get('bubblesConnectionSummary').textContent,/Cloudflare signed in/);
 assert.equal(ui.get('bubblesCloudflareSignIn').hidden,true);
});

test('Cloudflare received callback recovers verified account on Android without local pending state',async t=>{
 const payload={...partialGate(),ok:true,walletVerified:true};
 const ui=mountedGate(t,payload,{oauthReturn:'received',oauthProvider:'cloudflare',cloudflareRecovery:true});
 await new Promise(setImmediate);
 await new Promise(setImmediate);
 assert.ok(ui.calls.some(c=>c.path==='/handoff/cloudflare/resume'),
  'Server-bound recovery should work in chat for Cloudflare as for Google');
 assert.equal(ui.calls.some(c=>c.path==='/start'),false);
 assert.equal(ui.get('bubblesCloudflareCard').hidden,true);
 assert.match(ui.get('bubblesConnectionSummary').textContent,/Cloudflare signed in/);
});

test('transient status failure does not falsely sign out a previously verified Cloudflare account',async t=>{
 const payload={...partialGate(),ok:true,walletVerified:true};
 payload.providers.cloudflare={...payload.providers.cloudflare,connected:true,permissionsApproved:true};
 const ui=mountedGate(t,payload,{failOnSecondSession:true});
 await new Promise(setImmediate);
 assert.equal(ui.get('bubblesCloudflareSignIn').hidden,true);
 await ui.controller.refresh(); // one dropped account check
 assert.equal(ui.get('bubblesCloudflareSignIn').hidden,true,'network trouble is not proof of a disconnected Cloudflare account');
 assert.equal(ui.get('bubblesCloudflareCard').hidden,true);
 assert.match(ui.get('bubblesSigninStatus').textContent,/status.*unavailable|check.*failed|temporarily/i);
 assert.doesNotMatch(ui.get('bubblesConnectionSummary').textContent,/✅ Cloudflare signed in/,'do not present a stale check as a live green authorization');
 assert.equal(ui.calls.some(x=>x.path==='/start'),false,'do not restart OAuth on a failed status check');
 await ui.controller.refresh(); // healthy readback restores server-confirmed state
 assert.match(ui.get('bubblesConnectionSummary').textContent,/✅ Cloudflare signed in/);
});
