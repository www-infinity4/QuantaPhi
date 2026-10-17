/*
 * Bounded Robot Brain admission policy. This is a scheduling view, NOT a
 * mutation of tickets or permission to bypass the signed runner gates.
 * Old jobs and their receipts remain in D1 and owner history.
 */
export const MAXIMUM_BACKGROUND_AGE_DAYS=7;
const DAY=86400000;
const NO_SPECS=/\b(?:must|needs?|required|lacks?|without)\b.{0,100}\b(?:specify|provide|supply|identify|define|concrete|exact|full)\b|\b(?:specify|provide|supply)\b.{0,100}\b(?:file|schema|signature|requirement|path|details?)\b|(?:unspecified|underspecified|missing actionable|unknown export signatures)/i;
const OWNER_BLOCK=/owner_input_required|owner_authorization_required|owner_approval_required|requires_owner|permission_denied|security_hold|sensitive_decision|unsupported_repository|invalid_color_jobs/i;
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
 const selected=ticket.id===requested?.ticketId&&job.id===requested?.jobId;
 const summary=[job.progress?.summary,job.progress?.blocker,job.progress?.next]
  .filter(v=>typeof v==='string').join(' ');
 // An owner-selected job may jump the aging queue, but an owner decision
 // or security hold must be explicitly resolved through its own auth gate.
 // A model's self-asserted hasActionableSpecs cannot override a blocker.
 if(job.status==='blocked'&&(OWNER_BLOCK.test(summary)||job.hasActionableSpecs===false&&NO_SPECS.test(summary))){
  return {eligible:false,reason:OWNER_BLOCK.test(summary)?'owner_decision_required':'actionable_specs_required',selected};
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
 if(!selected&&Number.isFinite(born)&&born<cutoff&&!freshOwnerApproval){
  return {eligible:false,reason:'background_ticket_aged_out',selected:false,ageDays:Math.floor((now-born)/DAY)};
 }
 return {eligible:true,reason:selected?'owner_selected':'background_eligible',selected};
}
export function filterActiveTickets(candidates,{
 now=Date.now(),maximumAgeDays=MAXIMUM_BACKGROUND_AGE_DAYS,requested=null,maxLookAhead=500
}={}){
 const allowed=[],deferred=[];
 const limit=Number.isInteger(maxLookAhead)?Math.max(1,Math.min(500,maxLookAhead)):500;
 for(const candidate of (Array.isArray(candidates)?candidates:[]).slice(0,limit)){
  const admission=ticketAdmission(candidate,{now,maximumAgeDays,requested});
  if(admission.eligible)allowed.push(candidate);
  else deferred.push({ticketId:candidate?.ticket?.id||'',jobId:candidate?.job?.id||'',reason:admission.reason});
 }
 return {allowed,deferred,examined:Math.min(Array.isArray(candidates)?candidates.length:0,limit)};
}
