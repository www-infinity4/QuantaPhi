/* Staged Robot Brain intake. Read-only, owner-partitioned, no model-sourced execution. */
const STATE='autopilot-triage-v1',CURSOR='autopilot-triage-cursor-v1';
const DONE=new Set(['complete','deployed_verified','merged_verified']);
const word=v=>String(v||'').slice(0,240);
export function workBucket(job,jobs=[]){
 const status=String(job?.status||'');
 const hint=[job?.progress?.blocker,job?.progress?.summary,job?.progress?.next].map(word).join(' ');
 if(/deployment_not_verified|deployed_unverified/i.test(hint)&&status!=='complete')return 'deployment_needs_verification';
 if(status==='committed_unverified'||/commit_verification_required/i.test(hint))return 'commit_needs_verification';
 if(['complete','deployed_verified','merged_verified','superseded'].includes(status))return 'source_or_review_finished';
 if(status==='working')return 'runner_in_progress_or_stale';
 if(/owner_input_required|owner_authorization_required|owner_approval_required|security_hold|permission_denied|secret|credential|wallet|payment|biometric/i.test(hint))return 'owner_or_security_decision';
 if(status==='blocked')return 'blocked_requires_diagnosis';
 if(['queued','ready'].includes(status)){
  const deps=Array.isArray(job.dependencies)?job.dependencies:[];
  return deps.every(id=>jobs.some(x=>x?.id===id&&DONE.has(x.status)))?'queued_for_existing_runner':'waiting_for_dependencies';
 }
 return 'unscheduled_or_draft';
}
export async function triageBacklog(db,store,ownerHash,{now=Date.now(),batchSize=15}={}){
 if(!/^[a-f0-9]{64}$/.test(ownerHash||''))return {ok:false,status:'owner_partition_unavailable'};
 const limit=Math.max(1,Math.min(25,Math.trunc(batchSize)||15));
 let cursor=await store.get(CURSOR);
 if(!cursor||!Number.isFinite(cursor.createdAt)||typeof cursor.id!=='string')cursor={createdAt:-1,id:''};
 const query=`SELECT id,repository,context_json,created_at FROM work_tickets
 WHERE owner_hash=? AND (created_at>? OR (created_at=? AND id>?))
 ORDER BY created_at ASC,id ASC LIMIT ?`;
 const {results=[]}=await db.prepare(query).bind(ownerHash,cursor.createdAt,cursor.createdAt,cursor.id,limit).all();
 // A short/empty page closes the cycle, then the next tick starts at the beginning.
 const full=results.length<limit;
 if(full)cursor={createdAt:-1,id:''};
 else {const end=results.at(-1);cursor={createdAt:Number(end.created_at),id:String(end.id)};}
 await store.put(CURSOR,cursor);
 const counts={},projects=new Set(),sample=[];let jobs=0;
 for(const row of results){
  let body;try{body=JSON.parse(row.context_json||'{}')}catch{counts.invalid_context=(counts.invalid_context||0)+1;continue;}
  if(body?.kind!=='robot-directions'||!Array.isArray(body.color_jobs))continue;
  if(/^www-infinity4\/[A-Za-z0-9_.-]+$/.test(row.repository||''))projects.add(row.repository);
  for(const job of body.color_jobs.slice(0,32)){
   const kind=workBucket(job,body.color_jobs);jobs++;counts[kind]=(counts[kind]||0)+1;
   if(sample.length<4&&['queued_for_existing_runner','commit_needs_verification','deployment_needs_verification'].includes(kind))
    sample.push({ticketId:row.id,jobId:String(job.id||'').slice(0,32),stage:kind});
  }
 }
 const previous=await store.get(STATE)||{};
 const aggregate=previous.currentCycle||{tickets:0,jobs:0,counts:{},projects:[]};
 aggregate.tickets+=results.length;aggregate.jobs+=jobs;
 for(const [k,n] of Object.entries(counts))aggregate.counts[k]=(aggregate.counts[k]||0)+n;
 aggregate.projects=[...new Set([...(aggregate.projects||[]),...projects])].slice(0,25);
 const batch={when:now,tickets:results.length,jobs,counts,projects:[...projects].slice(0,12),nextCursor:cursor,sample,
  executionVerified:false,runnerDispatchRequested:false};
 const state={when:now,cycleComplete:full,cycles:(previous.cycles||0)+(full?1:0),lastBatch:batch,
  currentCycle:full?{tickets:0,jobs:0,counts:{},projects:[]}:aggregate,
  lastComplete:full?aggregate:previous.lastComplete||null};
 await store.put(STATE,state);
 return {ok:true,...batch,cycleComplete:full,completedCycle:full?aggregate:null};
}
