const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const base = path.join(__dirname, '..', 'android', 'bubbles-overlay', 'app', 'src', 'main');
const read = (name) => fs.readFileSync(path.join(base, name), 'utf8');

test('original Bubbles declares Termux permission, visibility, and private receipt', () => {
  const m = read('AndroidManifest.xml');
  assert.match(m, /com\\.termux\\.permission\\.RUN_COMMAND/);
  assert.match(m, /<package android:name="com\\.termux"\\s*\\/>/);
  assert.match(m, /TermuxPythonResultReceiver" android:exported="false"/);
});

test('original Bubbles uses a fixed Python probe, not arbitrary shell or remote code', () => {
  const p = read('java/org/quantaphi/bubbles/TermuxPythonProbe.java');
  assert.match(p, /com\\.termux\\.RUN_COMMAND/);
  assert.match(p, /com\\.termux\\.RUN_COMMAND_PENDING_INTENT/);
  assert.match(p, /"python"/);
  assert.match(p, /TemporaryDirectory/);
  assert.match(p, /TEMP_REMOVED=/);
  assert.match(p, /FLAG_MUTABLE/);
  assert.doesNotMatch(p, /"bash"|rm -rf|pkg install|pip install|chmod 777/);
});

test('only directly addressed native voice or typed request runs the probe', () => {
  const s = read('java/org/quantaphi/bubbles/BubblesService.java');
  assert.match(s, /directed && TermuxPythonProbe\\.isRequest\\(addressed\\)/);
  assert.match(s, /TermuxPythonProbe\\.isRequest\\(text\\)/);
  assert.match(s, /reportTermuxPythonReceipt/);
});

test('Termux exit result, free space and confirmed removal are observable', () => {
  const r = read('java/org/quantaphi/bubbles/TermuxPythonResultReceiver.java');
  const a = read('java/org/quantaphi/bubbles/MainActivity.java');
  assert.match(r, /exitCode/);
  assert.match(r, /BUBBLES_PROBE_OK=True/);
  assert.match(r, /TEMP_REMOVED=True/);
  assert.match(r, /termux_python_receipt/);
  assert.match(a, /Termux Python:/);
});
