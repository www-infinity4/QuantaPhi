export function handle(job) {
  // Stub – real implementation will be provided by the owner later.
  return { status: "ok", channel: "HBO", jobId: job.id };
}

/**
 * Fetches the schedule for the HBO channel.
 * @returns {Promise<Array<{id:string, start:number, end:number, title:string}>>}
 */
export async function getSchedule() {
  // Placeholder implementation returning empty schedule.
  return [];
}

/**
 * Reads a generic channel feed.
 * @param {Object} [options={}] - Optional filter parameters.
 * @returns {Promise<{items:Array<any>}>}
 */
export async function readChannel(options = {}) {
  // Placeholder implementation returning empty feed.
  return { items: [] };
}
