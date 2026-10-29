import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Quant Mail status clearly states that account and passkeys do not work yet',()=>{
 const html=source('quant-mail.html');
 assert.match(html,/kris@quantaphi\.org/);
 assert.match(html,/administrator@quantaphi\.org/);
 assert.match(html,/not active/);
 assert.match(html,/no active mailbox or phone passkey enrollment yet/);
 assert.match(html,/preview intentionally has no registration button/);
 assert.doesNotMatch(html,/type="password"/);
 assert.doesNotMatch(html,/passkeyVerified/);
 assert.doesNotMatch(html,/createCredential/);
});
test('Bubbles website and embedded chat load the same safe status link',()=>{
 for(const path of ['bubbles.html','bubbles/index.html','bubbles-chrome.html','index.html']){
  const page=source(path);
  assert.match(page,/bubbles-ai\.js\?v=20261029-chat-signin1/);
  assert.match(page,/bubbles-quant-mail-preview\.js\?v=20261029-preview1/);
 }
 assert.match(source('bubbles-accounts.html'),/quant-mail\.html/);
 const ui=source('bubbles-quant-mail-preview.js');
 assert.match(ui,/\.ba-panel \.ba-header/);
 assert.match(ui,/\.ba-panel \.ba-tools/);
 assert.match(ui,/href='\/quant-mail\.html'/);
 assert.match(ui,/rel='noopener'/);
 assert.doesNotMatch(ui,/\.fetch\(|localStorage|sessionStorage|postMessage|Authorization/);
});
