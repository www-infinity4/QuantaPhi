/*
 * Bounded Robot Brain admission policy. This is a scheduling view, NOT a
 * mutation of tickets or permission to bypass the signed runner gates.
 * Old jobs and their receipts remain in D1 and owner history.
 */
export const MAXIMUM_BACKGROUND_AGE_DAYS=7;
const DAY=86400000;
const NO_SPECS=/\b(?:must|needs?|required|lacks?|without)\b.{0,100}\b(?:specify|provide|supply|identify|define|concrete|exact|full)\b|\b(?:specify|provide|supply)\b.{0,100}\b(?:file|schema|signature|requirement|path|details?)\b|(?:unspecified|underspecified|missing actionable|unknown export signatures)/i;
const OWNER_BLOCK=/owner_input_required|owner_authorization_required|owner_approval_required|requires_owner|permission_denied|security_hold|sensitive_decision|unsupported_repository|invalid_color_jobs/i;
// A missing immutable edit path is a source-evidence problem, not a request
// for the owner to decide or grant access. Keep it INELIGIBLE until the
// authenticated runner provides exact source evidence; never revive a job.
const IMMUTABLE_PATH_EVIDENCE=/(?:edit must match immutable source exactly once|failure report does not specify which repository file|exact path is required to locate the immutable.source)/i;
const OWNER_CHOICE_OR_SECURITY=/(?:owner_authorization_required|owner_approval_required|requires_owner|permission_denied|security_hold|sensitive_decision|unsupported_repository|invalid_color_jobs|owner must (?:approve|choose|authorize)|owner (?:approval|consent|sign.in)|new permission|payment|purchase|wallet|biometric|credential|password)/i;
export function technicalSourceEvidenceNeeded(summary){
 const text=String(summary||'').slice(0,3000);
 return /owner_input_required/i.test(text)&&IMMUTABLE_PATH_EVIDENCE.test(text)&&
  !OWNER_CHOICE_OR_SECURITY.test(text);
}
const toMillis=value=>{
 if(typeof value==='number'&&Number.isFinite(value))return value<1e11?value*1000:value;
 if(typeof value!=='string'||!value.trim())return NaN;
 const number=Date.parse(value);
 return Number.isFinite(number)?number:NaN;
};
export function ticketAdmission(candidate,{
 now=Date.now(),maximumAgeDays=MAXIMUM_BACKGROUND_AGE_DAYS,requested=null
}={}){
 const ticket=candidate?.ticket,job=candidate?.job;
 if(!ticket?.id||!job?.id)return {eligible:false,reason:'invalid_ticket_candidate'};
 const selected=ticket.id===requested?.ticketId&&(!requested?.jobId||job.id===requested.jobId);
 const summary=[job.progress?.summary,job.progress?.blocker,job.progress?.next]
  .filter(v=>typeof v==='string').join(' ');
 // An owner-selected job may jump the aging queue, but an owner decision
 // or security hold must be explicitly resolved through its own auth gate.
 // A model's self-asserted hasActionableSpecs cannot override a blocker.
 if(job.status==='blocked'&&(OWNER_BLOCK.test(summary)||job.hasActionableSpecs===false&&NO_SPECS.test(summary))){
  return {eligible:false,reason:OWNER_BLOCK.test(summary)?(technicalSourceEvidenceNeeded(summary)?'technical_source_evidence_required':'owner_decision_required'):'actionable_specs_required',selected};
 }
 if(job.status==='blocked'&&NO_SPECS.test(summary)){
  return {eligible:false,reason:'actionable_specs_required',selected};
 }
 const days=Number.isFinite(maximumAgeDays)?Math.max(1,Math.min(30,maximumAgeDays)):MAXIMUM_BACKGROUND_AGE_DAYS;
 const born=toMillis(ticket.created_at??ticket.createdAt);
 const approved=toMillis(job.progress?.ownerApprovedAt);
 const cutoff=now-days*DAY;
 // A new authenticated owner approval revives an older ordinary job, but
 // attemptedAt/updated_at/claimedAt NEVER reset aging on failed retries.
 const freshOwnerApproval=Number.isFinite(approved)&&approved<=now&&approved>=cutoff;
 // A blocked legacy ticket that was REBUILT from verified immutable source
 // evidence may re-enter the queue, even if the original request is old.
 // This is not owner approval and never bypasses dependency/security gates.
 const recovered=job.progress?.deferredRecovery;
 const verifiedAt=toMillis(recovered?.verifiedAt);
 const sourceRecovered=job.status==='queued'&&
  recovered?.status==='requeued_for_verified_source_build'&&
  /^[a-f0-9]{40}$/.test(recovered?.pinnedCommit||'')&&
  Array.isArray(recovered?.sourceReceipts)&&recovered.sourceReceipts.length>=2&&
  recovered.sourceReceipts.every(x=>/^[a-f0-9]{64}$/.test(x.sha256||''))&&
  Number.isFinite(verifiedAt)&&verifiedAt<=now&&verifiedAt>=cutoff;
 if(!selected&&Number.isFinite(born)&&born<cutoff&&!freshOwnerApproval&&!sourceRecovered){
  return {eligible:false,reason:'background_ticket_aged_out',selected:false,ageDays:Math.floor((now-born)/DAY)};
 }
 return {eligible:true,reason:selected?'owner_selected':'background_eligible',selected};
}
export function filterActiveTickets(candidates,{
 now=Date.now(),maximumAgeDays=MAXIMUM_BACKGROUND_AGE_DAYS,requested=null,maxLookAhead=500
}={}){
 const allowed=[],selected=[],prerequisites=[],deferred=[];
 const limit=Number.isInteger(maxLookAhead)?Math.max(1,Math.min(500,maxLookAhead)):500;
 const examined=(Array.isArray(candidates)?candidates:[]).slice(0,limit);
 // A signed owner request to finish a specific old job must also be able to
 // execute the SAME ticket's SAME repository prerequisite stages. Otherwise
 // the selected parent remains stuck behind its old, aged-out dependencies.
 // This is age-selection only: each predecessor still goes through all
 // owner/security, repository, retry, lease and source-review gates.
 const root=requested?.ticketId&&requested?.jobId
  ?examined.find(c=>c.ticket?.id===requested.ticketId&&c.job?.id===requested.jobId):null;
 const selectedDependencies=new Set();
 if(root&&ticketAdmission(root,{now,maximumAgeDays,requested}).eligible){
  const sameScope=new Map(examined.filter(c=>c.ticket?.id===root.ticket.id&&
   c.job?.repository===root.job.repository&&typeof c.job?.id==='string').map(c=>[c.job.id,c]));
  const pending=Array.isArray(root.job.dependencies)?[...root.job.dependencies]:[];
  const seen=new Set([root.job.id]);
  while(pending.length&&seen.size<16){
   const id=pending.shift();
   if(typeof id!=='string'||seen.has(id))continue;
   const dependency=sameScope.get(id);
   if(!dependency)continue; // Cross-repository or missing dependencies cannot be auto-selected.
   seen.add(id);
   selectedDependencies.add(id);
   if(Array.isArray(dependency.job.dependencies))pending.push(...dependency.job.dependencies);
  }
 }
 for(const candidate of examined){
  const selectedDependency=candidate?.ticket?.id===requested?.ticketId&&
   selectedDependencies.has(candidate?.job?.id)&&candidate?.job?.repository===root?.job?.repository;
  const admission=ticketAdmission(candidate,{now,maximumAgeDays,
   requested:selectedDependency?{ticketId:requested.ticketId,jobId:candidate.job.id}:requested});
  if(admission.eligible){
   if(candidate===root)selected.push(candidate);
   else if(selectedDependency)prerequisites.push(candidate);
   else allowed.push(candidate);
  }
  else deferred.push({ticketId:candidate?.ticket?.id||'',jobId:candidate?.job?.id||'',reason:admission.reason});
 }
 return {allowed:[...selected,...prerequisites,...allowed],deferred,examined:examined.length,selectedDependencies};
}
