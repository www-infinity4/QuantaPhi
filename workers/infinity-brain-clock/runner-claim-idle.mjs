/* A signed runner may learn WHY it received no lease. These aggregate receipts
 * never include ticket IDs, owner identities, instructions or blocker prose.
 * They do not change eligibility, retries, consent or queue state. */
export function describeRunnerIdle({candidateCount=0,admission={},adapterMatches=0,scanLimited=false}={}) {
 const bounded=n=>Number.isSafeInteger(n)&&n>0?Math.min(n,500):0;
 const examined=bounded(candidateCount);
 const admitted=bounded(Array.isArray(admission.allowed)?admission.allowed.length:0);
 const reasons=Array.isArray(admission.deferred)?admission.deferred:[];
 const deferred=bounded(reasons.length);
 const compatible=bounded(adapterMatches);
 const agedOut=bounded(reasons.filter(x=>x?.reason==='background_ticket_aged_out').length);
 const code=!examined?'owner_queue_empty':!admitted?'admission_deferred':!compatible?'no_matching_runner_adapter':'eligible_but_not_claimed';
 return {code,examined,admitted,deferred,adapterMatches:compatible,agedOut,scanLimited:scanLimited===true};
}
