'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const source = path.join(root, 'android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles');

test('local LLM adapter compiles and runs its offline, fail-closed contract', t => {
  const compiler = spawnSync('javac', ['-version'], { encoding: 'utf8' });
  const runtime = spawnSync('java', ['-version'], { encoding: 'utf8' });
  if (compiler.error && compiler.error.code === 'ENOENT') return t.skip('JDK missing on this runner');
  if (runtime.error && runtime.error.code === 'ENOENT') return t.skip('Java runtime missing on this runner');
  assert.equal(compiler.status, 0, compiler.stderr || 'javac -version failed');
  assert.equal(runtime.status, 0, runtime.stderr || 'java -version failed');

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbles-local-brain-'));
  try {
    const compile = spawnSync('javac', ['-d', dir,
      path.join(source, 'LocalBrainPort.java'),
      path.join(source, 'LocalBrainSession.java'),
      path.join(root, 'test/java/LocalBrainSessionTest.java')
    ], { cwd: root, encoding: 'utf8', timeout: 60000 });
    assert.equal(compile.status, 0, compile.stderr || compile.error?.message || 'javac failed');

    const run = spawnSync('java', ['-cp', dir, 'LocalBrainSessionTest'],
      { cwd: root, encoding: 'utf8', timeout: 60000 });
    assert.equal(run.status, 0, run.stderr || run.error?.message || 'java test failed');
    assert.match(run.stdout, /8 assertions passed/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
