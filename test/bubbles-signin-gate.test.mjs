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

test('main Bubbles gate resumes Android OAuth after same-window navigation',()=>{
 const source=readFileSync(new URL('../bubbles-signin-gate.mjs',import.meta.url),'utf8');
 assert.match(source,/client\.resumePending\(/);
 assert.match(source,/const summary=await refresh\(\)/);
 assert.match(source,/if\(resuming\)/);
 assert.match(source,/Finishing sign-in/);
});

function mountedGate(t,payload,{startFails=false,walletMissing=false,oauthReturn=null}={}){
 const elements=new Map();
 const root={getElementById(id){
  if(!elements.has(id))elements.set(id,{dataset:{},hidden:false,disabled:false,textContent:'',
   listeners:{},addEventListener(event,callback){this.listeners[event]=callback;},scrollIntoView(){}});
  return elements.get(id);
 },addEventListener(){}};
 const popups=[],calls=[],storage=new Map();
 if(oauthReturn)storage.set('bubbles:oauth-return-note:v1',JSON.stringify({provider:'cloudflare',result:oauthReturn,at:Date.now()}));
 const host={document:root,QuantaCloudConnection:{resolveDeviceToken:async()=>walletMissing?'':'sq_'+'a'.repeat(40)},
  addEventListener(){},removeEventListener(){},setTimeout:()=>1,clearTimeout(){},
  sessionStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  open(){const popup={location:{},close(){}};popups.push(popup);return popup;}};
 const original=globalThis.fetch;
 globalThis.fetch=async(url,options)=>{
  const path=String(url).replace('/api/bubbles/connections','');
  const body=options.body?JSON.parse(options.body):null;calls.push({path,body});
  if(path==='/gate/status')return Response.json({ok:true,...payload});
  if(path==='/start'){
   if(startFails)return Response.json({ok:false,error:'provider_not_configured'},{status:503});
   const adapter=cloudflareAdapter({clientId:'bubbles-test-client',clientSecret:'server-only',
    redirectUri:'https://quantaphi.org/api/bubbles/connections/cloudflare/callback',
    allowedScopes:'user-details.read memberships.read workers-scripts.admin d1.read d1.write page.write'});
   return Response.json({ok:true,authorizationUrl:adapter.authorization({state:'s'.repeat(43),challenge:'c'.repeat(43),actions:body.actions}),expiresIn:300});
  }
  if(path==='/handoff/status')return Response.json({ok:true,status:'pending'});
  assert.fail('Unexpected request '+path);
 };
 t.after(()=>{globalThis.fetch=original;});
 return {controller:mountBubblesSigninGate({root,host}),get:root.getElementById,calls,popups};
}
const partialGate=()=>({ready:false,providers:{
 github:{configured:true,connected:true,permissionsApproved:true},
 cloudflare:{configured:true,connected:false,permissionsApproved:false,scopeSetupRequired:true,
  authorizationActions:['account.read','projects.build','ledger.read']}
}});

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
 assert.deepEqual(ui.calls.find(c=>c.path==='/start').body,{provider:'cloudflare',actions:['account.read','projects.build','ledger.read']});
 const destination=new URL(ui.popups[0].location.href);
 assert.equal(destination.origin,'https://dash.cloudflare.com');
 assert.equal(destination.pathname,'/oauth2/auth');
 assert.equal(destination.searchParams.get('redirect_uri'),'https://quantaphi.org/api/bubbles/connections/cloudflare/callback');
 assert.equal(destination.searchParams.get('code_challenge_method'),'S256');
 assert.equal(destination.searchParams.get('scope'),'user-details.read memberships.read workers-scripts.admin d1.write page.write d1.read');
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
test('previously limited Cloudflare connection offers reauthorization instead of hiding the button',async t=>{
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
 assert.equal(ui.get('bubblesSigninGate').hidden,false);
 assert.equal(ui.get('bubblesSigninGate').dataset.ready,'false');
 assert.equal(ui.get('bubblesCloudflareCard').hidden,false);
 assert.equal(ui.get('bubblesCloudflareSignIn').disabled,false);
 assert.equal(ui.get('bubblesCloudflareSignIn').textContent,'Review Cloudflare permissions');
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
 assert.match(ui.get('bubblesSigninStatus').textContent,/verified Bubbles wallet/i);
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
 assert.match(ui.get('bubblesSigninStatus').textContent,/Waiting to verify/);
 assert.equal(ui.get('bubblesCloudflareCard').hidden,false);
 assert.equal(ui.get('bubblesSigninGate').dataset.ready,'false');
});
