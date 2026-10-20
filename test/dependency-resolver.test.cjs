// test/dependency-resolver.test.cjs
// Node.js built‑in test runner (node --test) for the dependency resolver.

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const { resolveDependencies } = require('../utils/dependencyResolver');

describe('resolveDependencies', () => {
  let completed;
  let pending;

  beforeEach(() => {
    // Fresh data for each test case.
    completed = [
      { id: 'job-1' },
      { id: 'job-2' },
      { id: 'job-3' },
    ];
    pending = [
      { id: 'p-1', prerequisites: ['job-1'] },
      { id: 'p-2', prerequisites: ['job-2', 'job-3'] },
      { id: 'p-3', prerequisites: [] }, // no prereqs
      { id: 'p-4' }, // undefined prereqs
      { id: 'p-5', prerequisites: ['job-99'] }, // missing prereq
    ];
  });

  test('returns jobs with satisfied prerequisites', () => {
    const result = resolveDependencies(completed, pending);
    const ids = result.map((j) => j.id);
    assert.deepStrictEqual(ids.sort(), ['p-1', 'p-2', 'p-3', 'p-4'].sort());
  });

  test('handles empty completed list', () => {
    const result = resolveDependencies([], pending);
    const ids = result.map((j) => j.id);
    // Only jobs without prerequisites should be claimable.
    assert.deepStrictEqual(ids.sort(), ['p-3', 'p-4'].sort());
  });

  test('handles empty pending list', () => {
    const result = resolveDependencies(completed, []);
    assert.deepStrictEqual(result, []);
  });

  test('throws on non‑array inputs', () => {
    assert.throws(() => resolveDependencies(null, pending), TypeError);
    assert.throws(() => resolveDependencies(completed, undefined), TypeError);
  });

  test('ignores malformed pending job entries', () => {
    pending.push({ foo: 'bar' }); // missing id
    const result = resolveDependencies(completed, pending);
    const ids = result.map((j) => j.id);
    assert(!ids.includes(undefined));
  });
});
