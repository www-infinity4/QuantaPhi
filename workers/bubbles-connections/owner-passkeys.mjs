// Load the pinned verifier only for an actual WebAuthn ceremony. Existing
// account/connection readers must not require the package just to import router.
let verifierPromise;
const verifier=()=>verifierPromise||(verifierPromise=import('@simplewebauthn/server'));

const RP_ID='quantaphi.org',ORIGIN='https://quantaphi.org';
// The two owner aliases are configured privately at runtime, never in public source.
export function parseOwnerAliasRegistry(value){
 let data;
 try{data=typeof value==='string'?JSON.parse(value):value;}catch{return null;}
 if(!data||typeof data!=='object')return null;
 const normalize=x=>typeof x==='string'?x.toLowerCase().trim():'';
 const owner=normalize(data.owner),administrator=normalize(data.administrator);
 const valid=x=>/^[a-z0-9][a-z0-9._-]{0,63}@quantaphi\.org$/.test(x);
 if(!valid(owner)||!valid(administrator)||owner===administrator)return null;
 return Object.freeze({owner,administrator});
}
const CHALLENGE_TTL=5*60*1000,SESSION_TTL=12*60*60*1000,ADMIN_SESSION_TTL=5*60*1000;
const enc=new TextEncoder();
const b64=bytes=>{
 let raw='';for(const n of bytes)raw+=String.fromCharCode(n);
 return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
};
const bytes=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),x=>x.charCodeAt(0));
const random=()=>b64(crypto.getRandomValues(new Uint8Array(32)));
const digest=async v=>b64(new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(v))));
const allowedAlias=(alias,registry)=>typeof alias==='string'&&registry&&Object.values(registry).includes(alias.toLowerCase().trim())?alias.toLowerCase().trim():null;
const invalid=reason=>{throw Error(reason);};
const validOwner=subject=>typeof subject==='string'&&subject.length>0&&subject.length<160;
const cleanCredential=data=>data&&typeof data==='object'&&typeof data.id==='string'&&
  data.id.length>=8&&data.id.length<512&&data.type==='public-key'&&data.response&&typeof data.response==='object';
export class OwnerPasskeys {
 constructor(storage,{clock=()=>Date.now(),allowedAliases=null}={}){this.storage=storage;this.clock=clock;this.registry=parseOwnerAliasRegistry(allowedAliases);}
 async load(){return await this.storage.get('quant-mail:owner-passkeys')||{subject:null,credentials:[]};}
 async beginRegistration({subject,alias}){
  if(!validOwner(subject))invalid('verified_owner_required');
  const chosen=allowedAlias(alias,this.registry);
  if(!chosen)invalid('owner_alias_invalid');
  const state=await this.load();
  if(state.subject&&state.subject!==subject)invalid('owner_binding_conflict');
  // One independently registered phone credential per chosen address, enforced server-side.
  if(state.credentials.some(c=>c.alias===chosen))invalid('alias_passkey_already_registered');
  if(state.credentials.length>=2)invalid('passkey_limit');
  const userID=new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode('quant-mail-owner:'+subject+':'+chosen)));
  const options=await (await verifier()).generateRegistrationOptions({
   rpName:'QuantaPhi Quant Mail',rpID:RP_ID,
   userID,userName:chosen,attestationType:'none',
   excludeCredentials:state.credentials.filter(c=>c.alias===chosen).map(c=>({id:c.id,transports:c.transports||[]})),
   authenticatorSelection:{residentKey:'preferred',userVerification:'required'},
   supportedAlgorithmIDs:[-7,-257],
   timeout:60000
  });
  const attemptId=random(),stamp=this.clock();
  // An owner can restart phone enrollment. Keep only the newest outstanding
  // challenge per alias so repeated starts cannot grow credential storage forever.
  // The transaction also invalidates the old challenge before publishing the new one.
  await this.storage.transaction(async tx=>{
   const pendingKey='quant-mail:pending-register:'+chosen;
   const previous=await tx.get(pendingKey);
   if(typeof previous==='string'&&/^[A-Za-z0-9_-]{43}$/.test(previous))
    await tx.delete('quant-mail:challenge:'+previous);
   await tx.put('quant-mail:challenge:'+attemptId,{
    purpose:'register',alias:chosen,subject,challenge:options.challenge,expiresAt:stamp+CHALLENGE_TTL});
   await tx.put(pendingKey,attemptId);
  });
  return {attemptId,publicKey:options};
 }
 async consume(attemptId,purpose,alias,subject=null){
  if(typeof attemptId!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(attemptId))invalid('challenge_invalid');
  const key='quant-mail:challenge:'+attemptId;
  return this.storage.transaction(async tx=>{
   const record=await tx.get(key);
   if(!record||record.purpose!==purpose||record.alias!==allowedAlias(alias,this.registry)||
      record.expiresAt<=this.clock()||(subject!==null&&record.subject!==subject))
      invalid('challenge_invalid');
   await tx.delete(key);
   if(purpose==='register'){
    const pendingKey='quant-mail:pending-register:'+record.alias;
    if(await tx.get(pendingKey)===attemptId)await tx.delete(pendingKey);
   }
   return record;
  });
 }
 async finishRegistration({subject,alias,attemptId,credential}){
  if(!validOwner(subject))invalid('verified_owner_required');
  if(!cleanCredential(credential))invalid('passkey_response_invalid');
  const record=await this.consume(attemptId,'register',alias,subject);
  const result=await (await verifier()).verifyRegistrationResponse({
   response:credential,expectedChallenge:record.challenge,expectedOrigin:ORIGIN,
   expectedRPID:RP_ID,requireUserVerification:true
  });
  if(!result.verified||!result.registrationInfo?.credential)invalid('passkey_verification_failed');
  const {credential:accepted,credentialDeviceType,credentialBackedUp}=result.registrationInfo;
  if(!accepted.id||!accepted.publicKey?.length||accepted.counter<0)invalid('passkey_record_invalid');
  await this.storage.transaction(async tx=>{
   const current=await tx.get('quant-mail:owner-passkeys')||{subject:null,credentials:[]};
   if(current.subject&&current.subject!==subject)invalid('owner_binding_conflict');
   if(current.credentials.some(c=>c.alias===record.alias))invalid('alias_passkey_already_registered');
   if(current.credentials.some(c=>c.id===accepted.id)||current.credentials.length>=2)
    invalid('credential_exists_or_limit');
   current.subject=subject;
   current.credentials.push({alias:record.alias,id:accepted.id,publicKey:b64(accepted.publicKey),counter:accepted.counter,
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
  const chosen=allowedAlias(alias,this.registry);
  if(!chosen)invalid('owner_alias_invalid');
  const state=await this.load();
  const options=await (await verifier()).generateAuthenticationOptions({
   rpID:RP_ID,userVerification:'required',timeout:60000,
   allowCredentials:state.credentials.filter(c=>c.alias===chosen).map(c=>({id:c.id,transports:c.transports||[]}))
  });
  const attemptId=random();
  await this.storage.put('quant-mail:challenge:'+attemptId,{
   purpose:'login',alias:chosen,challenge:options.challenge,expiresAt:this.clock()+CHALLENGE_TTL});
  return {attemptId,publicKey:options};
 }
 async finishAuthentication({alias,attemptId,credential,adminAuthorized=false}){
  if(!cleanCredential(credential))invalid('passkey_response_invalid');
  // An alias is never an RBAC grant. Only a trusted server-side role check
  // may authorize a fresh UV-verified administrator assertion.
  if(allowedAlias(alias,this.registry)===this.registry?.administrator&&adminAuthorized!==true)
   invalid('admin_role_verification_required');
  const record=await this.consume(attemptId,'login',alias);
  const state=await this.load();
  const stored=state.credentials.find(c=>c.id===credential.id&&c.alias===record.alias);
  if(!stored||!validOwner(state.subject))invalid('passkey_unrecognized');
  const result=await (await verifier()).verifyAuthenticationResponse({
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
   if(!c||c.alias!==record.alias||current.subject!==state.subject)invalid('credential_revoked');
   if(c.counter>0&&newCounter<=c.counter)invalid('counter_replay');
   c.counter=newCounter;await tx.put('quant-mail:owner-passkeys',current);
  });
  const sessionToken=random(),sessionHash=await digest(sessionToken);
  await this.storage.put('quant-mail:session:'+sessionHash,{
   subject:state.subject,role:record.alias===this.registry?.administrator?'administrator':'owner',
   alias:record.alias,expiresAt:this.clock()+(record.alias===this.registry?.administrator?ADMIN_SESSION_TTL:SESSION_TTL),
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
export const PASSKEY_CONSTANTS={RP_ID,ORIGIN,CHALLENGE_TTL,SESSION_TTL,ADMIN_SESSION_TTL};
