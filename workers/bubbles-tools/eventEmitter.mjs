let _events = [];

/**
 * Emit an event with a payload. The call is async to keep the same signature as
 * typical event‑bus APIs used elsewhere in the codebase.
 */
export async function emit(event, payload) {
  _events.push({ event, payload });
}

/** Return a shallow copy of all emitted events for test inspection. */
export function getEmitted() {
  return [..._events];
}

/** Clear the stored events – useful for isolated test runs. */
export function clearEmitted() {
  _events = [];
}
