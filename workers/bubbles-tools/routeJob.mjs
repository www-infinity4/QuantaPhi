import { handle as searchHandle } from "./search.mjs";
import { handle as mediaHandle } from "./media.mjs";
import { handle as walletHandle } from "./wallet.mjs";

/**
 * Dispatches a job to the appropriate handler based on its `type` field.
 * Supported types: "search", "media", "wallet".
 * Returns the handler's response or an error object for unknown types.
 */
export async function routeJob(job) {
  if (!job || typeof job.type !== "string") {
    return { status: "error", reason: "invalid_job", job };
  }
  switch (job.type) {
    case "search":
      return await searchHandle(job);
    case "media":
      return await mediaHandle(job);
    case "wallet":
      return await walletHandle(job);
    default:
      return { status: "error", reason: "unknown_type", type: job.type };
  }
}
