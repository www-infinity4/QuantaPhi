'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { logTranscript } = require('../interaction-sniffer.js');

/** Simple in‑memory mock for localStorage used by the module under test. */
function createMockStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: k => { map.delete(k); },
    // expose for inspection in tests
    _map: map
  };
}

test('logTranscript stores entries in localStorage', () => {
  // Install a fresh mock storage.
  global.localStorage = createMockStorage();
  // Ensure a clean start.
  localStorage.removeItem('bubblesSnifferLog');

  logTranscript('first entry');
  logTranscript('second entry');

  const stored = JSON.parse(localStorage.getItem('bubblesSnifferLog') || '[]');
  assert.strictEqual(stored.length, 2, 'two entries should be recorded');
  assert.strictEqual(stored[0].transcript, 'first entry');
  assert.strictEqual(stored[1].transcript, 'second entry');
});
