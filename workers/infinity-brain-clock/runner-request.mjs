/* A spoken owner request is an authenticated DISPATCH REQUEST, not a runner
 * lease or permission to replay blocked/sensitive work. Keep this gate in
 * the Worker, not in the Android microphone or the chat model. */
import {eligibleForRetry} from './alarm-retry.mjs';

const ownerBlock=/owner_input_required|owner_authorization_required|owner_approval_required|requires_owner|permission_denied|security_hold|sensitive_decision|unsupported_repository|invalid_color_jobs/i;
export function checkOwnerRunnerRequest(job,{now=Date.now(),prior={},lease={},retry={},deps=[]}={}){
 if(!job?.id||!/^www-infinity4\/[A-Za-z0-9_.-]+$/.test(String(job.repository||''))||!String(job.instructions||'').trim())
  return {eligible:false,reason:'invalid_job_scope'};
 if(ownerBlock.test(String(job.progress?.blocker||''))||ownerBlock.test(String(job.progress?.summary||'')))
  return {eligible:false,reason:'owner_decision_required'};
 return eligibleForRetry(job,{now,prior,lease,retry,deps});
}
export function runnerDispatchReceipt(dispatch){
 const state=dispatch?.status;
 if(state==='scheduled_fallback')return {status:'awaiting_repository_runner',reason:String(dispatch.error||'runner_unavailable').slice(0,160)};
 if(state==='dispatch_accepted'||state==='workflow_dispatched'||state==='dispatched')
  return {status:'queued_for_runner',reason:'dispatch_accepted_execution_unverified'};
 if(dispatch?.ok===false||state==='blocked'||state==='failed')return {status:'runner_dispatch_failed',reason:String(dispatch?.error||'dispatch_failed').slice(0,160)};
 // Never call an unexpected transport reply a successful dispatch.
 return {status:'runner_dispatch_unverified',reason:'runner_dispatch_receipt_missing'};
}

/**
 * Helper to perform authenticated GitHub API requests.
 * Reads the GITHUB_TOKEN from the environment and attaches it as a Bearer token.
 * If the token is missing, logs an error but still proceeds with the request
 * (allowing downstream handling of unauthenticated failures).
 */
export async function makeGitHubRequest(url, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN is missing; GitHub requests may fail authentication.');
  }
  const headers = {
    ...(options.headers || {}),
    Authorization: token ? `Bearer ${token}` : undefined,
  };
  // Remove undefined Authorization header if token missing
  if (!token) delete headers.Authorization;
  return fetch(url, { ...options, headers });
}
