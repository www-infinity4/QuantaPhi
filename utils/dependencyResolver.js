// utils/dependencyResolver.js
// Core library for resolving job dependencies.
// Exports a single function `resolveDependencies(completedJobs, pendingJobs)`.
//   - completedJobs: Array of job objects that have been verified as completed.
//   - pendingJobs:   Array of job objects that may have a `prerequisites` field.
// Returns an array of pending job objects whose prerequisites are all satisfied.
//   A prerequisite is satisfied when its `id` appears in the set of completed job IDs.
// If a pending job has no `prerequisites` field or it is an empty array, it is considered satisfied.
// The function performs shallow checks only (no deep validation of job contents).

/**
 * Resolve pending jobs whose prerequisites are satisfied by completed jobs.
 * @param {Array<{id:string}>} completedJobs - List of completed job objects.
 * @param {Array<{id:string, prerequisites?:string[]}>} pendingJobs - List of pending job objects.
 * @returns {Array<Object>} - Subset of pendingJobs that are ready to be claimed.
 */
function resolveDependencies(completedJobs, pendingJobs) {
  if (!Array.isArray(completedJobs) || !Array.isArray(pendingJobs)) {
    throw new TypeError('Both completedJobs and pendingJobs must be arrays');
  }

  // Build a Set of completed job IDs for O(1) lookup.
  const completedIds = new Set(completedJobs.map((job) => job.id));

  // Filter pending jobs where every prerequisite (if any) is in completedIds.
  const claimable = pendingJobs.filter((job) => {
    if (!job || typeof job.id !== 'string') {
      // Invalid job entry – skip it.
      return false;
    }
    const prereqs = job.prerequisites;
    if (!Array.isArray(prereqs) || prereqs.length === 0) {
      // No prerequisites means the job is immediately claimable.
      return true;
    }
    // Every prerequisite must be satisfied.
    return prereqs.every((pid) => completedIds.has(pid));
  });

  return claimable;
}

module.exports = { resolveDependencies };
