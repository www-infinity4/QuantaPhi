// In-memory schedule service stub.
// Provides a simple writable key/value store for schedule entries.

const store = new Map();

/**
 * Save a schedule entry.
 * @param {string} key
 * @param {*} value
 */
function set(key, value) {
  store.set(key, value);
}

/**
 * Retrieve a schedule entry.
 * @param {string} key
 * @returns {*}
 */
function get(key) {
  return store.get(key);
}

/**
 * Delete a schedule entry.
 * @param {string} key
 */
function del(key) {
  store.delete(key);
}

module.exports = { set, get, del };
