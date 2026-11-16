/* A spoken owner request is an authenticated DISPATCH REQUEST, not a runner
 * lease or permission to replay blocked/sensitive work. Keep this gate in
 * the Worker, not in the Android microphone or the chat model. */
import {eligibleForRetry} from './alarm-retry.mjs';
import {technicalSourceEvidenceNeeded} from './ticket-selector.mjs';

// The five-day bridge may enqueue source work, never impersonate a wallet,
// approve blocked jobs, release production, or obtain a writer lease.
export async function submitApprovedBridgeWork({request,claims,body,submit,dispatch,fetcher=fetch}) {
  if(!body||Object.keys(body).some(k=>!['repository','request'].includes(k))||
    !['www-infinity4/QuantaPhi','www-infinity4/RecordB'].includes(body.repository)||
    typeof body.request!=='string'||!body.request.trim()||body.request.length>1800)
    return {status:400,result:{ok:false,error:'invalid_owner_bridge_work'}};
  // Ask the deployed consent owner on EVERY attempt, including retries.
  // This read cannot renew permission or disclose private conversations.
  const approval=await fetcher('https://bubbles-cloud-browser.marvaseater.workers.dev/v1/browser/chatgpt/runner',{
    method:'POST',headers:{Authorization:request.headers.get('Authorization'),'Content-Type':'application/json'},
    body:JSON.stringify({operation:'status'}),signal:AbortSignal.timeout(15000)});
  const proof=await approval.json().catch(()=>({}));
  if(!approval.ok||proof.ok!==true||proof.jobId!=='chatgpt_runner_'+claims.run_id)
    return {status:403,result:{ok:false,error:'owner_bridge_approval_unavailable'}};
  const text=body.request.trim(),repository=body.repository;
  const saved=await submit({start_immediately:true,source_app:'Bubbles approved GPT work bridge',
    source_url:'https://github.com/www-infinity4/Moltnook/actions/runs/'+claims.run_id,
    title:text.slice(0,120),request:text,repository,context:{kind:'robot-directions',
      submission_id:'gpt-owner-work-'+claims.run_id,repositories:[repository],approval:'existing-five-day-bridge',
      color_jobs:[{id:'TASK-1',agent:'greenbeans',executor:'repository-engine',repository,
        title:'Implement owner repair with independent review',instructions:text,dependencies:[],
        acceptance:['Reproduce the assigned source failure and implement a bounded repair.',
          'Pass relevant regression tests and independent Pink/GPT Purple review before publishing a PR.',
          'Report actual commit, test and PR receipts; keep production and Android hardware acceptance separate.']}]
    }});
  if(!saved.result?.ok||!saved.result.ticket?.id) return saved;
  const ticket=saved.result.ticket;
  if(ticket.request!==text||ticket.repository!==repository)
    return {status:409,result:{ok:false,error:'owner_bridge_run_conflict'}};
  let execution={status:'scheduled_fallback'};
  // A retry does not revive blocked work or redispatch an existing ticket.
  if(saved.result.startRequested)try{execution=await dispatch(ticket.id);}catch{}
  // The Brain already returns an admission reason. Preserve safe machine-readable
  // reason codes so the owner bridge does not reduce a concrete blocker to
  // "job_not_dispatchable". Never forward arbitrary upstream text or secrets.
  const receipt={status:execution?.status||'unverified'};
  if(typeof execution?.reason==='string'&&/^[a-z][a-z0-9_]{0,79}$/.test(execution.reason))
    receipt.reason=execution.reason;
  return {status:200,result:{ok:true,ticketId:ticket.id,repository,status:ticket.status,
    deduplicated:saved.result.deduplicated===true,execution:receipt,
    completed:false,productionVerified:false}};
}

const ownerBlock = /owner_input_required|owner_authorization_required|owner_approval_required|requires_owner|permission_denied|security_hold|sensitive_decision|unsupported_repository|invalid_color_jobs/i;

/**
 * Validate that a job is eligible to be processed by the runner.
 * Returns an object with `eligible` boolean and a `reason` string.
 */
export function checkOwnerRunnerRequest(
  job,
  { now = Date.now(), prior = {}, lease = {}, retry = {}, deps = [] } = {}
) {
  if (!job?.id || !/^www-infinity4\/[A-Za-z0-9_.-]+$/.test(String(job.repository || '')) || !String(job.instructions || '').trim()) {
    return { eligible: false, reason: 'invalid_job_scope' };
  }
  const blockerText=[job.progress?.blocker,job.progress?.summary,job.progress?.next].filter(v=>typeof v==='string').join(' ');
  if (ownerBlock.test(blockerText)) {
    return { eligible: false, reason: technicalSourceEvidenceNeeded(blockerText)?
      'technical_source_evidence_required':'owner_decision_required' };
  }
  return eligibleForRetry(job, { now, prior, lease, retry, deps });
}

/**
 * Produce a human‑readable receipt for a runner dispatch response.
 */
export function runnerDispatchReceipt(dispatch) {
  const state = dispatch?.status;
  if (state === 'scheduled_fallback')
    return { status: 'awaiting_repository_runner', reason: String(dispatch.error || 'runner_unavailable').slice(0, 160) };
  if (state === 'dispatch_accepted' || state === 'workflow_dispatched' || state === 'dispatched')
    return { status: 'queued_for_runner', reason: 'dispatch_accepted_execution_unverified' };
  if (dispatch?.ok === false || state === 'blocked' || state === 'failed')
    return { status: 'runner_dispatch_failed', reason: String(dispatch?.error || 'dispatch_failed').slice(0, 160) };
  // Unexpected reply – treat as unverified.
  return { status: 'runner_dispatch_unverified', reason: 'runner_dispatch_receipt_missing' };
}

/**
 * Safely extract the OIDC token from a request and forward it to the brain endpoint.
 * If `env.BRAIN` is undefined, a deterministic fallback URL is used (no network call).
 * The function returns an object describing the forwarding intent – callers can decide
 * whether to actually perform the fetch.
 */
export function prepareBrainForward(request, env = {}) {
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer /, '');
  if (!token) {
    console.error('prepareBrainForward: missing Authorization token');
    return { error: 'missing_token' };
  }
  const brainUrl = env.BRAIN ?? 'https://fallback-brain.invalid/forward';
  // Do **not** perform a fetch here – the caller may run in a sandbox without network.
  return { token, brainUrl };
}
