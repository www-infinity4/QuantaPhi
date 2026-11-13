/* A signed runner may learn WHY it received no lease. These aggregate receipts
 * never include ticket IDs, owner identities, instructions or blocker prose.
 * They do not change eligibility, retries, consent or queue state. */
export const CLAIM_SKIP_REASONS=Object.freeze([
 'source_repair_active','dependency_pending','repository_lease_active',
 'commit_verification_required','publication_reconciliation_required','runner_backoff','recent_runner_receipt',
 'owner_decision_required','claimed_by_runner','d1_update_conflict','other_policy'
]);
export function noteRunnerSkip(counts,reason){
 const key=CLAIM_SKIP_REASONS.includes(reason)?reason:'other_policy';
 counts[key]=Math.min(500,(Number.isSafeInteger(counts[key])&&counts[key]>=0?counts[key]:0)+1);
 return counts;
}
const DEPENDENCY_STATES=Object.freeze([
 'blocked','queued','ready','working','committed_unverified','superseded','missing','other_policy'
]);
const FINISHED=new Set(['complete','deployed_verified','merged_verified']);
// Called only by the signed Brain claim path. Records status categories of
// unfinished prerequisites, not their IDs, repository paths or owner text.
export function noteRunnerDependencyStatuses(counts,jobs,dependencyIds){
 if(!counts||typeof counts!=='object'||!Array.isArray(dependencyIds))return counts;
 const source=Array.isArray(jobs)?jobs:[],seen=new Set();
 for(const id of dependencyIds.slice(0,32)){
  if(typeof id!=='string'||seen.has(id))continue;
  seen.add(id);
  const dependency=source.find(j=>j?.id===id);
  const status=dependency?dependency.status:'missing';
  if(FINISHED.has(status))continue;
  const key=DEPENDENCY_STATES.includes(status)?status:'other_policy';
  counts[key]=Math.min(500,(Number.isSafeInteger(counts[key])&&counts[key]>=0?counts[key]:0)+1);
 }
 return counts;
}
export function describeRunnerIdle({candidateCount=0,admission={},adapterMatches=0,scanLimited=false,claimBlockedBy=null,dependencyStates=null}={}) {
 const bounded=n=>Number.isSafeInteger(n)&&n>0?Math.min(n,500):0;
 const examined=bounded(candidateCount);
 const admitted=bounded(Array.isArray(admission.allowed)?admission.allowed.length:0);
 const reasons=Array.isArray(admission.deferred)?admission.deferred:[];
 const deferred=bounded(reasons.length);
 const compatible=bounded(adapterMatches);
 const agedOut=bounded(reasons.filter(x=>x?.reason==='background_ticket_aged_out').length);
 const code=!examined?'owner_queue_empty':!admitted?'admission_deferred':!compatible?'no_matching_runner_adapter':'eligible_but_not_claimed';
 const safe=claimBlockedBy&&typeof claimBlockedBy==='object'&&!Array.isArray(claimBlockedBy)
  ? Object.fromEntries(CLAIM_SKIP_REASONS.filter(k=>claimBlockedBy[k]>0).map(k=>[k,bounded(claimBlockedBy[k])])):null;
 const dependencySummary=dependencyStates&&typeof dependencyStates==='object'&&!Array.isArray(dependencyStates)
  ?Object.fromEntries(DEPENDENCY_STATES.filter(k=>dependencyStates[k]>0).map(k=>[k,bounded(dependencyStates[k])])):null;
 return {code,examined,admitted,deferred,adapterMatches:compatible,agedOut,scanLimited:scanLimited===true,
  ...(safe?{claimBlockedBy:safe}:{}),
  ...(dependencySummary&&Object.keys(dependencySummary).length?{dependencyStates:dependencySummary}:{})};
}
