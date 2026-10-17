const ORIGIN = "https://infinity-brain-clock.marvaseater.workers.dev";

/**
 * Fetches ticket data from the Infinity Brain Clock and returns only the tickets
 * that are currently running. The system marks a running ticket with the status
 * string "run".
 *
 * If the remote endpoint is unavailable or returns a non‑OK response, the
 * function returns an empty array instead of throwing – this keeps the helper
 * pure and allows callers (including our test suite) to handle the absence of
 * data gracefully.
 */
async function getRunningTickets() {
  try {
    const response = await fetch(`${ORIGIN}/ticket-status`);
    if (!response.ok) {
      // Endpoint not reachable or returned an error – treat as no running tickets.
      return [];
    }
    const tickets = await response.json();
    // The Brain Clock uses the literal string "run" for active tickets.
    return Array.isArray(tickets) ? tickets.filter(t => t.status === "run") : [];
  } catch (e) {
    // Network or parsing error – also return an empty list.
    return [];
  }
}

module.exports = { getRunningTickets };
