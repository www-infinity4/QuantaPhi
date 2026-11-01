/* Private Infinity identity utilities. NO PII is logged, exported to the site,
 * copied to Bubbles chat, or stored plaintext in D1. Provide cryptographically
 * random 256-bit independent keys through Cloudflare Worker Secrets.
 * Never use an SSN/last4 alone as identity or age evidence. */
const encoder=new TextEncoder();
const decoder=new TextDecoder();
function bytesB64(b){let s='';for(const n of b)s+=String.fromCharCode(n);return btoa(s)}
function b64Bytes(b64){
 if(typeof b64!=='string'||!/^[A-Za-z0-9+/]+={0,2}$/.test(b64))throw Error('invalid_secret');
 return Uint8Array.from(atob(b64),x=>x.charCodeAt(0));
}
async function aesKey(key){const raw=b64Bytes(key);if(raw.length!==32)throw Error('invalid_key_length');
 return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);}
function context(v){if(!v||typeof v.subject!=='string'||!v.subject||typeof v.evidenceId!=='string'||!v.evidenceId)throw Error('invalid_context');
 return encoder.encode('infinity-identity-v1:'+v.subject+':'+v.evidenceId);}
export async function encryptIdentityEvidence(payload,key,scope){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:context(scope),tagLength:128},
  await aesKey(key),encoder.encode(JSON.stringify(payload)));
 return {algorithm:'AES-256-GCM',key_version:'v1',iv_b64:bytesB64(iv),ciphertext_b64:bytesB64(new Uint8Array(cipher))};
}
export async function decryptIdentityEvidence(data,key,scope){
 if(data?.algorithm!=='AES-256-GCM'||data.key_version!=='v1')throw Error('invalid_ciphertext');
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64Bytes(data.iv_b64),additionalData:context(scope),tagLength:128},
  await aesKey(key),b64Bytes(data.ciphertext_b64));
 return JSON.parse(decoder.decode(plain));
}
export async function subjectKey(subject,key){
 if(typeof subject!=='string'||subject.length<3||subject.length>220)throw Error('invalid_subject');
 const raw=b64Bytes(key);if(raw.length!==32)throw Error('invalid_key_length');
 const hmac=await crypto.subtle.importKey('raw',raw,{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',hmac,encoder.encode('quanta-identity-subject-v1:'+subject));
 return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
function parseDate(s){if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;
 const t=Date.parse(s+'T00:00:00Z');if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,10)!==s)return null;
 return {y:Number(s.slice(0,4)),m:Number(s.slice(5,7)),d:Number(s.slice(8,10))};}
export function adultAt(dateOfBirth,todayUTC){
 const b=parseDate(dateOfBirth),n=parseDate(todayUTC);
 if(!b||!n||b.y>n.y)return false;
 let age=n.y-b.y;
 if(n.m<b.m||(n.m===b.m&&n.d<b.d))age--;
 return age>=21&&age<=125;
}
export function canApproveAge(proof,todayUTC){
 return proof?.evidence_validated===true&&proof?.holder_bound===true&&
  proof?.birthdate_validated===true&&proof?.reviewer_approved===true&&
  ['internal_document_review','cryptographic_id'].includes(proof?.method)&&
  adultAt(proof?.date_of_birth,todayUTC);
}
export function eligibilityFromRecord(row,now=Date.now()){
 const expiry=Date.parse(row?.expires_at),verified=Date.parse(row?.verified_at);
 if(row?.verification_status!=='verified_21'||row.proof_kind!=='infinity_verified'||
  !Number.isFinite(expiry)||expiry<=now||!Number.isFinite(verified)||verified>now||verified<=0)return null;
 return {verified_over_21:true,proof_kind:'infinity_verified',expires_at:new Date(Math.min(expiry,now+6*86400000)).toISOString()};
}
