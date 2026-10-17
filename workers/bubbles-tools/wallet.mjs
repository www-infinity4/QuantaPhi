export async function handle(job) {
  // Stub wallet handler – returns a simple success payload.
  return { status: "ok", type: job.type };
}
