/**
 * Derive a ticket's aggregate state from authenticated runner job records.
 * A child job blocked in GitHub must not leave the owner ticket claiming
 * "working" when no runnable or executing job remains.
 * This function never declares code or deployment verified.
 */
export function ticketStatusFromJobs(jobs) {
 if (!Array.isArray(jobs) || jobs.length===0) return 'draft';
 const done = new Set(jobs.filter(j=>['complete','deployed_verified'].includes(j?.status)).map(j=>j.id));
 if (done.size===jobs.length) return 'complete';
 if (jobs.some(j=>j?.status==='working')) return 'working';
 const integrated=new Set(jobs.filter(j=>j?.status==='merged_verified').map(j=>j.id));
 const eligible=jobs.some(j=>['queued','ready'].includes(j?.status)
  && (!Array.isArray(j.dependencies)||j.dependencies.every(id=>done.has(id)||integrated.has(id))));
 if (eligible) return 'ready';
 // Committed/merged source is awaiting verification, not an active runner.
 return 'blocked';
}
