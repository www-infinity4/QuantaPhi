import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const publicPages=['quant-mail.html','bubbles.html','bubbles/index.html','bubbles-chrome.html','index.html','bubbles-accounts.html'];
test('public page no longer advertises specific owner addresses or passkey enrollment',()=>{
 const html=source('quant-mail.html');
 assert.match(html,/noindex,nofollow,noarchive,nosnippet/);
 assert.match(html,/Private account enrollment is not available from this public page/);
 assert.doesNotMatch(html,/@quantaphi\.org/i);
 assert.doesNotMatch(html,/administrator@|kris@|Requested owner addresses|Create phone passkey/i);
 assert.doesNotMatch(html,/type="password"|navigator\.credentials|PublicKeyCredential/);
});
test('public Bubbles homepage, chat, Chrome app and account connections hide personal setup',()=>{
 for(const path of publicPages){
  const code=source(path);
  assert.doesNotMatch(code,/administrator@quantaphi\.org|kris@quantaphi\.org/i,path);
  assert.doesNotMatch(code,/bubbles-quant-mail-preview\.js/i,path);
  if(path!=='quant-mail.html')assert.doesNotMatch(code,/href="\/quant-mail\.html"|Owner email and passkey setup status/i,path);
 }
});
test('cached public chat shortcut script cannot announce or inject owner setup links',()=>{
 const code=source('bubbles-quant-mail-preview.js');
 assert.doesNotMatch(code,/MutationObserver|document\.querySelector|appendChild|href\s*=|location\.assign/i);
 assert.doesNotMatch(code,/administrator@|kris@|owner address|Owner email|Create phone passkey/i);
});
