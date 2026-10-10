const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { SyntaxEradicator, validate, runMatrix } = require('../tools/syntax-matrix.cjs');

// Existing unit tests for validation logic remain unchanged.
test('Broken syntax reports exact location; CSS uses its own parser', () => {
  assert.equal(validate('const x = {', 'x.js').ok, false);
  assert.equal(validate('a {color:red', 'x.css').ok, false);
  assert.equal(validate('const x = `hello`;', 'x.js').ok, true);
});

test('Invalid candidates and unsigned runtime changes preserve original buffer', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'syntax-matrix-'));
  const file = path.join(root, 'robot-directions.js');
  await fs.writeFile(file, 'const x = {');
  const e = new SyntaxEradicator(root);

  assert.equal((await e.execute({ file_path: 'robot-directions.js' })).status, 'blocked');
  assert.equal((await e.execute({ file_path: 'robot-directions.js', candidate: 'const x = {' })).status, 'blocked');
  assert.equal((await e.execute({ file_path: 'robot-directions.js', candidate: 'const x = {};' })).status, 'blocked');
  assert.equal(await fs.readFile(file, 'utf8'), 'const x = {');
  assert.equal((await e.execute({ file_path: 'robot-directions.js', candidate: 'const x = {};', verify: async () => true })).status, 'written');
  assert.equal(await fs.readFile(file, 'utf8'), 'const x = {};');

  await fs.rm(root, { recursive: true, force: true });
});

// New test: ensure the matrix output captures exact buffers, correct hashes, and line/column diagnostics.
test('Matrix output contains exact buffers, correct SHA‑256 hashes, and diagnostics with line/column', async () => {
  const results = await runMatrix();
  // Verify each entry matches the on‑disk file.
  for (const entry of results) {
    const absolute = path.join(__dirname, '..', entry.path);
    const fileBuffer = await fs.readFile(absolute);
    const fileContent = fileBuffer.toString('utf8');
    // Buffer equality
    assert.equal(entry.buffer, fileContent, `Buffer mismatch for ${entry.path}`);
    // Hash correctness
    const expectedHash = require('node:crypto').createHash('sha256').update(fileBuffer).digest('hex');
    assert.equal(entry.hash, expectedHash, `Hash mismatch for ${entry.path}`);
    // Diagnostics line/column presence when there are any diagnostics
    if (entry.diagnostics.length > 0) {
      for (const diag of entry.diagnostics) {
        assert.ok(Number.isInteger(diag.line), `Missing line for diagnostic in ${entry.path}`);
        assert.ok(Number.isInteger(diag.column), `Missing column for diagnostic in ${entry.path}`);
        assert.ok(typeof diag.message === 'string' && diag.message.length > 0, `Missing message for diagnostic in ${entry.path}`);
      }
    } else {
      // When no diagnostics, ensure the array is empty.
      assert.equal(entry.diagnostics.length, 0, `Expected no diagnostics for ${entry.path}`);
    }
  }
});
