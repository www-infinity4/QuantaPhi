/* Browser-safe fallback for Continuity while owner-only Brain snapshot endpoint is staged.
 * Existing /work/tickets/list returns no more than 100 records. Do not promise
 * a complete inventory from this bounded legacy route.
 */
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]+$/;
const SHA=/^[a-f0-9]{40}$/;
const RUN=/^https:\/\/github\.com\/www-infinity4\/[\w.-]+\/actions\/runs\/[1-9]\d*$/;
const OWNER_DECISION=/owner_approval|consent|permission_denied|security_hold|requires_owner|payment|wallet|secret|credential|oauth/i;
const finished=new Set(['complete','deployed_verified']);
const txt=x=>typeof x==='string'?x.replace(/\s+/g,' ').slice(0,220):'';
const date=x=>typeof x==='string'&&Number.isFinite(Date.parse(x))?x:null;

export function projectLegacyJob(job,now=Date.now()){
 const status=txt(job?.status)||'unknown';
 const p=job?.progress&&typeof job.progress==='object'?job.progress:{};
 const blocker=txt(p.blocker);
 const runUrl=RUN.test(p.runUrl||'')?p.runUrl:null;
 const commitSha=SHA.test(p.commitSha||'')?p.commitSha:null;
 const lastAttempt=date(p.attemptedAt||p.claimedAt);
 const approvalRequired=OWNER_DECISION.test(blocker+' '+txt(p.summary));
 const verifiedDelivery=finished.has(status)&&Boolean(commitSha&&runUrl&&p.testsPassed===true&&p.browserPassed===true&&p.deployedFilesMatched===true);
 let phase='needs_inspection',next='Inspect the saved repository job and acceptance criteria';
 if(finished.has(status)){
  phase=verifiedDelivery?'verified_delivery':'completion_needs_receipts';
  next=verifiedDelivery?'Retain the existing receipts':'Verify the commit, CI and deployed behavior independently';
 }else if(['committed_unverified','merged_verified'].includes(status)){
  phase='awaiting_deployment_proof';next='Verify production deployment and browser or device behavior';
 }else if(status==='working'){
  phase=lastAttempt&&now-Date.parse(lastAttempt)>1200000?'stale_working':'working';
  next=phase==='stale_working'?'Reconcile existing runner lease before retry':'Read existing runner progress';
 }else if(status==='blocked'){
  phase=approvalRequired?'owner_decision_required':'blocked_recoverable';
  next=approvalRequired?'Respect original owner authorization and security controls':'Inspect saved blocker and resume through existing signed runner';
 }else if(status==='ready'||status==='queued'){
  phase='ready_to_dispatch';next='Use the existing authorized Robot Brain runner';
 }else if(status==='failed'){
  phase='failed_recoverable';next='Inspect failure receipt and bounded retry policy';
 }else if(status==='draft'){
  phase='draft';next='Inspect prerequisites and authorization';
 }
 const missingEvidence=[];
 if(finished.has(status)&&!p.testsPassed)missingEvidence.push('tests');
 if(finished.has(status)&&!p.browserPassed)missingEvidence.push('live acceptance');
 if(finished.has(status)&&!p.deployedFilesMatched)missingEvidence.push('deployment readback');
 if(finished.has(status)&&!commitSha)missingEvidence.push('commit');
 if(finished.has(status)&&!runUrl)missingEvidence.push('workflow run');
 return {jobId:typeof job?.id==='string'?job.id:null,status,phase,next,blocker,
  runUrl,commitSha,lastAttempt,approvalRequired,verifiedDelivery,missingEvidence};
}

export function projectLegacyTickets(saved,now=Date.now()){
 if(!Array.isArray(saved))throw Error('Saved work response is missing.');
 const tickets=[];
 for(const t of saved.slice(0,100)){
  if(!/^IW-\d{8}-[0-9A-F-]{8}$/.test(t?.id||'')||!REPO.test(t.repository||''))continue;
  const jobs=Array.isArray(t.context?.color_jobs)?t.context.color_jobs:[];
  const states=jobs.filter(j=>j&&typeof j==='object').slice(0,24).map(j=>projectLegacyJob(j,now));
  if(!states.length)states.push(projectLegacyJob({status:t.status},now));
  tickets.push({ticketId:t.id,repository:t.repository,title:txt(t.title||t.request).slice(0,120),
   updatedAt:Number(t.updated_at)||0,jobs:states});
 }
 return {ok:true,service:'Continuity',source:'legacy_owner_ticket_list',tickets,
  hasMore:false,nextCursor:null,inventoryCoverage:saved.length>=100?'potentially_truncated_at_100':'complete_legacy_page',
  readOnly:true,executionStarted:false,notACompletionReceipt:true};
}
