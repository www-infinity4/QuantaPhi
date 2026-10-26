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
