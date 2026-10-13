/* Owner-selected work first, then explicit bounded queue priority. */
const priority=job=>Number.isFinite(job.queue_priority)?Math.max(-100,Math.min(100,job.queue_priority)):0;
export function sortCandidates(candidates,requested){
 return candidates.sort((a,b)=>Number(!(a.ticket.id===requested?.ticketId&&a.job.id===requested?.jobId))-Number(!(b.ticket.id===requested?.ticketId&&b.job.id===requested?.jobId))||priority(b.job)-priority(a.job)||Number(a.job.status==='blocked')-Number(b.job.status==='blocked')||Date.parse(a.job.progress?.attemptedAt||a.job.last_inspected_at||0)-Date.parse(b.job.progress?.attemptedAt||b.job.last_inspected_at||0));
}
