import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {INTERVAL, LEASE, claimCycle} from '../workers/continuity-session-coordinator/worker.mjs';
import {runPacketPass} from '../continuity/packet-runner-adapter.mjs';

const SHA = 'a'.repeat(40), NEXT = 'b'.repeat(40), THIRD = 'c'.repeat(40);
const OWNER_SCOPE = 'd'.repeat(64), OWNER = 'verified-owner';
const REPO = 'www-infinity4/QuantaPhi';
const AT = Math.floor(Date.now() / INTERVAL) * INTERVAL;

function database() {
  const sqlite = new DatabaseSync(':memory:');
  const db = {prepare(query) {
    let values = [];
    const statement = {
      bind(...args) {values = args; return statement;},
      async run() {
        const result = sqlite.prepare(query).run(...values);
        return {success: true, meta: {changes: Number(result.changes)}};
      },
      async first() {return sqlite.prepare(query).get(...values) || null;},
    };
    return statement;
  }};
  return {db, sqlite, close: () => sqlite.close()};
}

const packet = (issue, overrides = {}) => ({
  repo: REPO, issue, headSha: SHA, nextAction: 'edit_code',
  nextSourcePath: `src/${issue}.mjs`, priority: 100 - issue, state: 'ready',
  ...overrides,
});
const receipt = (work, action, result, idempotencyKey, extra = {}) => ({
  repo: work.repo, issue: work.issue, headSha: work.headSha, action,
  result, idempotencyKey, ...extra,
});

async function claim(db, cycle, stamp, fence) {
  return claimCycle(db, cycle, stamp, fence);
}

test('changed inventory selects, rotates after one blocker, then resumes without rescanning', async () => {
  const d = database();
  try {
    const first = await claim(d.db, AT, AT, 'fence-one');
    let scans = 0, executions = [];
    const candidates = [packet(1), packet(2)];
    const firstRun = await runPacketPass({
      db: d.db, claim: first, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: SHA, now: AT + 1,
      loadCandidates: async () => {scans++; return candidates;},
      executePacket: async (work, {idempotencyKey}) => {
        executions.push(work.issue);
        return {receipt: work.issue === 1
          ? receipt(work, work.nextAction, 'blocked', idempotencyKey, {reason: 'needs owner scope'})
          : receipt(work, work.nextAction, 'changed', idempotencyKey, {
            providerConfirmed: true, artifactUrl: 'https://github.com/www-infinity4/QuantaPhi/commit/abc123',
          })};
      },
    });
    assert.equal(firstRun.status, 'processed');
    assert.equal(firstRun.scanned, true);
    assert.deepEqual(executions, [1, 2]);
    assert.equal(firstRun.attempted[0].result, 'blocked');
    assert.equal(firstRun.attempted[1].result, 'changed');

    const second = await claim(d.db, AT + INTERVAL, AT + INTERVAL, 'fence-two');
    const resumed = await runPacketPass({
      db: d.db, claim: second, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: SHA, now: AT + INTERVAL + 1,
      loadCandidates: async () => {scans++; throw Error('unchanged history must not be read');},
      executePacket: async () => {executions.push('duplicate'); throw Error('must not execute');},
    });
    assert.equal(resumed.status, 'unchanged');
    assert.equal(resumed.scanned, false);
    assert.equal(scans, 1);
    assert.deepEqual(executions, [1, 2]);

    const third = await claim(d.db, AT + 2 * INTERVAL, AT + 2 * INTERVAL, 'fence-three');
    const changed = await runPacketPass({
      db: d.db, claim: third, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: NEXT, now: AT + 2 * INTERVAL + 1,
      loadCandidates: async () => {
        scans++;
        return [
          packet(1, {state: 'blocked', blockReason: 'needs owner scope'}),
          packet(2),
          packet(3, {headSha: THIRD, nextSourcePath: 'src/3.mjs', priority: 10}),
        ];
      },
      executePacket: async (work, {idempotencyKey}) => {
        executions.push(work.issue);
        return {receipt: receipt(work, work.nextAction, 'changed', idempotencyKey, {
          providerConfirmed: true, artifactUrl: 'https://github.com/www-infinity4/QuantaPhi/commit/def456',
        })};
      },
    });
    assert.equal(changed.status, 'processed');
    assert.deepEqual(executions, [1, 2, 3]);
    assert.equal(scans, 2);
    assert.ok(changed.skipped.some(item => item.issue === 1 && item.reason === 'unchanged_blocker'));
    assert.ok(changed.skipped.some(item => item.issue === 2 && item.reason === 'already_receipted'));
  } finally {d.close();}
});

test('foreign active leases and safety holds are reported without invoking the executor', async () => {
  const d = database();
  try {
    const lease = await claim(d.db, AT, AT, 'fence-safe');
    let executions = 0;
    const result = await runPacketPass({
      db: d.db, claim: lease, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: SHA, now: AT + 1,
      loadCandidates: async () => [
        packet(10, {lease: {verified: true, active: true, holder: 'another-owner'}}),
        packet(11, {securityHold: true}),
      ],
      executePacket: async () => {executions++; throw Error('safety gate must stop execution');},
    });
    assert.equal(result.status, 'exhausted');
    assert.equal(executions, 0);
    assert.deepEqual(result.skipped.map(item => item.reason), ['foreign_active_lease', 'safety_hold']);
  } finally {d.close();}
});

test('a stale or foreign coordinator fence cannot scan or execute packets', async () => {
  const d = database();
  try {
    const current = await claim(d.db, AT, AT, 'current-fence');
    const stale = {...current, fence: 'stale-fence'};
    let scans = 0;
    const result = await runPacketPass({
      db: d.db, claim: stale, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: SHA, now: AT + 1,
      loadCandidates: async () => {scans++; return [packet(1)];},
      executePacket: async () => {throw Error('must not execute');},
    });
    assert.equal(result.status, 'lease_lost');
    assert.equal(scans, 0);
  } finally {d.close();}
});
