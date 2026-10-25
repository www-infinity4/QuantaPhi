/*
 * Bubbles capacity routing: a SERVER-OWNED ticket is the overflow worker.
 * The Android WebView already carries the verified owner session, so it must
 * not hold a GitHub token, spin a clone with fake permissions, or claim commits.
 *
 * A source job may be delegated only when the existing direct adapter
 * explicitly failed before executing ANY operation. An ambiguous timeout,
 * returned tool receipt, commit or workflow dispatch is never safe to replay.
 */
export const AGENT_CATALOG=Object.freeze({
 repository_editor:Object.freeze({
  role:'repository_editor',
  purpose:'Bounded repository repair via Robot Brain Green and independent Pink review',
  capabilities:Object.freeze(['pinned_source_read','reviewed_patch','verified_tests'])
 }),
 workflow_runner:Object.freeze({
  role:'workflow_runner',
  purpose:'Explicit workflow job via the authenticated Brain queue and runner receipts',
  capabilities:Object.freeze(['pinned_workflow','signed_runner','execution_receipt'])
 })
});

const NO_ACTION_ERRORS=new Set([
 'direct_engineer_model_unavailable', // existing Worker returns before any model/tools
 'direct_capacity_reached',          // future capacity contract requires noActionTaken:true
 'direct_runner_capacity_reached'
]);
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]+$/;
const SENSITIVE=/\b(?:password|secret|private[_ -]?key|access[_ -]?token|authorization bypass|disable (?:security|audit)|remove (?:authentication|approval))\b/i;
const EVIDENCED=new Set(['committed_unverified','pull_request_open','dispatch_accepted',
 'working','unconfirmed','completed','deployed_verified','verified']);

export function chooseOverflow({result,operation,repository,request}={}){
 const blocked=(reason)=>({delegate:false,status:'blocked',reason,completed:false});
 if(!REPO.test(repository||'')||typeof request!=='string'||!request.trim()||request.length>4000)
  return blocked('invalid_explicit_owner_target');
 if(SENSITIVE.test(request))return blocked('owner_security_review_required');
 if(!operation||operation.repository!==repository)return blocked('operation_target_mismatch');
 const editor=operation.mode==='write'&&operation.action==='assist';
 const workflow=operation.mode==='actions'&&operation.action==='dispatch_workflow'&&
  /^[A-Za-z0-9_.-]+\.ya?ml$/.test(operation.workflow||'');
 if(!editor&&!workflow)return blocked('operation_not_delegable');
 if(!result||result.ok!==false||result.status!=='blocked'||EVIDENCED.has(result.status))
  return blocked('direct_outcome_not_definitively_unexecuted');
 if(!/^[a-zA-Z0-9-]{8,100}$/.test(result.requestId||''))
  return blocked('direct_receipt_correlation_missing');
 if(!NO_ACTION_ERRORS.has(result.error))return blocked('direct_failure_not_safe_to_retry');
 if((result.error!=='direct_engineer_model_unavailable'&&result.noActionTaken!==true)||
    (result.receipts!==undefined&&(!Array.isArray(result.receipts)||result.receipts.length>0))||
    result.commitSha||result.prUrl||result.runId||
    result.completed===true||result.testsVerified===true||result.deploymentVerified===true)
  return blocked('direct_side_effect_cannot_be_excluded');
 const role=editor?'repository_editor':'workflow_runner';
 return {delegate:true,status:'eligible_for_brain_ticket',role,
  parentRequestId:result.requestId,repository,completed:false,
  reason:'direct_adapter_confirmed_no_execution'};
}
