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
 const p=make(),b=await p.beginAuthentication({alias:'administrator@quantaphi.org'});
 assert.equal(b.publicKey.rpId,'quantaphi.org');
 assert.equal(b.publicKey.userVerification,'required');
 assert.equal(b.attemptId.length,43);
 await assert.rejects(p.finishAuthentication({alias:'administrator@quantaphi.org',attemptId:b.attemptId,credential:{type:'public-key',id:'unregisteredcredential',response:{}}}),/passkey_unrecognized/);
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
test('new UI only offers passkeys when backend readiness is confirmed',()=>{
 const html=readFileSync(new URL('../quant-mail.html',import.meta.url),'utf8');
 const js=readFileSync(new URL('../quant-mail-passkeys.mjs',import.meta.url),'utf8');
 assert.match(html,/kris@quantaphi\.org/);
 assert.match(html,/administrator@quantaphi\.org/);
 assert.match(html,/quantMailPasskeyRegister" disabled/);
 assert.match(html,/quantMailPasskeyLogin" disabled/);
 assert.match(js,/result\.enabled===true/);
 assert.match(js,/result\.registrationReady===true/);
 assert.match(js,/result\.loginReady===true/);
 assert.match(js,/navigator\?\.credentials/);
 assert.doesNotMatch(html,/type="password"/);
});
