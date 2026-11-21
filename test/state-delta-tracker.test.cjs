'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeDelta, track } = require('../state-delta-tracker.js');

/** Simple in‑memory mock for localStorage used by the module under test. */
function createMockStorage() {
  const map = new Map();
  return {
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, v); },
    removeItem: k => { map.delete(k); },
    _map: map
  };
}

test('computeDelta identifies lexical changes', () => {
  const delta = computeDelta('brave new', 'brave old');
  assert.deepStrictEqual(delta.added, ['old']);
  assert.deepStrictEqual(delta.removed, ['new']);
});

test('track computes delta from stored log', () => {
  global.localStorage = createMockStorage();
  const log = [
    { timestamp: 1, transcript: 'brave new' },
    { timestamp: 2, transcript: 'brave old' }
  ];
  localStorage.setItem('bubblesSnifferLog', JSON.stringify(log));

  const delta = track();
  assert.deepStrictEqual(delta.added, ['old']);
  assert.deepStrictEqual(delta.removed, ['new']);
});
