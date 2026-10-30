import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {OwnerPasskeys,PASSKEY_CONSTANTS} from '../workers/bubbles-connections/owner-passkeys.mjs';
import {handleOwnerPasskeyRequest,passkeyCookie,authorizedOwnerWallet} from '../workers/bubbles-connections/passkey-router.mjs';
import {handleConnections} from '../workers/bubbles-connections/router.mjs';
import {runPasskeyCeremony,passkeyServerRequest} from '../quant-mail-passkeys.mjs';
const now=1793310000000;
class Storage{
 constructor(){this.map=new Map();}
 async get(k){return this.map.get(k);}
 async put(k,v){this.map.set(k,structuredClone(v));}
 async delete(k){this.map.delete(k);}
 async transaction(fn){return fn(this);}
}
const walletSubject='verified-owner-subject-1';
const privateAliases=JSON.stringify({owner:'owner.test@quantaphi.org',administrator:'admin.test@quantaphi.org'});
const make=()=>new OwnerPasskeys(new Storage(),{clock:()=>now,allowedAliases:privateAliases});
const json=async r=>({status:r.status,...await r.json()});
const request=(path,body,{origin='https://quantaphi.org',token=null}={})=>new Request('https://quantaphi.org/api/quant-mail/passkeys'+path,{
 method:body?'POST':'GET',
 headers:{...(body?{'Content-Type':'application/json','Origin':origin}:{'Sec-Fetch-Site':'same-origin'}),
 ...(token?{Authorization:token.startsWith('Bearer ')?token:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})
});
const stub={
 passkeyRegisterBegin:async()=>({attemptId:'begin',publicKey:{challenge:'secret'}}),
 passkeyRegisterFinish:async()=>({passkeyVerified:true,registrationStored:true,alias:'owner.test@quantaphi.org',rpId:'quantaphi.org'}),
 passkeyLoginBegin:async()=>({attemptId:'login',publicKey:{challenge:'challenge'}}),
 passkeyLoginFinish:async()=>({sessionToken:'test_raw_token',passkeyVerified:true,sessionEstablished:true,alias:'owner.test@quantaphi.org',rpId:'quantaphi.org'}),
 passkeyValidateSession:async()=>({valid:false})
};
const service={get:()=>stub,idFromName:x=>x};
const env={PASSKEY_ENABLED:'true',OWNER_EMAIL_ALIAS_REGISTRY:privateAliases,PASSKEY_OWNER_ACCOUNT_ID:walletSubject,CONNECTIONS:service,BOT_WALLET:{fetch:async()=>Response.json({ok:true,ownerVerified:true})}};
const ownerAuth=async()=>({userId:walletSubject});
test('passkey challenge uses exact website RP and verified local user presence',async()=>{
 const p=make();
 const b=await p.beginRegistration({subject:walletSubject,alias:'owner.test@quantaphi.org'});
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
 await assert.rejects(p.beginRegistration({subject:'',alias:'owner.test@quantaphi.org'}),/verified_owner_required/);
 await assert.rejects(p.beginRegistration({subject:walletSubject,alias:'hacker@quantaphi.org'}),/owner_alias_invalid/);
 const b=await p.beginRegistration({subject:walletSubject,alias:'admin.test@quantaphi.org'});
 await assert.rejects(p.finishRegistration({subject:walletSubject+'x',alias:'admin.test@quantaphi.org',attemptId:b.attemptId,credential:{type:'public-key',id:'fakecredential1',response:{}}}),/challenge_invalid/);
 const old=await p.storage.get('quant-mail:challenge:'+b.attemptId);
 assert.equal(old.subject,walletSubject); // unauthorized attempt cannot consume a valid challenge
 await assert.rejects(p.finishRegistration({subject:walletSubject,alias:'admin.test@quantaphi.org',attemptId:b.attemptId,credential:{type:'public-key',id:'fakecredential1',response:{}}}));
 assert.equal(await p.storage.get('quant-mail:challenge:'+b.attemptId),undefined);
 await assert.rejects(p.finishRegistration({subject:walletSubject,alias:'admin.test@quantaphi.org',attemptId:b.attemptId,credential:{type:'public-key',id:'fakecredential1',response:{}}}),/challenge_invalid/);
});
test('login requires real registered passkey and a fresh credential challenge',async()=>{
 const p=make(),b=await p.beginAuthentication({alias:'owner.test@quantaphi.org'});
 assert.equal(b.publicKey.rpId,'quantaphi.org');
 assert.equal(b.publicKey.userVerification,'required');
 assert.equal(b.attemptId.length,43);
 await assert.rejects(p.finishAuthentication({alias:'owner.test@quantaphi.org',attemptId:b.attemptId,credential:{type:'public-key',id:'unregisteredcredential',response:{}}}),/passkey_unrecognized/);
 assert.equal(await p.storage.get('quant-mail:challenge:'+b.attemptId),undefined);
});
test('public status must fail closed until explicitly enabled',async()=>{
 const no={PASSKEY_ENABLED:'false',CONNECTIONS:service,BOT_WALLET:env.BOT_WALLET};
 const r=await json(await handleOwnerPasskeyRequest(request('/status'),no,ownerAuth));
 assert.equal(r.enabled,false);
 assert.equal(r.registrationReady,false);
 const b=await json(await handleOwnerPasskeyRequest(request('/register/begin',{alias:'owner.test@quantaphi.org'},{token:'Bearer sq_'+ 'A'.repeat(32)}),no,ownerAuth));
 assert.equal(b.status,503);
});
test('owner wallet and same-origin post are mandatory for passkey registration',async()=>{
 const body={alias:'owner.test@quantaphi.org'};
 const wrong=await json(await handleOwnerPasskeyRequest(request('/register/begin',body,{origin:'https://evil.test'}),env,ownerAuth));
 assert.equal(wrong.status,403);
 const notOwner=await json(await handleOwnerPasskeyRequest(request('/register/begin',body),{
  ...env},async()=>({userId:'unrecognized-user'})));
 assert.equal(notOwner.status,403);
 const valid=await json(await handleOwnerPasskeyRequest(request('/register/begin',body,{token:'Bearer sq_'+'A'.repeat(32)}),env,ownerAuth));
 assert.equal(valid.ok,true);
 assert.equal(valid.attemptId,'begin');
});
test('owner signup rejects linked device pairing token in lieu of original wallet',async()=>{
 const r=await json(await handleOwnerPasskeyRequest(request('/register/begin',{alias:'owner.test@quantaphi.org'},{
 token:'Bearer bc_'+'A'.repeat(32)}),env,ownerAuth));
 assert.equal(r.status,403);
 assert.equal(r.error,'owner_verification_required');
});
test('successful verified login sets HttpOnly Secure SameSite Strict cookie, never JS session token',async()=>{
 const res=await handleOwnerPasskeyRequest(request('/login/finish',{
 alias:'owner.test@quantaphi.org',attemptId:'attempt',credential:{id:'credential',type:'public-key',response:{}}}),env,ownerAuth);
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
 for(let i=0;i<12;i++)await passkeys.beginAuthentication({alias:'owner.test@quantaphi.org',fingerprint:'example-ip-hash'});
 await assert.rejects(passkeys.beginAuthentication({alias:'owner.test@quantaphi.org',fingerprint:'example-ip-hash'}),/passkey_rate_limited/);
 const next=await passkeys.beginAuthentication({alias:'owner.test@quantaphi.org',fingerprint:'different-ip-hash'});
 assert.ok(next.attemptId);
 assert.equal(PASSKEY_CONSTANTS.ADMIN_SESSION_TTL,5*60*1000);
 assert.match(passkeyCookie('abc',true),/Max-Age=300/);
 assert.match(passkeyCookie('abc',false),/Max-Age=43200/);
});

test('administrator alias cannot elevate without the existing server-verified owner wallet',async()=>{
 const body={alias:'admin.test@quantaphi.org',attemptId:'attempt',credential:{id:'credential',type:'public-key',response:{}}};
 const noToken=await json(await handleOwnerPasskeyRequest(request('/login/finish',body),env,ownerAuth));
 assert.equal(noToken.status,403);
 assert.equal(noToken.error,'admin_role_verification_required');
 const token='Bearer sq_'+'A'.repeat(32);
 const differentWallet=await json(await handleOwnerPasskeyRequest(request('/login/finish',body,{token}),env,
  async()=>({userId:'different-wallet'})));
 assert.equal(differentWallet.status,403);
 assert.equal(differentWallet.error,'admin_role_verification_required');
 const paired=await json(await handleOwnerPasskeyRequest(request('/login/finish',body,{token:'Bearer bc_'+'A'.repeat(32)}),env,ownerAuth));
 assert.equal(paired.status,403);
 assert.equal(paired.error,'admin_role_verification_required');
});

test('administrator requires matching trusted wallet subject and has a five-minute cookie',async()=>{
 const token='Bearer sq_'+'A'.repeat(32);
 let role=null;
 const admin={...stub,passkeyLoginFinish:async args=>{
  role=args.adminAuthorized;
  return {...await stub.passkeyLoginFinish(args),alias:'admin.test@quantaphi.org'};
 }};
 const config={...env,CONNECTIONS:{idFromName:x=>x,get:()=>admin}};
 const response=await handleOwnerPasskeyRequest(request('/login/finish',{
  alias:'admin.test@quantaphi.org',attemptId:'attempt',credential:{id:'credential',type:'public-key',response:{}}
 },{token}),config,ownerAuth);
 assert.equal(response.status,200);
 assert.equal(role,true);
 assert.match(response.headers.get('set-cookie'),/Max-Age=300/);
 const unauthorized=await json(await handleOwnerPasskeyRequest(request('/login/finish',{
  alias:'admin.test@quantaphi.org',attemptId:'attempt',credential:{id:'credential',type:'public-key',response:{}}
 },{token}),config,async()=>({userId:'different-subject'})));
 assert.equal(unauthorized.status,403);
});

test('owner auth requires verified wallet state plus private expected account id',()=>{
 const valid=request('/register/begin',{alias:'owner.test@quantaphi.org'},
  {token:'Bearer sq_'+'A'.repeat(32)});
 assert.equal(authorizedOwnerWallet(valid,{userId:walletSubject},env),true);
 assert.equal(authorizedOwnerWallet(valid,{userId:'other'},env),false);
 assert.equal(authorizedOwnerWallet(valid,{userId:walletSubject},{...env,PASSKEY_OWNER_ACCOUNT_ID:''}),false);
 assert.equal(authorizedOwnerWallet(request('/register/begin',{alias:'owner.test@quantaphi.org'},
  {token:'Bearer bc_'+'A'.repeat(32)}),{userId:walletSubject},env),false);
});
test('direct Durable Object administrator authentication fails closed without trusted role',async()=>{
 const p=make(),b=await p.beginAuthentication({alias:'admin.test@quantaphi.org'});
 await assert.rejects(p.finishAuthentication({alias:'admin.test@quantaphi.org',attemptId:b.attemptId,
  credential:{id:'unregisteredcredential',type:'public-key',response:{}}}),/admin_role_verification_required/);
 assert.ok(await p.storage.get('quant-mail:challenge:'+b.attemptId));
});

test('one passkey slot per verified owner email; each address has a distinct account credential',async()=>{
 const p=make();
 const first=await p.beginRegistration({subject:walletSubject,alias:'owner.test@quantaphi.org'});
 const second=await p.beginRegistration({subject:walletSubject,alias:'admin.test@quantaphi.org'});
 assert.notEqual(Buffer.from(first.publicKey.user.id).toString('hex'),Buffer.from(second.publicKey.user.id).toString('hex'));
 assert.equal(first.publicKey.user.name,'owner.test@quantaphi.org');
 assert.equal(second.publicKey.user.name,'admin.test@quantaphi.org');
 const current=await p.load();
 current.subject=walletSubject;
 current.credentials=[
  {id:'Y3JlZDEw',alias:'owner.test@quantaphi.org',publicKey:'YQ',counter:0,transports:[]},
  {id:'Y3JlZDIx',alias:'admin.test@quantaphi.org',publicKey:'YQ',counter:0,transports:[]}
 ];
 await p.storage.put('quant-mail:owner-passkeys',current);
 await assert.rejects(p.beginRegistration({subject:walletSubject,alias:'owner.test@quantaphi.org'}),/alias_passkey_already_registered/);
 await assert.rejects(p.beginRegistration({subject:walletSubject,alias:'admin.test@quantaphi.org'}),/alias_passkey_already_registered/);
 const one=await p.beginAuthentication({alias:'owner.test@quantaphi.org',fingerprint:'firstIP'});
 const two=await p.beginAuthentication({alias:'admin.test@quantaphi.org',fingerprint:'secondIP'});
 assert.deepEqual(one.publicKey.allowCredentials.map(c=>c.id),['Y3JlZDEw']);
 assert.deepEqual(two.publicKey.allowCredentials.map(c=>c.id),['Y3JlZDIx']);
 await assert.rejects(p.finishAuthentication({alias:'owner.test@quantaphi.org',attemptId:one.attemptId,
  credential:{type:'public-key',id:'Y3JlZDIx',response:{}}}),/passkey_unrecognized/);
});
test('private Android passkey form never preselects owner email and public client accepts typed email',()=>{
 const client=readFileSync(new URL('../quant-mail-passkeys.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(client,/OWNER_MAIL_ALIASES|kris@quantaphi\.org|administrator@quantaphi\.org/);
 assert.match(client,/aliasInput.value=''/);
 assert.match(client,/alias_passkey_already_registered/);
});

test('server requires a private two-address owner allowlist; public source does not contain owner addresses',async()=>{
 const p=make();
 assert.equal(p.registry.owner,'owner.test@quantaphi.org');
 assert.equal(p.registry.administrator,'admin.test@quantaphi.org');
 const denied=await json(await handleOwnerPasskeyRequest(request('/status'),{
  ...env,OWNER_EMAIL_ALIAS_REGISTRY:undefined},ownerAuth));
 assert.equal(denied.enabled,false);
 const registered=await json(await handleOwnerPasskeyRequest(request('/register/begin',{alias:'owner.test@quantaphi.org'}),
  {...env,OWNER_EMAIL_ALIAS_REGISTRY:'{"owner":"owner.test@quantaphi.org"}'},ownerAuth));
 assert.equal(registered.status,503);
 const source=readFileSync(new URL('../workers/bubbles-connections/owner-passkeys.mjs',import.meta.url),'utf8')+
  readFileSync(new URL('../workers/bubbles-connections/passkey-router.mjs',import.meta.url),'utf8');
 assert.doesNotMatch(source,/kris@quantaphi\\.org|administrator@quantaphi\\.org/i);
});

test('route accepts only public GET status without Origin while failing closed for other unauthenticated requests',async()=>{
 const empty={CONNECTIONS:service,BOT_WALLET:env.BOT_WALLET};
 const lookup=()=>stub;
 const status=await json(await handleConnections(new Request('https://quantaphi.org/api/quant-mail/passkeys/status'),empty,lookup));
 assert.equal(status.status,200);
 assert.equal(status.ok,true);
 assert.equal(status.registrationReady,false);
 assert.equal(status.enabled,false);
 assert.equal(status.rpId,'quantaphi.org');
 assert.equal(status.aliases,undefined);
 const attack=await json(await handleConnections(new Request('https://quantaphi.org/api/quant-mail/passkeys/register/begin',{
  method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({alias:'owner.test@quantaphi.org'})
 }),empty,lookup));
 assert.equal(attack.status,403);
});

test('one-time owner enrollment challenges cannot be replayed or stolen by a different subject',async()=>{
 const p=make();
 const first=await p.beginRegistration({subject:walletSubject,alias:'owner.test@quantaphi.org'});
 await assert.rejects(p.consume(first.attemptId,'register','owner.test@quantaphi.org','other-subject'),/challenge_invalid/);
 const saved=await p.storage.get('quant-mail:challenge:'+first.attemptId);
 assert.equal(saved.subject,walletSubject);
 const consumed=await p.consume(first.attemptId,'register','owner.test@quantaphi.org',walletSubject);
 assert.equal(consumed.subject,walletSubject);
 await assert.rejects(p.consume(first.attemptId,'register','owner.test@quantaphi.org',walletSubject),/challenge_invalid/);
});
test('browser origin, method and owner account claim are fail-closed',async()=>{
 const alias='owner.test@quantaphi.org';
 const wrongOrigin=await json(await handleOwnerPasskeyRequest(request('/register/begin',{alias},
  {origin:'https://malicious.test',token:'Bearer sq_'+'A'.repeat(32)}),env,ownerAuth));
 assert.equal(wrongOrigin.status,403);
 const emptyOrigin=await json(await handleOwnerPasskeyRequest(request('/register/begin',{alias},
  {origin:'',token:'Bearer sq_'+'A'.repeat(32)}),env,ownerAuth));
 assert.equal(emptyOrigin.status,403);
 const unrelated=await json(await handleOwnerPasskeyRequest(request('/register/begin',{alias},
  {token:'Bearer sq_'+'A'.repeat(32)}),env,async()=>({userId:'imposter'})));
 assert.equal(unrelated.status,403);
 const noConfiguredOwner=await json(await handleOwnerPasskeyRequest(request('/status'),
  {...env,PASSKEY_OWNER_ACCOUNT_ID:undefined},ownerAuth));
 assert.equal(noConfiguredOwner.enabled,false);
});
test('authenticated owner aliases are accepted from private registry and never from browser supplied authorization flags',()=>{
 const requestGood=request('/register/begin',{alias:'owner.test@quantaphi.org'},{
  token:'Bearer sq_'+'A'.repeat(32)});
 assert.equal(authorizedOwnerWallet(requestGood,{userId:walletSubject},env),true);
 assert.equal(authorizedOwnerWallet(requestGood,{userId:'imposter'},env),false);
 assert.equal(authorizedOwnerWallet(requestGood,{userId:walletSubject},{...env,PASSKEY_OWNER_ACCOUNT_ID:'other'}),false);
});

test('phone administrator login supplies an existing wallet token for WebAuthn step-up',async()=>{
 const requests=[];
 const wallet='sq_'+'A'.repeat(36);
 const request=async(url,init)=>{
  requests.push({url,auth:init.headers?.Authorization||null});
  if(url.endsWith('/login/begin'))
   return Response.json({ok:true,attemptId:'signed-challenge',publicKey:{
    challenge:'abc',rpId:'quantaphi.org',userVerification:'required'
   }});
  return Response.json({ok:true,passkeyVerified:true,sessionEstablished:true,
   alias:'admin.test@quantaphi.org',rpId:'quantaphi.org'});
 };
 const Credential={parseRequestOptionsFromJSON:x=>x};
 const credentials={get:async()=>({type:'public-key',toJSON:()=>({
  id:'test-credential-123',type:'public-key',response:{clientDataJSON:'x',authenticatorData:'x',signature:'x'}
 })})};
 const result=await runPasskeyCeremony({kind:'login',alias:'admin.test@quantaphi.org',
  request,Credential,credentials,walletToken:wallet,
  locationLike:{origin:'https://quantaphi.org',hostname:'quantaphi.org'},secureContext:true});
 assert.equal(result.verified,true);
 assert.equal(requests.length,2);
 assert.equal(requests[0].auth,'Bearer '+wallet);
 assert.equal(requests[1].auth,'Bearer '+wallet);
});
test('server-reported already registered alias survives safe client error translation',async()=>{
 const name='alias_passkey_already_registered';
 await assert.rejects(passkeyServerRequest('/register/finish',{alias:'owner.test@quantaphi.org'},{
  request:async()=>Response.json({ok:false,error:name},{status:400}),
  token:'sq_'+'B'.repeat(32)
 }),error=>error.message===name);
});
