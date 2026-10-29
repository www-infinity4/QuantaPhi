import {
 generateRegistrationOptions,verifyRegistrationResponse,
 generateAuthenticationOptions,verifyAuthenticationResponse
} from '@simplewebauthn/server';

const RP_ID='quantaphi.org',ORIGIN='https://quantaphi.org';
const ALIASES=Object.freeze(['kris@quantaphi.org','administrator@quantaphi.org']);
const CHALLENGE_TTL=5*60*1000,SESSION_TTL=12*60*60*1000,ADMIN_SESSION_TTL=5*60*1000;
const enc=new TextEncoder();
const b64=bytes=>{
 let raw='';for(const n of bytes)raw+=String.fromCharCode(n);
 return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const bytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),x=>x.charCodeAt(0));
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const digest=async v=>b64(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(v))));
const allowedAlias=alias=>typeof alias==='string'&&ALIASES.includes(alias.toLowerCase().trim())?alias.toLowerCase().trim():null;
const invalid=reason=>{throw Error(reason);};
const validOwner=subject=>typeof subject==='string'&&subject.length>0&&subject.length<160;
const cleanCredential=data=>data&&typeof data==='object'&&typeof data.id==='string'&&
  data.id.length>=8&&data.id.length<512&&data.type==='public-key'&&data.response&&typeof data.response==='object';
export class OwnerPasskeys {
 constructor(storage,{clock=()=>Date.now()}={}){this.storage=storage;this.clock=clock;}
 async load(){return await this.storage.get('quant-mail:owner-passkeys')||{subject:null,credentials:[]};}
 async beginRegistration({subject,alias}){
  if(!validOwner(subject))invalid('verified_owner_required');
  const chosen=allowedAlias(alias);
  if(!chosen)invalid('owner_alias_invalid');
  const state=await this.load();
  if(state.subject&&state.subject!==subject)invalid('owner_binding_conflict');
  if(state.credentials.length>=8)invalid('passkey_limit');
  const userID=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode('quant-mail-owner:'+subject)));
  const options=await generateRegistrationOptions({
   rpName:'QuantaPhi Quant Mail',rpID:RP_ID,
   userID,userName:chosen,attestationType:'none',
   excludeCredentials:state.credentials.map(c=>({id:c.id,transports:c.transports||[]})),
   authenticatorSelection:{residentKey:'preferred',userVerification:'required'},
   supportedAlgorithmIDs:[-7,-257],
   timeout:60000
  });
  const attemptId=random(),stamp=this.clock();
  await this.storage.put('quant-mail:challenge:'+attemptId,{
    purpose:'register',alias:chosen,subject,challenge:options.challenge,expiresAt:stamp+CHALLENGE_TTL});
  return {attemptId,publicKey:options};
 }
 async consume(attemptId,purpose,alias,subject=null){
  if(typeof attemptId!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(attemptId))invalid('challenge_invalid');
  const key='quant-mail:challenge:'+attemptId;
  return this.storage.transaction(async tx=>{
   const record=await tx.get(key);
   if(!record||record.purpose!==purpose||record.alias!==allowedAlias(alias)||
      record.expiresAt<=this.clock()||(subject!==null&&record.subject!==subject))
      invalid('challenge_invalid');
   await tx.delete(key);
   return record;
  });
 }
 async finishRegistration({subject,alias,attemptId,credential}){
  if(!validOwner(subject))invalid('verified_owner_required');
  if(!cleanCredential(credential))invalid('passkey_response_invalid');
  const record=await this.consume(attemptId,'register',alias,subject);
  const result=await verifyRegistrationResponse({
   response:credential,expectedChallenge:record.challenge,expectedOrigin:ORIGIN,
   expectedRPID:RP_ID,requireUserVerification:true
  });
  if(!result.verified||!result.registrationInfo?.credential)invalid('passkey_verification_failed');
  const {credential:accepted,credentialDeviceType,credentialBackedUp}=result.registrationInfo;
  if(!accepted.id||!accepted.publicKey?.length||accepted.counter<0)invalid('passkey_record_invalid');
  await this.storage.transaction(async tx=>{
   const current=await tx.get('quant-mail:owner-passkeys')||{subject:null,credentials:[]};
   if(current.subject&&current.subject!==subject)invalid('owner_binding_conflict');
   if(current.credentials.some(c=>c.id===accepted.id)||current.credentials.length>=8)
    invalid('credential_exists_or_limit');
   current.subject=subject;
   current.credentials.push({id:accepted.id,publicKey:b64(accepted.publicKey),counter:accepted.counter,
    transports:accepted.transports||[],deviceType:credentialDeviceType,backedUp:credentialBackedUp,
    createdAt:this.clock()});
   await tx.put('quant-mail:owner-passkeys',current);
  });
  return {ok:true,passkeyVerified:true,registrationStored:true,alias:record.alias,rpId:RP_ID};
 }
 async checkRateLimit(fingerprint){
  const key='quant-mail:rate:'+fingerprint;
  await this.storage.transaction(async tx=>{
   const at=this.clock(),last=await tx.get(key);
   const record=last&&at-last.startedAt<60000?last:{startedAt:at,count:0};
   if(record.count>=12)invalid('passkey_rate_limited');
   record.count++;await tx.put(key,record);
  });
 }
 async beginAuthentication({alias,fingerprint='anonymous'}){
  if(typeof fingerprint!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(fingerprint))invalid('invalid_client_fingerprint');
  await this.checkRateLimit(fingerprint);
  const chosen=allowedAlias(alias);
  if(!chosen)invalid('owner_alias_invalid');
  const state=await this.load();
  const options=await generateAuthenticationOptions({
   rpID:RP_ID,userVerification:'required',timeout:60000,
   allowCredentials:state.credentials.map(c=>({id:c.id,transports:c.transports||[]}))
  });
  const attemptId=random();
  await this.storage.put('quant-mail:challenge:'+attemptId,{
   purpose:'login',alias:chosen,challenge:options.challenge,expiresAt:this.clock()+CHALLENGE_TTL});
  return {attemptId,publicKey:options};
 }
 async finishAuthentication({alias,attemptId,credential}){
  if(!cleanCredential(credential))invalid('passkey_response_invalid');
  const record=await this.consume(attemptId,'login',alias);
  const state=await this.load();
  const stored=state.credentials.find(c=>c.id===credential.id);
  if(!stored||!validOwner(state.subject))invalid('passkey_unrecognized');
  const result=await verifyAuthenticationResponse({
   response:credential,expectedChallenge:record.challenge,expectedOrigin:ORIGIN,
   expectedRPID:RP_ID,requireUserVerification:true,
   credential:{id:stored.id,publicKey:bytes(stored.publicKey),
    counter:stored.counter,transports:stored.transports||[]}
  });
  if(!result.verified)invalid('passkey_verification_failed');
  const newCounter=result.authenticationInfo.newCounter;
  await this.storage.transaction(async tx=>{
   const current=await tx.get('quant-mail:owner-passkeys');
   const c=current?.credentials?.find(x=>x.id===stored.id);
   if(!c||current.subject!==state.subject)invalid('credential_revoked');
   if(c.counter>0&&newCounter<=c.counter)invalid('counter_replay');
   c.counter=newCounter;await tx.put('quant-mail:owner-passkeys',current);
  });
  const sessionToken=random(),sessionHash=await digest(sessionToken);
  await this.storage.put('quant-mail:session:'+sessionHash,{
   subject:state.subject,role:record.alias==='administrator@quantaphi.org'?'administrator':'owner',
   alias:record.alias,expiresAt:this.clock()+(record.alias==='administrator@quantaphi.org'?ADMIN_SESSION_TTL:SESSION_TTL),
   verifiedAt:this.clock()});
  return {ok:true,passkeyVerified:true,alias:record.alias,rpId:RP_ID,
   sessionEstablished:true,sessionToken};
 }
 async validateSession({token}){
  if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))return {valid:false};
  const record=await this.storage.get('quant-mail:session:'+await digest(token));
  if(!record||record.expiresAt<=this.clock())return {valid:false};
  return {valid:true,role:record.role,alias:record.alias,verifiedAt:record.verifiedAt};
 }
}
export const PASSKEY_CONSTANTS={RP_ID,ORIGIN,ALIASES,CHALLENGE_TTL,SESSION_TTL,ADMIN_SESSION_TTL};
