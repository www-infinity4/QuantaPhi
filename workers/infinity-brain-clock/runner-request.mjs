/* A spoken owner request is an authenticated DISPATCH REQUEST, not a runner
 * lease or permission to replay blocked/sensitive work. Keep this gate in
 * the Worker, not in the Android microphone or the chat model. */
import {eligibleForRetry} from './alarm-retry.mjs';

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
  if (ownerBlock.test(String(job.progress?.blocker || '')) || ownerBlock.test(String(job.progress?.summary || ''))) {
    return { eligible: false, reason: 'owner_decision_required' };
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
