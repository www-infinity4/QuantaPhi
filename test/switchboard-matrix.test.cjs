// test/switchboard-matrix.test.cjs
// Test suite for the Signal Broker (Switchboard‑Matrix).
// Uses Node's built‑in test runner and assert module.

const test = require('node:test');
const assert = require('node:assert');
const switchboard = require('../switchboard-matrix.js');

// Ensure a fresh state before each test case.
function resetState() {
  // The module keeps its state in memory; we clear it by deleting cached exports.
  delete require.cache[require.resolve('../switchboard-matrix.js')];
  return require('../switchboard-matrix.js');
}

test('initial state should have no active patches', t => {
  const sb = resetState();
  const patches = sb.getActivePatches();
  assert.deepStrictEqual(patches, {});
});

test('connect adds a patch entry', t => {
  const sb = resetState();
  sb.connect('jack_gemini_out', 'plug_ibm_circular_port_v1');
  const patches = sb.getActivePatches();
  assert.deepStrictEqual(patches, { jack_gemini_out: 'plug_ibm_circular_port_v1' });
});

test('disconnect removes the patch entry', t => {
  const sb = resetState();
  sb.connect('jack_gemini_out', 'plug_ibm_circular_port_v1');
  sb.disconnect('jack_gemini_out');
  const patches = sb.getActivePatches();
  assert.deepStrictEqual(patches, {});
});
