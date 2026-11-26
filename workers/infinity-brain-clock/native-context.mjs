// Native text-evidence decoder. Invoke only after the existing runner lease
// check. No cross-request cache, storage, network, inference or authorization.
const STAGES=new Set(['/runner/color-think','/runner/plan','/runner/build','/runner/engine-review','/runner/arbitrate']);
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const sha=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s);
const encoder=new TextEncoder();
const digest=async(key,text)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(JSON.stringify([key,text])))),b=>b.toString(16).padStart(2,'0')).join('');
export async function decodeNativeEvidence(body,lease,path){
 if(!Object.hasOwn(body,'nativeEvidence'))return body.evidence;
 if(!STAGES.has(path)||Object.hasOwn(body,'evidence'))throw Error('native_context_invalid');
 const p=body.nativeEvidence,s=p?.scope;
 if(!exact(p,['version','scope','entries'])||p.version!==1||!Array.isArray(p.entries))throw Error('native_context_invalid');
 if(!lease||typeof lease.ticketId!=='string'||!lease.ticketId||typeof lease.jobId!=='string'||!lease.jobId||typeof lease.repository!=='string'||!exact(s,['jobId','repo','baseSha'])||s.jobId!==lease.ticketId+'/'+lease.jobId||s.repo!==lease.repository||!sha(s.baseSha))throw Error('native_context_scope');
 if(p.entries.length>64)throw Error('native_context_limit');
 const key=JSON.stringify([s.jobId,s.repo,s.baseSha]);
 const seen=new Map(),parts=[];let size=0;
 for(const entry of p.entries){
  if(!(exact(entry,['id'])||exact(entry,['id','text']))||typeof entry.id!=='string'||!/^[a-f0-9]{64}$/.test(entry.id))throw Error('native_context_invalid');
  const text=Object.hasOwn(entry,'text')?entry.text:seen.get(entry.id);
  if(text===undefined)throw Error('native_context_missing');
  if(typeof text!=='string')throw Error('native_context_invalid');
  const n=encoder.encode(text).byteLength;size+=n;
  if(n>32768||size>131072)throw Error('native_context_limit');
  if(await digest(key,text)!==entry.id)throw Error('native_context_integrity');
  seen.set(entry.id,text);parts.push(text);
 }
 let evidence;try{evidence=JSON.parse(parts.join(''));}catch{throw Error('native_context_invalid');}
 if(!evidence||typeof evidence!=='object'||Array.isArray(evidence))throw Error('native_context_invalid');
 if(evidence.baseSha!==s.baseSha||(evidence.runtime?.baseSha!==undefined&&evidence.runtime.baseSha!==s.baseSha))throw Error('native_context_scope');
 if(JSON.stringify(evidence).length>125000)throw Error('native_context_limit');
 return evidence;
}
