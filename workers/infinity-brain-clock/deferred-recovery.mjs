/*
 * Deferred jobs are recoverable work, not deleted work.
 *
 * One bounded, read-only source scan provides enough verified evidence for
 * technical requirements that a model mistakenly escalated to the owner.
 * Owner authorization, security, sensitive choices, and unresolved source
 * contracts are NEVER inferred from a GitHub file read.
 */
export const DEFERRED_REVIEW_INTERVAL_MS=60*60*1000;
export const DEFERRED_JOB_COOLDOWN_MS=6*60*60*1000;
export const MAX_RECOVERIES_PER_REVISION=2;
const DANGER=/(?:security_hold|permission_denied|owner_authorization_required|owner_approval_required|requires_owner|password|private.key|api.key|payment|wallet|biometric|fingerprint|consent|personal.data|secret|authorization|license|copyright|protected.media)/i;
const TECHNICAL=/(?:source.file|source.path|source.routing|file\(s\)|file names?|repository|exported|function signature|json schema|data schema|public api|module|source tree|path\(s\)|required source)/i;
const SOURCE_PATH=/(?:^|[\s\`"'\(\[,])([A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:json|js|mjs|cjs|ts|tsx|css|html))(?:[\s\`"'\)\],.;:]|$)/g;
const shaPattern=/^[a-f0-9]{40}$/;
const validPath=p=>/^[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*\.(?:json|js|mjs|cjs|ts|tsx|css|html)$/.test(p)&&
 !p.split('/').some(x=>x==='..'||x==='.')&&p.length<180;
function statusText(job){
 return [job?.progress?.summary,job?.progress?.blocker,job?.progress?.next].filter(x=>typeof x==='string').join(' ');
}
export function sourceRecoveryEligibility(job,{now=Date.now()}={}){
 if(job?.status!=='blocked'||!/^www-infinity4\/[A-Za-z0-9_.-]+$/.test(job.repository||''))
  return {eligible:false,reason:'not_a_blocked_owner_repository_job'};
 const message=statusText(job);
 if(DANGER.test(message))return {eligible:false,reason:'owner_or_security_decision'};
 if(!TECHNICAL.test(message))return {eligible:false,reason:'no_discoverable_technical_question'};
 // A model escalation is not a signed owner refusal: allow read-only proof
 // gathering, but NEVER infer any owner consent from a recovered source.
 const last=Number(job.progress?.deferredRecovery?.lastCheckedAt)||0;
 if(job.progress?.deferredRecovery?.status==='review_exhausted'&&last>now-24*60*60*1000)
  return {eligible:false,reason:'recovery_budget_exhausted_until_daily_review'};
 if(last>now-DEFERRED_JOB_COOLDOWN_MS&&last<=now)
  return {eligible:false,reason:'recovery_cooldown'};
 if(job.progress?.commitSha||job.progress?.testsPassed||job.progress?.runUrl&&job.progress?.blocker==='commit_verification_required')
  return {eligible:false,reason:'existing_execution_receipt_requires_verification'};
 return {eligible:true,reason:'read_only_source_recovery'};
}
export function namedSourcePaths(job,{maximum=5}={}){
 const source=[job?.instructions,statusText(job)].filter(x=>typeof x==='string').join(' ');
 const matches=[];SOURCE_PATH.lastIndex=0;
 for(const m of source.matchAll(SOURCE_PATH)){
  const p=m[1];
  if(validPath(p)&&!matches.includes(p))matches.push(p);
 }
 return matches.slice(0,Math.max(1,Math.min(5,maximum)));
}
async function readLimited(response,maximum){
 if(!response?.ok||!response.body)return null;
 const reader=response.body.getReader();const chunks=[];let size=0;
 try{
  for(;;){
   const {done,value}=await reader.read();if(done)break;
   size+=value.byteLength;if(size>maximum){await reader.cancel();return null;}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let pos=0;for(const chunk of chunks){bytes.set(chunk,pos);pos+=chunk.byteLength;}
 return new TextDecoder().decode(bytes);
}
async function hashString(value){
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));
 return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
export async function inspectDeferredSources(job,{request=fetch,now=Date.now()}={}){
 const repository=String(job?.repository||'');
 if(!/^www-infinity4\/[A-Za-z0-9_.-]+$/.test(repository))
  return {status:'invalid_repository',sources:[],required:[]};
 const requested=namedSourcePaths(job),sources=[];
 if(!requested.length)return {status:'source_paths_unresolved',sources,required:requested};
 const github='https://api.github.com/repos/'+repository+'/commits/main';
 let pinnedCommit='';
 try{
  const r=await request(github,{headers:{Accept:'application/vnd.github+json'},redirect:'error',
   signal:AbortSignal.timeout(12000)});
  const text=await readLimited(r,75000);
  const parsed=text&&JSON.parse(text);
  if(!shaPattern.test(parsed?.sha||''))return {status:'pinned_commit_unverified',sources,required:requested};
  pinnedCommit=parsed.sha;
 }catch{return {status:'pinned_commit_unavailable',sources,required:requested};}
 for(const path of requested){
  const url='https://raw.githubusercontent.com/'+repository+'/'+pinnedCommit+'/'+path.split('/').map(encodeURIComponent).join('/');
  try{
   const r=await request(url,{redirect:'error',signal:AbortSignal.timeout(12000)});
   const data=await readLimited(r,44000);
   if(data===null){sources.push({path,status:'unavailable'});continue;}
   sources.push({path,status:'verified_source',sha256:await hashString(data),bytes:new TextEncoder().encode(data).byteLength});
   // A manifest explicitly pointing to a schema can supply another *exact*
   // source without guessing or accepting a model-invented filename.
   if(path.endsWith('.json')&&sources.length<5){
    try{
     const parsed=JSON.parse(data),candidate=parsed?.cue_schema_path;
     if(typeof candidate==='string'&&validPath(candidate)&&!requested.includes(candidate)&&requested.length<5)
      requested.push(candidate);
    }catch{}
   }
  }catch{sources.push({path,status:'unavailable'});}
 }
 return {status:'inspected',repository,pinnedCommit,checkedAt:now,required:requested,sources};
}
export function recoveryDecision(job,inspection,{now=Date.now()}={}){
 const previous=job?.progress?.deferredRecovery||{};
 const existing=previous.pinnedCommit===inspection.pinnedCommit&&shaPattern.test(inspection.pinnedCommit||'');
 const tries=existing?Math.max(0,Math.min(99,Number(previous.requeueCount)||0)):0;
 const source=Array.isArray(inspection.sources)?inspection.sources:[];
 const found=source.filter(x=>x.status==='verified_source'&&/^[a-f0-9]{64}$/.test(x.sha256||''));
 const full=inspection.status==='inspected'&&shaPattern.test(inspection.pinnedCommit||'')&&
  inspection.required?.length>=2&&inspection.required.every(p=>found.some(x=>x.path===p));
 const result={...previous,lastCheckedAt:now,pinnedCommit:inspection.pinnedCommit||'',
  requiredPaths:inspection.required||[],sourceReceipts:found.map(({path,sha256,bytes})=>({path,sha256,bytes})),
  requeueCount:tries,originalBlocker:previous.originalBlocker||statusText(job).slice(0,1600)};
 if(!full)return {requeue:false,recovery:{...result,status:'needs_source_evidence',nextEligibleAt:now+DEFERRED_JOB_COOLDOWN_MS}};
 if(tries>=MAX_RECOVERIES_PER_REVISION)
  return {requeue:false,recovery:{...result,status:'review_exhausted',nextEligibleAt:now+DEFERRED_JOB_COOLDOWN_MS}};
 if(DANGER.test(statusText(job)))
  return {requeue:false,recovery:{...result,status:'owner_or_security_decision',nextEligibleAt:now+DEFERRED_JOB_COOLDOWN_MS}};
 const note='\n\n[Verified deferred recovery source]\nRead-only GitHub commit '+inspection.pinnedCommit+'): '+
  found.map(x=>x.path+' SHA-256 '+x.sha256).join('; ')+
  '. Inspect actual project source, exports, UI references and schema before editing. '+
  'Do not invent APIs, audio timing or assets, and preserve all owner/security and acceptance requirements.';
 const base=String(job.instructions||'').split('\n\n[Verified deferred recovery source]')[0];
 if(base.length+note.length>12000)
  return {requeue:false,recovery:{...result,status:'instructions_limit',nextEligibleAt:now+DEFERRED_JOB_COOLDOWN_MS}};
 return {requeue:true,instructions:base+note,
  recovery:{...result,status:'requeued_for_verified_source_build',verifiedAt:new Date(now).toISOString(),
   requeueCount:tries+1,nextEligibleAt:now+DEFERRED_JOB_COOLDOWN_MS,
   originalQueuePriority:Number.isFinite(previous.originalQueuePriority)?previous.originalQueuePriority:job.queue_priority||0}};
}
