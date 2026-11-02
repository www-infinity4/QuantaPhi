const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFile } = require('node:fs/promises');
const path = require('node:path');

test('QuantaPhi homepage does not render literal escaped newlines between cards', async () => {
  const html = await readFile(path.join(__dirname, '..', 'index.html'), 'utf8');
  // Backslash-n between HTML siblings renders as visible characters, not a line break.
  assert.doesNotMatch(
    html,
    /<\/(?:section|article|div)>\\[nr]\s*<(?:section|article|div)\b/i,
    'Replace escaped newline text between adjacent HTML elements with an actual newline'
  );
});
