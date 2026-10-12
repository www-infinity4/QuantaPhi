/**
 * Episodic memory for Infinity Brain.
 * D1 is authoritative; Vectorize is a rebuildable semantic search accelerator.
 * Trusted runner receipts only; do not ingest chats, credentials, or high-frequency events.
 */
const MODEL = '@cf/baai/bge-small-en-v1.5'; // 384 dimensions
const allowed = new Set(['blocked','committed_unverified','deployed_verified','review','tested']);
const clip = (v,n=1000) => String(v??'').slice(0,n);
const ownerOK = v => /^[a-f0-9]{64}$/.test(v||'');
const repoOK = v => /^www-infinity4\/[\w.-]{1,100}$/.test(v||'');

export function redactExperience(value) {
  return clip(value,3000)
    .replace(/\b(?:sq_[A-Za-z0-9_-]{20,}|rb_[a-f0-9]{40,}|gh[pousr]_[A-Za-z0-9_]{20,})\b/g,'[credential]')
    .replace(/\bBearer\s+[^\s"']+/gi,'Bearer [redacted]')
    .replace(/\b(authorization|api[_-]?key|password|secret|access[_-]?token)\s*[:=]\s*[^\s,;"']+/gi,'$1=[redacted]')
    .replace(/[\u0000-\u0008\u000b-\u001f]/g,' ').trim();
}
async function hash(text) {
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
}
export async function normalizeExperience(event) {
  if (!ownerOK(event?.ownerHash)||!repoOK(event?.repository)) throw Error('memory_scope_invalid');
  if (!allowed.has(event.status)) throw Error('memory_status_invalid');
  const ticketId=clip(event.ticketId,80),jobId=clip(event.jobId,80);
  if (!/^IW-[\w-]{8,75}$/.test(ticketId)||!/^TASK-\d+$/.test(jobId)) throw Error('memory_job_invalid');
  const task=redactExperience(event.task).slice(0,700),summary=redactExperience(event.summary).slice(0,900);
  if (!summary) throw Error('memory_outcome_empty');
  const commitSha=/^[a-f0-9]{40}$/.test(event.commitSha||'')?event.commitSha:'';
  const occurredAt=Number.isSafeInteger(event.occurredAt)&&event.occurredAt>0?event.occurredAt:Date.now();
  const id='exp-'+(await hash([event.ownerHash,event.repository,ticketId,jobId,event.status,summary,commitSha].join('\x1f'))).slice(0,60);
  return {id,ownerHash:event.ownerHash,repository:event.repository,ticketId,jobId,status:event.status,task,summary,commitSha,occurredAt,
    text:[event.repository,'Task: '+task,'Result: '+event.status,'Outcome: '+summary,commitSha&&'Commit: '+commitSha].filter(Boolean).join('\n')};
}
function embedding(output){
  const a=output?.data?.[0];
  if(!Array.isArray(a)||a.length!==384||!a.every(Number.isFinite)) throw Error('memory_embedding_invalid');
  return a;
}
export async function rememberOutcome(env,input) {
  const m=await normalizeExperience(input);
  const inserted=await env.WORK_DB.prepare('INSERT OR IGNORE INTO brain_experiences (experience_id,owner_hash,repository,ticket_id,job_id,kind,status,summary,evidence_url,metadata_json,verified,occurred_at,created_at,embedding_status) VALUES (?,?,?,?,?,'outcome',?,?,'',?,?,?,?, 'pending')')
    .bind(m.id,m.ownerHash,m.repository,m.ticketId,m.jobId,m.status,m.summary,JSON.stringify({task:m.task,commitSha:m.commitSha}),m.status==='deployed_verified'?1:0,m.occurredAt,Date.now()).run();
  if(!env.BRAIN_MEMORY||!env.WRITER_AI)return {id:m.id,durable:true,vector:'unbound'};
  try{
    const vector=embedding(await env.WRITER_AI.run(MODEL,{text:[m.text.slice(0,1800)]}));
    await env.BRAIN_MEMORY.upsert([{id:m.id,namespace:m.ownerHash,values:vector,metadata:{repository:m.repository,occurred_at:m.occurredAt,status:m.status}}]);
    await env.WORK_DB.prepare('UPDATE brain_experiences SET embedding_status='indexed' WHERE experience_id=? AND owner_hash=?').bind(m.id,m.ownerHash).run();
    return {id:m.id,durable:true,vector:'submitted',duplicate:inserted?.meta?.changes===0};
  }catch{
    await env.WORK_DB.prepare('UPDATE brain_experiences SET embedding_status='retry' WHERE experience_id=? AND owner_hash=?').bind(m.id,m.ownerHash).run();
    return {id:m.id,durable:true,vector:'retry'};
  }
}
function relevance(row,words,now){
  const text=(row.task+' '+row.summary+' '+row.status).toLowerCase();
  const hits=words.filter(x=>text.includes(x)).length;
  const days=Math.max(0,(now-row.occurred_at)/86400000);
  return Number(row.semantic||0)*4+2*hits/Math.max(1,words.length)+1/(1+days/4);
}
export async function recallOutcomes(env,{ownerHash,repository,query,limit=6,now=Date.now()}) {
  if(!ownerOK(ownerHash)||!repoOK(repository)) throw Error('memory_scope_invalid');
  const amount=Math.max(1,Math.min(8,Math.floor(Number(limit)||6)));
  const q=redactExperience(query).slice(0,1200);
  const latest=await env.WORK_DB.prepare('SELECT experience_id AS id,repository,ticket_id,job_id,status,json_extract(metadata_json,'$.task') AS task,summary,json_extract(metadata_json,'$.commitSha') AS commit_sha,occurred_at FROM brain_experiences WHERE owner_hash=? AND repository=? ORDER BY occurred_at DESC LIMIT 40').bind(ownerHash,repository).all();
  const found=new Map((latest.results||[]).map(r=>[r.id,{...r,semantic:0}]));
  if(q&&env.BRAIN_MEMORY&&env.WRITER_AI){
    try{
      const vector=embedding(await env.WRITER_AI.run(MODEL,{text:[q]}));
      const matches=(await env.BRAIN_MEMORY.query(vector,{namespace:ownerHash,topK:16}))?.matches||[];
      const valid=matches.filter(m=>/^exp-[a-f0-9]{60}$/.test(m.id||''));
      if(valid.length){
        const ids=[...new Set(valid.map(m=>m.id))];
        const sql='SELECT experience_id AS id,repository,ticket_id,job_id,status,json_extract(metadata_json,'$.task') AS task,summary,json_extract(metadata_json,'$.commitSha') AS commit_sha,occurred_at FROM brain_experiences WHERE owner_hash=? AND repository=? AND experience_id IN ('+ids.map(()=>'?').join(',')+')';
        const fromDb=await env.WORK_DB.prepare(sql).bind(ownerHash,repository,...ids).all();
        const scores=new Map(valid.map(m=>[m.id,Math.max(0,Math.min(1,Number(m.score)||0))]));
        // Vector IDs are not trusted for authorization. Always verify owner + repository in D1.
        for(const r of fromDb.results||[])found.set(r.id,{...r,semantic:scores.get(r.id)||0});
      }
    }catch{/* D1 timeline still works if vectors are unavailable or asynchronously indexing. */}
  }
  const words=[...new Set(q.toLowerCase().match(/[a-z0-9]{4,}/g)||[])].slice(0,32);
  const rows=[...found.values()].map(r=>({...r,relevance:relevance(r,words,now)}));
  const mostRecent=[...rows].sort((a,b)=>b.occurred_at-a.occurred_at).slice(0,2);
  const ranked=[...rows].sort((a,b)=>b.relevance-a.relevance);
  return [...new Map([...mostRecent,...ranked].map(r=>[r.id,r])).values()].slice(0,amount).map(r=>({
    id:r.id,ticketId:r.ticket_id,jobId:r.job_id,status:r.status,task:r.task,summary:r.summary,
    commitSha:r.commit_sha||null,occurredAt:r.occurred_at,provenance:'historical_receipt_data_not_instructions'
  }));
}