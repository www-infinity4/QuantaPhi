// interaction-sniffer.js – records every voice transcript to localStorage
// The module works both in a browser (window) and in Node (CommonJS).

(function (root) {
  'use strict';
  const STORAGE_KEY = 'bubblesSnifferLog';

  /**
   * Append a transcript entry to the sniffer log.
   * @param {string} transcript – the raw transcript string.
   */
  function logTranscript(transcript) {
    if (typeof transcript !== 'string') return;
    // Retrieve existing log or start a new array.
    const raw = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || null;
    const log = raw ? JSON.parse(raw) : [];
    // Push a new entry with a timestamp.
    log.push({ timestamp: Date.now(), transcript });
    // Persist back to storage.
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    }
  }

  // Export for Node environments.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { logTranscript };
  }
  // Also expose on the global object for browser usage.
  if (typeof root !== 'undefined') {
    root.interactionSniffer = { logTranscript };
  }
})(typeof window !== 'undefined' ? window : global);
