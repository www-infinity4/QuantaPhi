/* Durable Object alarms are the server-side engine. Android alarms are optional
 * wake hints, never authority to write to repositories or bypass runner receipts. */
export const RETRY_BASE_MS=5*60*1000;
export const RETRY_MAX_MS=60*60*1000;
const FINAL=new Set(['complete','deployed_verified','merged_verified','committed_unverified']);
const acceptable=new Set(['queued','ready','working','blocked']);
export function retryDelay(attempts){
 return Math.min(RETRY_MAX_MS,RETRY_BASE_MS*2**Math.min(5,Math.max(0,Number(attempts||1)-1)));
}
export function eligibleForRetry(job,{now,prior={},lease={},retry={},deps=[]}={}){
 if(!job||!acceptable.has(job.status))return {eligible:false,reason:'not_executable'};
 if(deps.some(x=>!FINAL.has(x.status)))return {eligible:false,reason:'dependency_pending'};
 // An authenticated branch commit or merge is not a reason to push the
 // same patch again. Pink/Moltnook verify integration and deployment separately.
 if(FINAL.has(prior?.status)||FINAL.has(job.status))return {eligible:false,reason:'awaiting_merge_or_complete'};
 if(lease?.leaseUntil>now)return {eligible:false,reason:'runner_lease_active'};
 if(prior?.leaseUntil>now)return {eligible:false,reason:'claimed_by_runner'};
 if(prior?.retryAt>now)return {eligible:false,reason:'runner_backoff'};
 if(retry?.nextAt>now)return {eligible:false,reason:'alarm_backoff'};
 if(job.status==='working'&&job.progress?.runUrl&&job.progress?.attemptedAt){
  const when=Date.parse(job.progress.attemptedAt);
  if(Number.isFinite(when)&&when>now-40*60*1000)return {eligible:false,reason:'recent_runner_receipt'};
 }
 if(job.status==='blocked'&&/permission_denied|owner_authorization_required|unsupported_repository|invalid_color_jobs/i.test(String(job.progress?.blocker||'')))
  return {eligible:false,reason:'permanent_owner_action_required'};
 return {eligible:true,reason:'retry_pending'};
}
export function classifyAlarmDispatch(result){
 if(result?.ok===true&&result.status==='dispatch_accepted')return {state:'dispatched_unverified',reason:'Workflow dispatch accepted; awaiting authenticated claim'};
 if(result?.status==='scheduled_fallback')return {state:'awaiting_repository_runner',reason:String(result.error||'runner_not_dispatched').slice(0,140)};
 if(result?.ok===false||result?.status==='blocked'||result?.status==='failed')
  return {state:'runner_dispatch_failed',reason:String(result.error||'runner_dispatch_failed').slice(0,140)};
 return {state:'queued_unverified',reason:'No authenticated workflow claim'};
}
export function nextRetryState(previous,dispatch,now=Date.now()){
 const attempts=Math.max(0,Number(previous?.attempts||0))+1;
 const diagnosis=classifyAlarmDispatch(dispatch);
 return {attempts,lastAttemptAt:now,nextAt:now+retryDelay(attempts),state:diagnosis.state,
  reason:diagnosis.reason,dispatchAccepted:diagnosis.state==='dispatched_unverified'};
}
