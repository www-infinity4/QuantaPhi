import { handle as searchHandle } from "./search.mjs";
import { handle as mediaHandle } from "./media.mjs";
import { handle as walletHandle } from "./wallet.mjs";
import { handle as hboHandle } from "../../channels/HBO/channel-reader.js";

/**
 * Dispatches a job to the appropriate handler based on its `type` field.
 * Supported types: "search", "media", "wallet", "channel".
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
    case "channel":
      if (job.channel === "HBO") {
        return await hboHandle(job);
      }
      return { status: "error", reason: "unknown_channel", channel: job.channel };
    default:
      return { status: "error", reason: "unknown_type", type: job.type };
  }
}
