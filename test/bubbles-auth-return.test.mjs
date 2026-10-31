import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resumeAuthReturn} from '../bubbles-auth-return.mjs';

test('same-window provider return resumes the originating account page without secrets in its URL',()=>{
 for(const returnPath of ['/bubbles.html','/bubbles-accounts.html']){
  let destination;
  const pending={provider:'cloudflare',state:'s'.repeat(43),returnPath,expiresAt:Date.now()+60000};
  const host={sessionStorage:{getItem:()=>JSON.stringify(pending)},location:{replace:value=>destination=value}};
  assert.equal(resumeAuthReturn(host),true);
  assert.equal(destination,returnPath);
 }
});
test('expired, malformed and missing handoffs do not navigate; external destinations never survive',()=>{
 for(const pending of [null,{}, {provider:'cloudflare',state:'s'.repeat(43),expiresAt:Date.now()-1},
  {provider:'cloudflare',state:'s'.repeat(43),expiresAt:Date.now()+600000}]){
  assert.equal(resumeAuthReturn({sessionStorage:{getItem:()=>JSON.stringify(pending)},location:{replace:()=>assert.fail('must not navigate')}}),false);
 }
 let destination;
 assert.equal(resumeAuthReturn({sessionStorage:{getItem:()=>JSON.stringify({provider:'github',state:'s'.repeat(43),expiresAt:Date.now()+60000,returnPath:'https://evil.test'})},location:{replace:value=>destination=value}}),true);
 assert.equal(destination,'/bubbles.html');
});

test('provider failure callback stays visible instead of auto-resuming to an expired sign-in',()=>{
 const pending={provider:'cloudflare',state:'f'.repeat(43),returnPath:'/bubbles-accounts.html',expiresAt:Date.now()+60000,flow:'same-window'};
 const host={sessionStorage:{getItem:()=>JSON.stringify(pending)},location:{search:'?result=failed',replace:()=>assert.fail('Must keep the Cloudflare callback failure visible')}};
 assert.equal(resumeAuthReturn(host),false);
 host.location.search='?result=received';
 let returned=null;host.location.replace=path=>{returned=path;};
 assert.equal(resumeAuthReturn(host),true);
 assert.equal(returned,'/bubbles-accounts.html');
});

test('Cloudflare return stores only a bounded UI outcome and not an OAuth secret',()=>{
 const data=new Map();
 const pending={provider:'cloudflare',state:'q'.repeat(43),returnPath:'/bubbles.html',
  expiresAt:Date.now()+60000};
 data.set('bubbles:oauth-pending:v1',JSON.stringify(pending));
 let destination='';
 const host={sessionStorage:{
  getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},
  location:{pathname:'/api/bubbles/connections/cloudflare/callback',search:'?result=received',
   replace:path=>destination=path}};
 assert.equal(resumeAuthReturn(host),true);
 assert.equal(destination,'/bubbles.html');
 const receipt=JSON.parse(data.get('bubbles:oauth-return-note:v1'));
 assert.deepEqual(Object.keys(receipt).sort(),['at','provider','reason','result']);
 assert.equal(receipt.result,'received');
 assert.ok(!data.get('bubbles:oauth-return-note:v1').includes(pending.state));
 host.location.search='?result=declined';destination='';
 assert.equal(resumeAuthReturn(host),false);
 assert.equal(destination,'');
 assert.equal(JSON.parse(data.get('bubbles:oauth-return-note:v1')).result,'declined');
});
test('received callback with lost tab session stays visible with an explanation',()=>{
 let message='Authorization received securely.';
 const host={location:{search:'?result=received',pathname:'/api/bubbles/connections/cloudflare/callback',
  replace:()=>assert.fail('No automatic bounce without a matching tab session')},
  sessionStorage:{getItem:()=>null,setItem(){}},
  document:{querySelector:()=>({set textContent(value){message=value;}})}};
 assert.equal(resumeAuthReturn(host),false);
 assert.match(message,/no longer has the matching Bubbles sign-in session/);
});

test('failed callback reports only recognized error classes and never OAuth code or state',()=>{
 const store=new Map();
 const pending={provider:'cloudflare',state:'q'.repeat(43),returnPath:'/bubbles.html',expiresAt:Date.now()+60000};
 store.set('bubbles:oauth-pending:v1',JSON.stringify(pending));
 const host={location:{pathname:'/api/bubbles/connections/cloudflare/callback',
   search:'?result=failed&reason=callback_state_invalid&code=HIDDEN-CODE',
   replace:()=>assert.fail('failed callback must remain visible')},
  sessionStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}};
 assert.equal(resumeAuthReturn(host),false);
 const note=JSON.parse(store.get('bubbles:oauth-return-note:v1'));
 assert.equal(note.reason,'callback_state_invalid');
 assert.ok(!JSON.stringify(note).includes('HIDDEN-CODE'));
 assert.ok(!JSON.stringify(note).includes(pending.state));
 host.location.search='?result=failed&reason=leak-USER-ID';
 assert.equal(resumeAuthReturn(host),false);
 assert.equal(JSON.parse(store.get('bubbles:oauth-return-note:v1')).reason,null);
});
