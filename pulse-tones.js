// Pulse Tones – microscopic network protocol
// -------------------------------------------------
// This module provides a tiny binary packet format (4 bytes) that
// represents user interaction events. The packet is dispatched to
// the existing Signal Broker (Switchboard‑Matrix) which updates the
// link matrix in real time.

// Map of supported event types to a single‑byte code. Extend as
// needed for additional UI interactions.
const EVENT_CODES = {
  click: 0x01,
  hover: 0x02,
  keypress: 0x03,
  scroll: 0x04,
};

/**
 * Create a 4‑byte Uint8Array representing a pulse packet.
 *
 * Layout (big‑endian):
 *   byte 0 – event code (from EVENT_CODES)
 *   byte 1 – payload byte 0 (e.g., target id low byte)
 *   byte 2 – payload byte 1 (reserved / high byte)
 *   byte 3 – payload byte 2 (reserved)
 *
 * The payload is optional and limited to three bytes. For the
 * current use‑case we only need a single numeric identifier (e.g.
 * the target element id). If a payload object is supplied, the
 * function looks for an `id` property; otherwise a plain number is
 * interpreted as that id.
 *
 * @param {string} eventType - One of the keys in EVENT_CODES.
 * @param {object|number} [payload] - Optional payload data.
 * @returns {Uint8Array} A 4‑byte packet ready for transmission.
 * @throws {Error} If the event type is unknown or payload is out of range.
 */
function createPulsePacket(eventType, payload = {}) {
  const code = EVENT_CODES[eventType];
  if (code === undefined) {
    throw new Error(`Unsupported event type: ${eventType}`);
  }

  const packet = new Uint8Array(4);
  packet[0] = code;

  // Normalise payload to a numeric id (0‑255). Anything else is
  // treated as zero – the protocol is deliberately tiny.
  let id = 0;
  if (typeof payload === 'number') {
    id = payload;
  } else if (payload && typeof payload.id === 'number') {
    id = payload.id;
  }

  if (id < 0 || id > 0xff) {
    throw new Error('Payload id must fit in a single byte (0‑255)');
  }

  packet[1] = id & 0xff; // low byte of id
  // bytes 2 and 3 remain zero for now – reserved for future use.
  return packet;
}

/**
 * Dispatch a pulse packet to the Signal Broker.
 *
 * The broker is expected to expose an `updateLink(patchId, packet)`
 * method. `patchId` is derived from the event type and a target id so
 * that the Switchboard‑Matrix can route the connection.
 *
 * @param {object} event - An object containing at least `type` and `targetId`.
 * @param {object} broker - The Signal Broker instance.
 */
function dispatchPulse(event, broker) {
  if (!event || typeof event.type !== 'string' || typeof event.targetId !== 'number') {
    throw new Error('Event must have string type and numeric targetId');
  }
  const patchId = `${event.type}_${event.targetId}`;
  const packet = createPulsePacket(event.type, { id: event.targetId });
  if (typeof broker.updateLink !== 'function') {
    throw new Error('Broker does not implement updateLink(patchId, packet)');
  }
  broker.updateLink(patchId, packet);
}

module.exports = {
  createPulsePacket,
  dispatchPulse,
  // Exporting the map helps tests and future extensions.
  EVENT_CODES,
};
