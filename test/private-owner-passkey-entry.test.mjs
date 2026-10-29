import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Robot Brain Notes offers no public signup: private owner security stays hidden',()=>{
 const bubbles=source('bubbles-ai.js');
 assert.match(bubbles,/const ownerSecurityLink=create\('a'/);
 assert.match(bubbles,/ownerSecurityLink\.hidden=true/);
 assert.match(bubbles,/tools\.append\(ownerSecurityLink\)/);
 assert.match(bubbles,/QuantaBrainOwner/);
 assert.match(bubbles,/gate\.walletIdentity\(\)/);
 assert.match(bubbles,/result\?\.state!=='verified'\|\|!tools\.open/);
 assert.match(bubbles,/if\(embedded\|\|ownerSecurityChecking\)return/);
 assert.match(bubbles,/ownerSecurityLink\.hidden=true;\n await checkOwnerSecurityAccess\(\)/);
 assert.doesNotMatch(bubbles,/href="\/quant-mail\.html"/);
});
test('private owner page hides security panel until the owner wallet is reverified',()=>{
 const html=source('continuity/owner/index.html');
 const code=source('continuity/owner/passkeys.mjs');
 assert.match(html,/id="app" class="hide"/);
 assert.match(html,/id="account-security" hidden/);
 assert.match(html,/passkeys\.mjs/);
 assert.doesNotMatch(html,/kris@quantaphi\.org|administrator@quantaphi\.org/);
 const ready=code.indexOf('const headers=await gate.ready');
 const wallet=code.indexOf('const verified=await gate.walletIdentity()');
 const reveal=code.indexOf('region.hidden=false');
 const request=code.indexOf("fetch('/api/quant-mail/passkeys/status'");
 assert.ok(ready>=0&&wallet>ready&&reveal>wallet&&request>reveal);
 assert.match(code,/verified\?\.state!=='verified'/);
 assert.match(code,/state\.enabled!==true/);
 assert.match(code,/state\.registrationReady!==true/);
 assert.match(code,/state\.loginReady!==true/);
 assert.match(code,/import\('\/quant-mail-passkeys\.mjs/);
 assert.match(code,/register\.disabled=true;login\.disabled=true/);
 assert.doesNotMatch(code,/localStorage|sessionStorage|passkey-owner\?token|owner=true/);
});
test('public pages and no-op shortcut do not reveal owner aliases or signup links',()=>{
 for(const path of ['quant-mail.html','bubbles.html','bubbles/index.html','bubbles-chrome.html','index.html','bubbles-accounts.html']){
  const html=source(path);
  assert.doesNotMatch(html,/kris@quantaphi\.org|administrator@quantaphi\.org/i);
  assert.doesNotMatch(html,/bubbles-quant-mail-preview\.js/);
  assert.doesNotMatch(html,/href="\/quant-mail\.html"/);
 }
 assert.doesNotMatch(source('bubbles-quant-mail-preview.js'),/document\.querySelector|MutationObserver|\.append\(/);
});
