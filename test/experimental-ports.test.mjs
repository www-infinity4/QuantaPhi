import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createPortState, updatePortReading, portViews, normalizeShape} from '../sandbox/ports/port-state.mjs';

test('unrecognized port shapes fall back to circle', () => {
  assert.equal(normalizeShape('fake'), 'circle');
  assert.equal(normalizeShape('double_mirror'), 'double_mirror');
});

test('synthetic readings clamp to safe values and reject invalid values', () => {
  assert.equal(createPortState(999).reading, 100);
  assert.equal(createPortState(-4).reading, 0);
  assert.equal(updatePortReading(createPortState(60), NaN).reading, 60);
});

test('circle, mirror and cluster are derived from exactly the same state', () => {
  const changed = updatePortReading(createPortState(25), 72);
  const views = portViews(changed);
  assert.deepEqual(views.map(v => v.reading), [72, 72, 72]);
  assert.equal(views[1].mirrored, true);
  assert.deepEqual(views.map(v => v.shape), ['circle','double_mirror','cluster']);
});

test('demo is self-contained and does not request arbitrary external content', () => {
  const html = readFileSync(new URL('../sandbox/ports/index.html', import.meta.url), 'utf8');
  assert.match(html, /Synthetic data/);
  assert.doesNotMatch(html, /<iframe|https:\/\/|innerHTML|new WebSocket/);
});
