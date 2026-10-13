// switchboard-matrix.js
// Centralized Signal Broker (Switchboard‑Matrix)
// Manages active patches between "jacks" (inputs) and "plugs" (outputs).
// Exported as a CommonJS module for compatibility with the repository's test runner.

// Internal map storing the current connections.
// Keys are jack identifiers, values are plug identifiers.
const active_patches = {};

/**
 * Connect a jack to a plug.
 * If the jack already has a connection, it will be overwritten.
 *
 * @param {string} jack - Identifier for the input port.
 * @param {string} plug - Identifier for the output port.
 */
function connect(jack, plug) {
  if (typeof jack !== "string" || typeof plug !== "string") {
    throw new TypeError("jack and plug must be strings");
  }
  active_patches[jack] = plug;
}

/**
 * Disconnect a jack, removing its entry from the map.
 *
 * @param {string} jack - Identifier for the input port to remove.
 */
function disconnect(jack) {
  if (typeof jack !== "string") {
    throw new TypeError("jack must be a string");
  }
  delete active_patches[jack];
}

/**
 * Retrieve a shallow copy of the current active patches map.
 *
 * @returns {Object} Copy of the active patches.
 */
function getActivePatches() {
  // Return a shallow copy to prevent external mutation.
  return { ...active_patches };
}

module.exports = {
  connect,
  disconnect,
  getActivePatches,
};
