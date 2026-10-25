/* Owner-scoped "*" continuation for Bubbles web and Android's shared WebView.
 * Memory/audit is retrieval evidence, never permission to create a new ticket.
 * Brain's authenticated runner and its existing lease/approval/receipt gates own writes.
 */
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]+$/;
const ID=/^IW-\d{8}-[A-F0-9-]{8}$/i,JOB=/^TASK-\d+$/;
const FINISHED=new Set(['complete','deployed_verified','superseded']);
const DEPENDENCY_DONE=new Set(['complete','deployed_verified','merged_verified']);
const DENIAL=/owner_input_required|owner_authorization_required|owner_approval_required|security_hold|permission_denied|password|secret|credential|wallet|payment|biometric|consent_required|account_connection_required/i;
const VERIFY=/commit_verification_required|deployment_not_verified|deployed_unverified|merge_verification_required/i;
const bounded=n=>Number.isFinite(n)?Math.max(1,Math.min(8,Math.trunc(n))):8;
export function isStarContinuation(value){return typeof value==='string'&&value.trim()==='*';}
const time=v=>Number.isFinite(Number(v))?Number(v):Date.parse(v||'')||0;
function jobStage(job,jobs,now){
 const status=String(job?.status||'');
 if(FINISHED.has(status))return 'finished';
 const progress=job?.progress||{};
 const hints=[progress.blocker,progress.summary,progress.next].map(String).join(' ');
 if(progress.commitSha||VERIFY.test(hints)||status==='committed_unverified'||status==='merged_verified')return 'verify_receipt';
 if(DENIAL.test(hints))return 'owner_or_security_hold';
 if(!['queued','ready','working','blocked'].includes(status))return 'not_ready';
 const dependencies=Array.isArray(job.dependencies)?job.dependencies:[];
 if(dependencies.some(id=>!jobs.some(other=>other.id===id&&DEPENDENCY_DONE.has(other.status))))return 'dependencies';
 const started=time(progress.attemptedAt||progress.claimedAt);
 if(status==='working'&&started>now-40*60*1000)return 'already_running';
 if(status==='blocked'&&!/runner_lease_expired|runner_stopped|runner_timeout|timeout|temporary|retry|network|queued|awaiting_repository_runner|runner_dispatch_failed/i.test(hints))return 'blocked_needs_review';
 return 'dispatch_eligible';
}
export function selectContinuation(tickets,{maxSlots=8,now=Date.now()}={}){
 const slots=[],counts={};
 const rows=(Array.isArray(tickets)?tickets:[]).filter(ticket=>
  ID.test(ticket?.id||'')&&REPO.test(ticket?.repository||'')&&
  ticket?.context?.kind==='robot-directions'&&
  ['ready','working','blocked'].includes(ticket.status)&&Array.isArray(ticket.context.color_jobs))
  .sort((a,b)=>time(b.updated_at||b.created_at)-time(a.updated_at||a.created_at)||String(b.id).localeCompare(String(a.id)));
 const seen=new Set();
 for(const ticket of rows){
  for(const job of ticket.context.color_jobs){
   if(!JOB.test(job?.id||'')||job.repository!==ticket.repository||typeof job.instructions!=='string'||!job.instructions.trim())continue;
   const stage=jobStage(job,ticket.context.color_jobs,now);
   if(stage==='finished')continue;
   counts[stage]=(counts[stage]||0)+1;
   // One slot per repository. Independent projects can be inspected separately,
   // but this selector never dispatches simultaneous writes.
   if(slots.length<bounded(maxSlots)&&!seen.has(ticket.repository)){
    seen.add(ticket.repository);slots.push({ticketId:ticket.id,jobId:job.id,repository:ticket.repository,stage});
   }
  }
 }
 const target=slots.find(x=>x.stage==='dispatch_eligible')||
  rows.flatMap(ticket=>ticket.context.color_jobs.filter(job=>
   JOB.test(job?.id||'')&&job.repository===ticket.repository&&
   jobStage(job,ticket.context.color_jobs,now)==='dispatch_eligible').map(job=>({ticketId:ticket.id,jobId:job.id,repository:ticket.repository,stage:'dispatch_eligible'})))[0]||null;
 return {scanned:rows.length,slots,counts,target,maximum:bounded(maxSlots),dispatchBudget:1};
}
export async function continueSavedWork({fetcher,ownerHeaders,base,now=Date.now(),maxSlots=8}){
 if(typeof fetcher!=='function'||typeof ownerHeaders!=='function'||!/^https:\/\//.test(base||''))throw Error('continuation_adapter_invalid');
 const headers=await ownerHeaders();
 if(!headers?.Authorization)throw Error('owner_authorization_required');
 const call=async(path,body,limit)=>{
  const response=await fetcher(base+path,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'},limit);
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data.ok!==true)throw Error(data.error||'owner_continuation_unavailable');
  return data;
 };
 let archive={checked:false,error:'archive_unavailable'};
 try{
  const audit=await call('/owner/conversation',{mode:'work-audit-reconcile',limit:150,pages:4},20000);
  archive={checked:true,messagesScanned:audit.messagesScanned||0,
   ticketInventoryTruncated:audit.ticketInventoryTruncated===true,
   unmatched:(audit.candidates||[]).filter(c=>!Array.isArray(c.linkedTickets)||c.linkedTickets.length===0).length,
   readOnly:true};
 }catch(error){archive={checked:false,error:String(error.message||error).slice(0,100)}}
 const inventory=await call('/work/tickets/list',{},15000);
 const selected=selectContinuation(inventory.tickets,{now,maxSlots});
 if(!selected.target)return {ok:true,selected,archive,dispatch:null,executionVerified:false};
 // One real signed GitHub runner request, with its exact existing ticket/job.
 // Never authorize work from imported conversation text or a guessed repository.
 const dispatch=await call('/work/run-next',{ticketId:selected.target.ticketId,jobId:selected.target.jobId},18000);
 return {ok:true,selected,archive,dispatch,executionVerified:false};
}
export function continuationReply(result){
 const selection=result?.selected;
 if(!result?.ok||!selection)return 'Continuation could not verify owner work. Nothing was started.';
 const n=selection.slots.length,unfinished=Object.values(selection.counts).reduce((a,b)=>a+b,0);
 const summary='Checked saved owner work: '+unfinished+' unfinished job stages across '+selection.scanned+' tickets; '+n+' project slots available (maximum '+selection.maximum+').';
 if(!result.archive?.checked)return summary+' Conversation archive was unavailable; no missing request was invented. '+dispatchSummary(result.dispatch);
 return summary+' Earlier conversations were checked read-only. '+dispatchSummary(result.dispatch);
}
function dispatchSummary(value){
 if(!value)return 'No eligible existing job was dispatched. Previously blocked or unverified work remains flagged.';
 if(value.status==='queued_for_runner')return 'Runner requested. GitHub execution has not been confirmed yet; code changes and completion require verified receipts.';
 if(value.status==='job_not_dispatchable'||value.status==='no_pending_jobs')return 'Blocked: the runner did not accept a job ('+String(value.reason||value.status).replace(/_/g,' ').slice(0,110)+'). No completion claimed.';
 return 'Runner response: '+String(value.status||'unconfirmed').replace(/_/g,' ').slice(0,100)+'. A dispatch is not a finished build.';
}
