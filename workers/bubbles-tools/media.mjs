export async function handle(job) {
  // Stub media handler – returns a simple success payload.
  return { status: "ok", type: job.type };
}
