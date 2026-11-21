// Fail-closed, deterministic eligibility calculation. This does not claim a lease.
function resolveDependencies(completedJobs, pendingJobs) {
  if (!Array.isArray(completedJobs) || !Array.isArray(pendingJobs)) {
    throw new TypeError('Both completedJobs and pendingJobs must be arrays');
  }
  const completedIds = new Set(
    completedJobs
      .filter((job) => job && typeof job.id === 'string' && job.id.trim() !== '' &&
        (job.status === undefined || job.status === 'completed'))
      .map((job) => job.id)
  );
  return pendingJobs.filter((job) => {
    if (!job || typeof job.id !== 'string' || job.id.trim() === '' ||
        completedIds.has(job.id)) return false;
    if (job.prerequisites !== undefined && !Array.isArray(job.prerequisites)) return false;
    const prerequisites = job.prerequisites || [];
    return prerequisites.every((id) =>
      typeof id === 'string' && id.trim() !== '' && completedIds.has(id));
  });
}

module.exports = { resolveDependencies };
