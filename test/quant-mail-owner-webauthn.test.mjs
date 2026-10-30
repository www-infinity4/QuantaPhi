import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OwnerPasskeys,PASSKEY_CONSTANTS} from '../workers/bubbles-connections/owner-passkeys.mjs';
import {handleOwnerPasskeyRequest,passkeyCookie} from '../workers/bubbles-connections/passkey-router.mjs';
const now=1793310000000;
class Storage{
 constructor(){this.map=new Map();}
 async get(k){return this.map.get(k);}
 async put(k,v){this.map.set(k,structuredClone(v));}
 async delete(k){this.map.delete(k);}
 async transaction(fn){return fn(this);}
}
const walletSubject='verified-owner-subject-1';
const make=()=>new OwnerPasskeys(new Storage(),{clock:()=>now});
const json=async r=>({status:r.status,...await r.json()});
const request=(path,body,{origin='https://quantaphi.org',token=null}={})=>new Request('https://quantaphi.org/api/quant-mail/passkeys'+path,{
 method:body?'POST':'GET',
 headers:{...(body?{'Content-Type':'application/json','Origin':origin}:{'Sec-Fetch-Site':'same-origin'}),
 ...(token?{Authorization:token.startsWith('Bearer ')?token:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})
});
const stub={
 passkeyRegisterBegin:async()=>({attemptId:'begin',publicKey:{challenge:'secret'}}),
 passkeyRegisterFinish:async()=>({passkeyVerified:true,registrationStored:true,alias:'kris@quantaphi.org',rpId:'quantaphi.org'}),
 passkeyLoginBegin:async()=>({attemptId:'login',publicKey:{challenge:'challenge'}}),
 passkeyLoginFinish:async()=>({sessionToken:'test_raw_token',passkeyVerified:true,sessionEstablished:true,alias:'kris@quantaphi.org',rpId:'quantaphi.org'}),
 passkeyValidateSession:async()=>({valid:false})
};
const service={get:()=>stub,idFromName:x=>x};
const env={PASSKEY_ENABLED:'true',CONNECTIONS:service,BOT_WALLET:{fetch:async()=>Response.json({ok:true,ownerVerified:true})}};
const ownerAuth=async()=>({userId:walletSubject});
test('passkey challenge uses exact website RP and verified local user presence',async()=>{
 const p=make();
 const b=await p.beginRegistration({subject:walletSubject,alias:'kris@quantaphi.org'});
 assert.equal(PASSKEY_CONSTANTS.RP_ID,'quantaphi.org');
 assert.equal(PASSKEY_CONSTANTS.ORIGIN,'https://quantaphi.org');
 assert.equal(b.publicKey.rp.id,'quantaphi.org');
 assert.equal(b.publicKey.authenticatorSelection.userVerification,'required');
 assert.ok(typeof b.publicKey.challenge==='string');
 assert.equal(b.attemptId.length,43);
 const saved=await p.storage.get('quant-mail:challenge:'+b.attemptId);
 assert.equal(saved.subject,walletSubject);
 assert.equal(saved.purpose,'register');
});
test('registration rejects mismatched subject, invalid alias and unverified attestation',async()=>{
 const p=make();
 await assert.rejects(p.beginRegistration({subject:'',alias:'kris@quantaphi.org'}),/verified_owner_required/);
 await assert.rejects(p.beginRegistration({subject:walletSubject,alias:'hacker@quantaphi.org'}),/owner_alias_invalid/);
 const b=await p.beginRegistration({subject:walletSubject,alias:'administrator@quantaphi.org'});
 await assert.rejects(p.finishRegistration({subject:walletSubject+'x',alias:'administrator@quantaphi.org',attemptId:b.attemptId,credential:{type:'public-key',id:'fakecredential1',response:{}}}),/challenge_invalid/);
 const old=await p.storage.get('quant-mail:challenge:'+b.attemptId);
 assert.equal(old.subject,walletSubject); // unauthorized attempt cannot consume a valid challenge
 await assert.rejects(p.finishRegistration({subject:walletSubject,alias:'administrator@quantaphi.org',attemptId:b.attemptId,credential:{type:'public-key',id:'fakecredential1',response:{}}}));
 assert.equal(await p.storage.get('quant-mail:challenge:'+b.attemptId),undefined);
 await assert.rejects(p.finishRegistration({subject:walletSubject,alias:'administrator@quantaphi.org',attemptId:b.attemptId,credential:{type:'public-key',id:'fakecredential1',response:{}}}),/challenge_invalid/);
});
test('login requires real registered passkey and a fresh credential challenge',async()=>{
 const p=make(),b=await p.beginAuthentication({alias:'kris@quantaphi.org'});
 assert.equal(b.publicKey.rpId,'quantaphi.org');
 assert.equal(b.publicKey.userVerification,'required');
 assert.equal(b.attemptId.length,43);
 await assert.rejects(p.finishAuthentication({alias:'kris@quantaphi.org',attemptId:b.attemptId,credential:{type:'public-key',id:'unregisteredcredential',response:{}}}),/passkey_unrecognized/);
 assert.equal(await p.storage.get('quant-mail:challenge:'+b.attemptId),undefined);
});
test('public status must fail closed until explicitly enabled',async()=>{
 const no={PASSKEY_ENABLED:'false',CONNECTIONS:service,BOT_WALLET:env.BOT_WALLET};
 const r=await json(await handleOwnerPasskeyRequest(request('/status'),no,ownerAuth));
 assert.equal(r.enabled,false);
 assert.equal(r.registrationReady,false);
 const b=await json(await handleOwnerPasskeyRequest(request('/register/begin',{alias:'kris@quantaphi.org'},{token:'Bearer sq_'+ 'A'.repeat(32)}),no,ownerAuth));
 assert.equal(b.status,503);
});
test('owner wallet and same-origin post are mandatory for passkey registration',async()=>{
 const body={alias:'kris@quantaphi.org'};
 const wrong=await json(await handleOwnerPasskeyRequest(request('/register/begin',body,{origin:'https://evil.test'}),env,ownerAuth));
 assert.equal(wrong.status,403);
 const notOwner=await json(await handleOwnerPasskeyRequest(request('/register/begin',body),{
  ...env,BOT_WALLET:{fetch:async()=>Response.json({ok:true,ownerVerified:false})}},ownerAuth));
 assert.equal(notOwner.status,403);
 const valid=await json(await handleOwnerPasskeyRequest(request('/register/begin',body),env,ownerAuth));
 assert.equal(valid.ok,true);
 assert.equal(valid.attemptId,'begin');
});
test('owner signup rejects linked device pairing token in lieu of original wallet',async()=>{
 const r=await json(await handleOwnerPasskeyRequest(request('/register/begin',{alias:'kris@quantaphi.org'},{
 token:'Bearer bc_'+'A'.repeat(32)}),env,ownerAuth));
 assert.equal(r.status,401);
});
test('successful verified login sets HttpOnly Secure SameSite Strict cookie, never JS session token',async()=>{
 const res=await handleOwnerPasskeyRequest(request('/login/finish',{
 alias:'kris@quantaphi.org',attemptId:'attempt',credential:{id:'credential',type:'public-key',response:{}}}),env,ownerAuth);
 const body=await res.json();
 assert.equal(body.sessionEstablished,true);
 assert.equal(body.sessionToken,undefined);
 assert.match(res.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
 assert.match(passkeyCookie('abc'),/Secure/);
});
test('public Quant Mail is private placeholder; WebAuthn client keeps server readiness gate',()=>{
 const html=readFileSync(new URL('../quant-mail.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../quant-mail-passkeys.mjs',import.meta.url),'utf8');
 assert.match(html,/Private account enrollment is not available from this public page/);
 assert.doesNotMatch(html,/kris@quantaphi\.org|administrator@quantaphi\.org|Create phone passkey/i);
 assert.match(js,/result\.enabled===true/);
 assert.match(js,/result\.registrationReady===true/);
 assert.match(js,/result\.loginReady===true/);
 assert.match(js,/navigator\?\.credentials/);
 assert.doesNotMatch(html,/type="password"/);
});

test('per-IP begin auth attempt limit and administrator session expiry window are enforced',async()=>{
 const passkeys=make();
 for(let i=0;i<12;i++)await passkeys.beginAuthentication({alias:'kris@quantaphi.org',fingerprint:'example-ip-hash'});
 await assert.rejects(passkeys.beginAuthentication({alias:'kris@quantaphi.org',fingerprint:'example-ip-hash'}),/passkey_rate_limited/);
 const next=await passkeys.beginAuthentication({alias:'kris@quantaphi.org',fingerprint:'different-ip-hash'});
 assert.ok(next.attemptId);
 assert.equal(PASSKEY_CONSTANTS.ADMIN_SESSION_TTL,5*60*1000);
 assert.match(passkeyCookie('abc',true),/Max-Age=300/);
 assert.match(passkeyCookie('abc',false),/Max-Age=43200/);
});

test('administrator alias cannot elevate without independent wallet RBAC proof',async()=>{
 const body={alias:'administrator@quantaphi.org',attemptId:'attempt',credential:{id:'credential',type:'public-key',response:{}},adminAuthorized:true};
 const withoutWallet=await json(await handleOwnerPasskeyRequest(request('/login/finish',body),env,ownerAuth));
 assert.equal(withoutWallet.status,403);
 assert.equal(withoutWallet.error,'admin_role_verification_required');
 const token='Bearer sq_'+'A'.repeat(32);
 const ownerOnly={...env,BOT_WALLET:{fetch:async()=>Response.json({ok:true,ownerVerified:true,userId:walletSubject})}};
 const denied=await json(await handleOwnerPasskeyRequest(request('/login/finish',body,{token}),ownerOnly,ownerAuth));
 assert.equal(denied.status,403);
 assert.equal(denied.error,'admin_role_verification_required');
});
test('administrator session requires server-verified matching subject and role, not a client flag',async()=>{
 const token='Bearer sq_'+'A'.repeat(32);
 let passedRole=null;
 const serviceWithRole={...stub,passkeyLoginFinish:async args=>{
  passedRole=args.adminAuthorized;
  return {...await stub.passkeyLoginFinish(args),alias:'administrator@quantaphi.org'};
 }};
 const approved={...env,CONNECTIONS:{idFromName:x=>x,get:()=>serviceWithRole},
  BOT_WALLET:{fetch:async()=>Response.json({ok:true,ownerVerified:true,adminVerified:true,userId:walletSubject})}};
 const response=await handleOwnerPasskeyRequest(request('/login/finish',{
  alias:'administrator@quantaphi.org',attemptId:'attempt',credential:{id:'credential',type:'public-key',response:{}}
 },{token}),approved,ownerAuth);
 assert.equal(response.status,200);
 assert.equal(passedRole,true);
 assert.match(response.headers.get('set-cookie'),/Max-Age=300/);
 const wrongSubject={...approved,BOT_WALLET:{fetch:async()=>Response.json({
  ok:true,ownerVerified:true,adminVerified:true,userId:'different-subject'})}};
 const denied=await json(await handleOwnerPasskeyRequest(request('/login/finish',{
  alias:'administrator@quantaphi.org',attemptId:'attempt',credential:{id:'credential',type:'public-key',response:{}}
 },{token}),wrongSubject,ownerAuth));
 assert.equal(denied.status,403);
});
test('direct Durable Object administrator authentication fails closed without trusted role',async()=>{
 const p=make(),b=await p.beginAuthentication({alias:'administrator@quantaphi.org'});
 await assert.rejects(p.finishAuthentication({alias:'administrator@quantaphi.org',attemptId:b.attemptId,
  credential:{id:'unregisteredcredential',type:'public-key',response:{}}}),/admin_role_verification_required/);
 assert.ok(await p.storage.get('quant-mail:challenge:'+b.attemptId));
});

test('one passkey slot per verified owner email; each address has a distinct account credential',async()=>{
 const p=make();
 const first=await p.beginRegistration({subject:walletSubject,alias:'kris@quantaphi.org'});
 const second=await p.beginRegistration({subject:walletSubject,alias:'administrator@quantaphi.org'});
 assert.notEqual(Buffer.from(first.publicKey.user.id).toString('hex'),Buffer.from(second.publicKey.user.id).toString('hex'));
 assert.equal(first.publicKey.user.name,'kris@quantaphi.org');
 assert.equal(second.publicKey.user.name,'administrator@quantaphi.org');
 const current=await p.load();
 current.subject=walletSubject;
 current.credentials=[
  {id:'Y3JlZDE',alias:'kris@quantaphi.org',publicKey:'YQ',counter:0,transports:[]},
  {id:'Y3JlZDI',alias:'administrator@quantaphi.org',publicKey:'YQ',counter:0,transports:[]}
 ];
 await p.storage.put('quant-mail:owner-passkeys',current);
 await assert.rejects(p.beginRegistration({subject:walletSubject,alias:'kris@quantaphi.org'}),/alias_passkey_already_registered/);
 await assert.rejects(p.beginRegistration({subject:walletSubject,alias:'administrator@quantaphi.org'}),/alias_passkey_already_registered/);
 const one=await p.beginAuthentication({alias:'kris@quantaphi.org',fingerprint:'firstIP'});
 const two=await p.beginAuthentication({alias:'administrator@quantaphi.org',fingerprint:'secondIP'});
 assert.deepEqual(one.publicKey.allowCredentials.map(c=>c.id),['Y3JlZDE']);
 assert.deepEqual(two.publicKey.allowCredentials.map(c=>c.id),['Y3JlZDI']);
 await assert.rejects(p.finishAuthentication({alias:'kris@quantaphi.org',attemptId:one.attemptId,
  credential:{type:'public-key',id:'Y3JlZDI',response:{}}}),/passkey_unrecognized/);
});
test('private Android passkey form never preselects owner email and public client accepts typed email',()=>{
 const client=readFileSync(new URL('../quant-mail-passkeys.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(client,/OWNER_MAIL_ALIASES|kris@quantaphi\.org|administrator@quantaphi\.org/);
 assert.match(client,/aliasInput.value=''/);
 assert.match(client,/alias_passkey_already_registered/);
});
