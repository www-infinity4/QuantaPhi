import { handle as searchHandle } from "./search.mjs";
import { handle as mediaHandle } from "./media.mjs";
import { handle as walletHandle } from "./wallet.mjs";
import { handle as hboHandle } from "../../channels/HBO/channel-reader.js";
import { sourceReview } from "../infinity-brain-clock/source-review.mjs";
import { fetchAuthenticated } from "../infinity-brain-clock/direct-github.mjs";
import { emit } from "./eventEmitter.mjs";

/**
 * Dispatches a job to the appropriate handler based on its `type` field.
 * Supported types: "search", "media", "wallet", "channel".
 * Returns the handler's response or an error object for unknown types.
 *
 * Authentication flow:
 *   1. Validate the source‑window using `sourceReview`. This ensures the
 *      current OIDC lease is still valid for accessing protected sources.
 *   2. (Optional) Perform a lightweight authenticated fetch via
 *      `fetchAuthenticated` if additional verification is required.
 *   3. On any failure, return a structured `{ error: 'auth', message: … }`
 *      object so callers can handle auth problems uniformly.
 */
export async function routeJob(job) {
  // Verify authentication before routing.
  try {
    await sourceReview(); // throws if source window is invalid
    // Optional: verify lease by making an authenticated request.
    // The URL is a harmless endpoint; adjust as needed.
    await fetchAuthenticated(new Request("https://quantaphi.org/.well-known/health"));
  } catch (e) {
    return { error: "auth", message: e.message };
  }

  // Emit claim event as soon as the job is received.
  await emit('bubblesJobClaimed', { jobId: job?.id ?? job?.jobId ?? null });

  if (!job || typeof job.type !== "string") {
    // Emit finished event for early exit.
    await emit('bubblesJobFinished', { jobId: job?.id ?? job?.jobId ?? null });
    return { status: "error", reason: "invalid_job", job };
  }

  let result;
  switch (job.type) {
    case "search":
      result = await searchHandle(job);
      break;
    case "media":
      result = await mediaHandle(job);
      break;
    case "wallet":
      result = await walletHandle(job);
      break;
    case "channel":
      if (job.channel === "HBO") {
        result = await hboHandle(job);
      } else {
        result = { status: "error", reason: "unknown_channel", channel: job.channel };
      }
      break;
    default:
      result = { status: "error", reason: "unknown_type", type: job.type };
  }

  // Emit finished event after handling.
  await emit('bubblesJobFinished', { jobId: job?.id ?? job?.jobId ?? null });
  return result;
}
