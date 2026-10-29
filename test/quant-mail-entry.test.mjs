import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mailNamePreview,verifyQuantMailWallet,MAIL_DOMAIN,RESERVED_MAIL_NAMES} from '../quant-mail.mjs';
const load=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const wallet='sq_'+'A'.repeat(32);
test('only valid names can be previewed; ownership never inferred',()=>{
 assert.equal(MAIL_DOMAIN,'quantaphi.org');
 assert.equal(mailNamePreview('alice').address,'alice@quantaphi.org');
 assert.equal(mailNamePreview('ALICE').address,'alice@quantaphi.org');
 for(const name of ['kris','admin','support','postmaster','wallet','bubbles']){
  assert.equal(RESERVED_MAIL_NAMES.has(name),true);
  assert.equal(mailNamePreview(name).valid,false);
 }
 for(const value of ['a','1name','name@evil.net','abc..def','abc.','ab/hi','xx ']){
  if(value==='xx ')continue;
  assert.equal(mailNamePreview(value).valid,false,'rejected '+value);
 }
 assert.match(mailNamePreview('alice').reason,/preview only/i);
});
test('verified wallet is not represented as active email',async()=>{
 const result=await verifyQuantMailWallet({tokenProvider:async()=>wallet,
  request:async(url,options)=>{assert.equal(url,'/api/bubbles/connections/session');
   assert.equal(options.method,'GET');assert.equal(options.cache,'no-store');
   assert.equal(options.headers.Authorization,'Bearer '+wallet);
   return {ok:true,json:async()=>({ok:true,walletVerified:true})};}
 });
 assert.equal(result.verified,true);
 assert.match(result.reason,/mailbox activation is still pending/i);
});
test('missing wallet, provider failure and invalid session all fail closed',async()=>{
 let calls=0;
 const bad=await verifyQuantMailWallet({tokenProvider:async()=>{throw Error('absent');},request:async()=>{calls++;}});
 assert.equal(bad.verified,false);
 const invalid=await verifyQuantMailWallet({tokenProvider:async()=>wallet,
 request:async()=>{calls++;return {ok:true,json:async()=>({ok:true,walletVerified:false})};}});
 assert.equal(invalid.verified,false);
 assert.equal(calls,1);
 const serverDown=await verifyQuantMailWallet({tokenProvider:async()=>wallet,request:async()=>{throw Error('offline');}});
 assert.equal(serverDown.verified,false);
});
test('every Bubbles app shell exposes chat mail entry without replacing the composer',()=>{
 for(const path of ['bubbles.html','bubbles/index.html','bubbles-chrome.html','index.html']){
  const page=load(path);
  assert.match(page,/bubbles-quant-mail-shortcut\.js\?v=20261029-owner-entry1/);
  assert.match(page,/bubbles-ai\.js/);
 }
 const script=load('bubbles-quant-mail-shortcut.js');
 assert.match(script,/\.ba-panel \.ba-header/);
 assert.match(script,/\.ba-panel \.ba-tools/);
 assert.match(script,/quant-mail\.html/);
 assert.match(script,/rel='noopener'/);
 assert.match(load('bubbles-accounts.html'),/Quant Mail · Email sign-in/);
});
test('public mail page does not promise a working account or capture an email password',()=>{
 const html=load('quant-mail.html');
 assert.match(html,/kris@quantaphi\.org/);
 assert.match(html,/not an active mailbox/);
 assert.match(html,/not yet configured|not configured yet/i);
 assert.match(html,/wallet-recovery\.html\?signin=starquest/);
 assert.doesNotMatch(html,/type="password"/);
 assert.doesNotMatch(html,/mailbox created successfully/i);
});
