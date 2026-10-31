// state-delta-tracker.js – computes lexical differences between successive transcripts.
// Provides a `track` function that reads the sniffer log and returns the delta
// between the last two entries. Also exports a pure `computeDelta` helper.

(function (root) {
  'use strict';
  const STORAGE_KEY = 'bubblesSnifferLog';

  /**
   * Compute lexical additions and removals between two strings.
   * @param {string} oldText – previous transcript.
   * @param {string} newText – current transcript.
   * @returns {{added:string[],removed:string[]}}
   */
  function computeDelta(oldText, newText) {
    const oldWords = new Set((oldText || '').split(/\s+/).filter(Boolean));
    const newWords = new Set((newText || '').split(/\s+/).filter(Boolean));
    const added = [...newWords].filter(w => !oldWords.has(w));
    const removed = [...oldWords].filter(w => !newWords.has(w));
    return { added, removed };
  }

  /**
   * Read the sniffer log from localStorage and compute the delta between the
   * last two transcripts. Returns empty arrays if insufficient data.
   * @returns {{added:string[],removed:string[]}}
   */
  function track() {
    if (typeof localStorage === 'undefined') return { added: [], removed: [] };
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { added: [], removed: [] };
    const log = JSON.parse(raw);
    if (!Array.isArray(log) || log.length < 2) return { added: [], removed: [] };
    const prev = log[log.length - 2].transcript || '';
    const curr = log[log.length - 1].transcript || '';
    return computeDelta(prev, curr);
  }

  // Export for Node environments.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { computeDelta, track };
  }
  // Also expose on the global object for browser usage.
  if (typeof root !== 'undefined') {
    root.stateDeltaTracker = { computeDelta, track };
  }
})(typeof window !== 'undefined' ? window : global);
