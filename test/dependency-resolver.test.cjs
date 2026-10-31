const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, writeFile, readFile, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { resolveDependencies } = require('../utils/dependencyResolver');

describe('fail-closed dependency eligibility', () => {
  const completed = [{ id: 'job-1' }, { id: 'job-2' }, { id: 'job-3' }];
  const pending = [
    { id: 'p-1', prerequisites: ['job-1'] },
    { id: 'p-2', prerequisites: ['job-2', 'job-3'] },
    { id: 'p-3', prerequisites: [] },
    { id: 'p-4' },
    { id: 'p-5', prerequisites: ['job-99'] },
  ];
  test('only satisfied dependencies are eligible', () => {
    assert.deepEqual(resolveDependencies(completed, pending).map(x => x.id),
      ['p-1', 'p-2', 'p-3', 'p-4']);
  });
  test('empty completed set allows only dependency-free jobs', () => {
    assert.deepEqual(resolveDependencies([], pending).map(x => x.id), ['p-3', 'p-4']);
  });
  test('empty pending list returns empty result', () => {
    assert.deepEqual(resolveDependencies(completed, []), []);
  });
  test('rejects non-array input', () => {
    assert.throws(() => resolveDependencies(null, pending), TypeError);
    assert.throws(() => resolveDependencies(completed, undefined), TypeError);
  });
  test('ignores malformed pending entries and malformed prerequisites', () => {
    const bad = [null, {}, { id: '' }, { id: 'a', prerequisites: null },
      { id: 'b', prerequisites: 'job-1' }, { id: 'c', prerequisites: [''] },
      { id: 'd', prerequisites: [null] }, { id: 'e', prerequisites: ['job-1'] }];
    assert.deepEqual(resolveDependencies(completed, bad).map(x => x.id), ['e']);
  });
  test('malformed and failed completed records do not satisfy dependencies', () => {
    const done = [null, {}, { id: '' }, { id: 'job-1', status: 'failed' },
      { id: 'job-2', status: 'completed' }];
    assert.deepEqual(resolveDependencies(done, pending).map(x => x.id), ['p-3', 'p-4']);
  });
  test('never requeues an already completed job', () => {
    assert.deepEqual(resolveDependencies(completed, [
      { id: 'job-1' }, { id: 'new', prerequisites: ['job-1'] },
    ]).map(x => x.id), ['new']);
  });
  test('CLI library reads and writes only the supplied data directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dependency-resolver-'));
    try {
      await writeFile(join(dir, 'completed.json'), JSON.stringify(completed));
      await writeFile(join(dir, 'pending.json'), JSON.stringify(pending));
      const { run } = await import('../scripts/dependency-resolver.mjs');
      const result = await run(dir);
      assert.deepEqual(result.map(x => x.id), ['p-1', 'p-2', 'p-3', 'p-4']);
      const output = JSON.parse(await readFile(join(dir, 'claimed.json'), 'utf8'));
      assert.deepEqual(output, result);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  test('CLI refuses missing or invalid input without writing a claims file', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dependency-resolver-'));
    try {
      const { run } = await import('../scripts/dependency-resolver.mjs');
      await assert.rejects(run(dir));
      await writeFile(join(dir, 'completed.json'), '{}');
      await writeFile(join(dir, 'pending.json'), '[]');
      await assert.rejects(run(dir), TypeError);
      await assert.rejects(readFile(join(dir, 'claimed.json'), 'utf8'), { code: 'ENOENT' });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
