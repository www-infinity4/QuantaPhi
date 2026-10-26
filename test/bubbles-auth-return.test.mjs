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
