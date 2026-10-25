/* Continuity v1: owner-partitioned read-only recovery projection.
 * Existing Brain work_tickets and runner receipts remain authoritative.
 * This file grants no new owner permissions or tool execution rights.
 */
const OWNER=/^[a-f0-9]{64}$/;
const TICKET=/^IW-\d{8}-[0-9A-F-]{8}$/;
const RUN=/^https:\/\/github\.com\/www-infinity4\/[\w.-]+\/actions\/runs\/\d+$/;
const SHA=/^[a-f0-9]{40}$/;
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]+$/;
const DONE=new Set(['complete','deployed_verified']);
const REQUIRES_REVIEW=/owner_approval|consent|permission_denied|security_hold|requires_owner|payment|wallet|secret|credential|oauth/i;
const summary=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,220);
const n=v=>Number.isFinite(Number(v))?Number(v):0;
const iso=value=>Number.isFinite(Date.parse(value||''))?new Date(value).toISOString():null;

export function classifyContinuityJob(job,now=Date.now()){
 const status=String(job?.status||'unknown');
 const progress=job?.progress&&typeof job.progress==='object'?job.progress:{};
 const blocker=summary(progress.blocker),runUrl=RUN.test(progress.runUrl||'')?progress.runUrl:null;
 const commitSha=SHA.test(progress.commitSha||'')?progress.commitSha:null;
 const recorded=progress.testsPassed===true&&progress.browserPassed===true&&
  progress.deployedFilesMatched===true&&Boolean(runUrl&&commitSha);
 const approvalNeeded=REQUIRES_REVIEW.test(blocker+' '+summary(progress.summary));
 const lastAttempt=iso(progress.attemptedAt||progress.claimedAt);
 let phase='needs_inspection',next='Inspect repository source and acceptance conditions';
 if(DONE.has(status)){
  phase=recorded?'verified_delivery':'completion_needs_receipts';
  next=recorded?'Retain completion evidence and checkpoint':'Verify CI, deployed bytes and real browser/device behavior';
 }else if(status==='committed_unverified'||status==='merged_verified'){
  phase='awaiting_deployment_proof';next='Verify merge, production deployment and acceptance behavior';
 }else if(status==='working'){
  const started=Date.parse(lastAttempt||'');
  phase=Number.isFinite(started)&&now-started>20*60000?'stale_working':'working';
  next=phase==='stale_working'?'Reconcile active runner lease and latest receipt before retry':'Read runner progress and receipts';
 }else if(status==='blocked'){
  phase=approvalNeeded?'owner_decision_required':'blocked_recoverable';
  next=approvalNeeded?'Respect existing owner/security authorization; show the exact blocker':'Inspect blocker and resume through existing signed runner';
 }else if(status==='ready'||status==='queued'){
  phase='ready_to_dispatch';next='Use existing authenticated Brain runner';
 }else if(status==='failed'){
  phase='failed_recoverable';next='Inspect failure receipt and bounded retry policy';
 }else if(status==='draft'){
  phase='draft';next='Check prerequisites before owner-authorized execution';
 }
 const required=[];
 if(DONE.has(status)&&!progress.testsPassed)required.push('tests');
 if(DONE.has(status)&&!progress.browserPassed)required.push('live_acceptance');
 if(DONE.has(status)&&!progress.deployedFilesMatched)required.push('deployment_readback');
 if(DONE.has(status)&&!runUrl)required.push('workflow_run');
 if(DONE.has(status)&&!commitSha)required.push('commit');
 return {status,phase,next,blocker:blocker||null,approvalRequired:approvalNeeded,runUrl,
  commitSha,lastAttempt,missingEvidence:required,verifiedDelivery:phase==='verified_delivery'};
}

export function projectContinuity(rows,{now=Date.now(),limit=100,hasMore=false}={}){
 if(!Array.isArray(rows))throw TypeError('continuity_rows_required');
 const projects=new Map(),items=[];
 for(const row of rows.slice(0,limit)){
  if(!TICKET.test(row?.id||'')||!REPO.test(row.repository||''))continue;
  let context={};try{context=JSON.parse(row.context_json||'{}')}catch{}
  const jobs=Array.isArray(context.color_jobs)?context.color_jobs:[];
  const states=jobs.filter(j=>j&&typeof j==='object'&&typeof j.id==='string')
   .slice(0,24).map(j=>({jobId:j.id,repository:REPO.test(j.repository||'')?j.repository:row.repository,
    ...classifyContinuityJob(j,now)}));
  if(!states.length)states.push({jobId:null,repository:row.repository,
   ...classifyContinuityJob({status:row.status,progress:{}},now)});
  const item={ticketId:row.id,repository:row.repository,
   title:summary(row.title||row.request).slice(0,120),updatedAt:n(row.updated_at),jobs:states};
  items.push(item);
  if(!projects.has(row.repository))projects.set(row.repository,{repository:row.repository,tickets:0,jobs:0,verified:0,needsAttention:0});
  const p=projects.get(row.repository);p.tickets++;p.jobs+=states.length;
  for(const state of states){if(state.verifiedDelivery)p.verified++;
   else if(state.phase!=='working')p.needsAttention++;}
 }
 const priority={owner_decision_required:0,stale_working:1,blocked_recoverable:2,
  completion_needs_receipts:3,awaiting_deployment_proof:4,ready_to_dispatch:5,
  failed_recoverable:6,needs_inspection:7,draft:8,working:9,verified_delivery:10};
 const attention=items.flatMap(item=>item.jobs.filter(j=>j.phase!=='verified_delivery').map(j=>({
  ticketId:item.ticketId,repository:item.repository,title:item.title,jobId:j.jobId,
  phase:j.phase,next:j.next,approvalRequired:j.approvalRequired,runUrl:j.runUrl})))
  .sort((a,b)=>(priority[a.phase]??99)-(priority[b.phase]??99)).slice(0,30);
 return {ok:true,service:'Continuity',version:1,readOnly:true,ownerScoped:true,
  checkedAt:new Date(now).toISOString(),projects:[...projects.values()],tickets:items,attention,
  hasMore,notACompletionReceipt:true,executionStarted:false};
}

export async function ownerContinuitySnapshot(db,owner,body={}){
 if(!OWNER.test(owner||''))return {status:503,result:{ok:false,error:'verified_owner_partition_required'}};
 if(!body||typeof body!=='object'||Array.isArray(body))
  return {status:400,result:{ok:false,error:'invalid_continuity_request'}};
 const limit=Math.min(100,Math.max(1,Number.isInteger(body.limit)?body.limit:100));
 const at=body.beforeUpdatedAt,id=body.beforeId;
 if(at!==undefined&&(!Number.isSafeInteger(at)||at<0||typeof id!=='string'||!TICKET.test(id)))
  return {status:400,result:{ok:false,error:'invalid_continuity_cursor'}};
 if(at===undefined&&id!==undefined)return {status:400,result:{ok:false,error:'invalid_continuity_cursor'}};
 const sql=at===undefined?
  'SELECT id,title,request,repository,status,context_json,updated_at FROM work_tickets WHERE owner_hash=? ORDER BY updated_at DESC,id DESC LIMIT ?':
  'SELECT id,title,request,repository,status,context_json,updated_at FROM work_tickets WHERE owner_hash=? AND (updated_at<? OR (updated_at=? AND id<?)) ORDER BY updated_at DESC,id DESC LIMIT ?';
 const stmt=db.prepare(sql);
 const response=at===undefined?await stmt.bind(owner,limit+1).all():await stmt.bind(owner,at,at,id,limit+1).all();
 const rows=response.results||[],page=rows.slice(0,limit),hasMore=rows.length>limit;
 const projected=projectContinuity(page,{hasMore,limit});
 projected.nextCursor=hasMore&&page.length?{beforeUpdatedAt:page.at(-1).updated_at,beforeId:page.at(-1).id}:null;
 projected.inventoryCoverage=hasMore?'partial_page_more_available':'page_finished';
 return {status:200,result:projected};
}
