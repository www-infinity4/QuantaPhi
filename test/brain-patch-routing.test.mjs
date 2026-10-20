import { applyEdits, clearButtonPatch } from '../scripts/brain-patch.mjs';

// Simple in‑memory mock of a file that is allowed to be patched.
const original = {
  'robot-directions.js': "let draftTimer;input.addEventListener('input',function(){/* placeholder */});",
  'robot-directions.css': '',
  'quanta-agent-iterations.js': '',
  'quanta-agent-iterations.css': ''
};

// Verify that a well‑formed edit succeeds.
const edits = [{
  path: 'robot-directions.js',
  before: "let draftTimer;input.addEventListener('input',",
  after: "let draftTimer;input.addEventListener('input',/* patched */"
}];

const patched = applyEdits(original, edits);
if (!patched['robot-directions.js'].includes('/* patched */')) {
  throw new Error('applyEdits did not replace the before string as expected');
}

// Verify that clearButtonPatch returns an empty array when the clear button already exists.
const withClear = {
  ...original,
  'robot-directions.js': "...clearButton.dataset.clear='1'..."
};
if (clearButtonPatch(withClear).length !== 0) {
  throw new Error('clearButtonPatch should return [] when clear button already present');
}

// Verify that clearButtonPatch produces a valid edit when the button is missing.
const withoutClear = original;
const clearEdits = clearButtonPatch(withoutClear);
if (!Array.isArray(clearEdits) || clearEdits.length !== 1) {
  throw new Error('clearButtonPatch did not produce the expected edit');
}
// Apply the generated edit to ensure it passes the applyEdits validation.
applyEdits(withoutClear, clearEdits);

console.log('All brain‑patch routing tests passed');
