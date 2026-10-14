/* Append-only, owner-scoped iteration knowledge for next model sessions.
   An observation is NEVER a spendable Quant, Infinity token, or payout receipt. */
import {redactExperience} from './brain-rag-memory.mjs';
const SHA=v=>/^[a-f0-9]{64}$/.test(v||'');
const clean=(v,n)=>redactExperience(v).slice(0,n);
export function inspectionRecord({ownerHash,repository,ticketId,jobId,task,sources,review,occurredAt=Date.now()}={}){
 if(!SHA(ownerHash)||!/^www-infinity4\/[\w.-]{1,100}$/.test(repository||'')||
  !/^IW-[\w-]{8,75}$/.test(ticketId||'')||!/^TASK-\d+$/.test(jobId||''))throw Error('iteration_identity_rejected');
 const evidence=(Array.isArray(sources)?sources:[]).slice(0,8).map(s=>{
  const address=String(s.url||'');
  let url='';try{const u=new URL(address);if(u.protocol==='https:'&&['raw.githubusercontent.com','github.com'].includes(u.hostname))url=u.origin+u.pathname}catch{}
  const path=url?url.split('/').slice(-1)[0]:'';
  const language=path.endsWith('.md')?'Markdown':path.endsWith('.html')?'HTML':path.endsWith('.js')?'JavaScript':path.endsWith('.py')?'Python':'source';
  return {url,filename:clean(path,110),language,http:Number(s.http)||0,sha256:SHA(s.sha256)?s.sha256:'',truncated:s.truncated===true};
 }).filter(x=>x.url);
 const verified=evidence.some(x=>x.http===200&&x.sha256.length===64);
 const summary=clean(review?.summary||'Repository source inspection recorded.',680);
 const next=clean(review?.next||'Further review required.',280);
 return {ownerHash,repository,ticketId,jobId,task:clean(task,600),evidence,verified,
   summary:summary||'Repository source inspection recorded.',next,occurredAt:Number(occurredAt)||Date.now(),
   knowledgeType:'INFINITY_RESEARCH_CONTEXT',minted:false,tokenAmount:0};
}
export async function saveInspection(env,input){
 const item=inspectionRecord(input);
 if(!item.verified)return {stored:false,reason:'no_verified_source_digest'};
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([item.ownerHash,item.repository,item.ticketId,item.jobId,item.evidence.map(x=>x.sha256),item.summary])));
 const id='exp-'+[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,60);
 const meta=JSON.stringify({task:item.task,next:item.next,sources:item.evidence,knowledgeType:item.knowledgeType,minted:false,tokenAmount:0,provenance:'verified_bounded_source_read'});
 const r=await env.WORK_DB.prepare("INSERT OR IGNORE INTO brain_experiences (experience_id,owner_hash,repository,ticket_id,job_id,kind,status,summary,evidence_url,metadata_json,verified,occurred_at,created_at,embedding_status) VALUES (?,?,?,?,?,'observation','inspected',?,?,?,1,?,?,'pending')")
  .bind(id,item.ownerHash,item.repository,item.ticketId,item.jobId,item.summary,item.evidence[0]?.url||'',meta,item.occurredAt,Date.now()).run();
 return {id,stored:true,duplicate:r?.meta?.changes===0,verified:true,knowledgeType:item.knowledgeType};
}
