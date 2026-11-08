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

test('expired live coordinator lease stops the second packet rather than using a stale timestamp', async () => {
  const d = database();
  try {
    const lease = await claim(d.db, AT, AT, 'fence-clock');
    let currentTime = AT + 1;
    const invoked = [];
    const result = await runPacketPass({
      db: d.db, claim: lease, ownerScope: OWNER_SCOPE, ownerId: OWNER,
      sourceVersion: SHA, now: () => currentTime,
      loadCandidates: async () => [packet(21), packet(22)],
      executePacket: async (work, {idempotencyKey}) => {
        invoked.push(work.issue);
        if (work.issue === 21) currentTime = AT + LEASE + 1;
        return {receipt: receipt(work, work.nextAction, 'changed', idempotencyKey, {
          providerConfirmed: true,
          artifactUrl: 'https://github.com/www-infinity4/QuantaPhi/commit/' + SHA,
        })};
      },
    });
    assert.equal(result.status, 'lease_lost');
    assert.deepEqual(invoked, [21], 'fence expiry must prevent the second provider action');
    assert.deepEqual(result.attempted.map(x => x.issue), [21]);
  } finally {d.close();}
});

test('unchanged source resumes the unprocessed fourth packet without reloading history', async () => {
  const d = database();
  try {
    let reads=0, executed=[];
    const first=await claim(d.db,AT,AT,'bounded-a');
    const run=async (cycle,at) => runPacketPass({
      db:d.db,claim:cycle,ownerScope:OWNER_SCOPE,ownerId:OWNER,
      sourceVersion:SHA,now:at,limit:2,
      loadCandidates:async()=>{reads++;if(reads>1)throw Error('history reread');return [packet(1),packet(2),packet(3),packet(4)];},
      executePacket:async(work,{idempotencyKey})=>{
        executed.push(work.issue);
        return {receipt:receipt(work,work.nextAction,'changed',idempotencyKey,{
          providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/commit/'+SHA,
        })};
      },
    });
    assert.equal((await run(first,AT+1)).status,'processed');
    const second=await claim(d.db,AT+INTERVAL,AT+INTERVAL,'bounded-b');
    assert.equal((await run(second,AT+INTERVAL+1)).status,'processed');
    assert.deepEqual(executed,[1,2,3,4]);
    assert.equal(reads,1);
  }finally{d.close();}
});

test('reader failure releases its checkpoint so next valid lease can retry same source version',async()=>{
  const d=database();
  try{
    const first=await claim(d.db,AT,AT,'reader-a');
    const opts=(cycle,now,loadCandidates)=>({
      db:d.db,claim:cycle,ownerScope:OWNER_SCOPE,ownerId:OWNER,sourceVersion:SHA,now,
      loadCandidates,executePacket:async(work,{idempotencyKey})=>({
        receipt:receipt(work,work.nextAction,'blocked',idempotencyKey,{reason:'safe reader retry'})
      })
    });
    const failed=await runPacketPass(opts(first,AT+1,async()=>{throw Error('transient D1 read')}));
    assert.equal(failed.status,'reconciliation_required');
    const next=await claim(d.db,AT+INTERVAL,AT+INTERVAL,'reader-b');
    const resumed=await runPacketPass(opts(next,AT+INTERVAL+1,async()=>[packet(9)]));
    assert.equal(resumed.status,'processed');
    assert.deepEqual(resumed.attempted.map(x=>x.issue),[9]);
  }finally{d.close();}
});

test('mislabelled review receipt cannot complete an edit-code packet',async()=>{
  const d=database();
  try{
    const lease=await claim(d.db,AT,AT,'receipt-match');
    const result=await runPacketPass({
      db:d.db,claim:lease,ownerScope:OWNER_SCOPE,ownerId:OWNER,sourceVersion:SHA,now:AT+1,
      loadCandidates:async()=>[packet(31)],
      executePacket:async(work,{idempotencyKey})=>({
        receipt:receipt(work,'request_review','reviewed',idempotencyKey,{
          providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/pull/31'
        })
      })
    });
    assert.equal(result.status,'reconciliation_required');
    const row=await d.db.prepare('SELECT result_json FROM continuity_packet_checkpoints WHERE owner_scope=?').bind(OWNER_SCOPE).first();
    const persisted=JSON.parse(row.result_json);
    assert.ok(persisted.inFlight,'operation identity must remain for reconciliation');
    assert.equal((persisted.done||[]).length,0);
  }finally{d.close();}
});

test('provider writes see a pending operation receipt before dispatch and earlier success survives later error',async()=>{
  const d=database();
  try{
    const lease=await claim(d.db,AT,AT,'durable-steps');
    let calls=0;
    const result=await runPacketPass({
      db:d.db,claim:lease,ownerScope:OWNER_SCOPE,ownerId:OWNER,sourceVersion:SHA,now:AT+1,
      loadCandidates:async()=>[packet(45),packet(46)],
      executePacket:async(work,{idempotencyKey})=>{
        const row=await d.db.prepare('SELECT result_json FROM continuity_packet_checkpoints WHERE owner_scope=?').bind(OWNER_SCOPE).first();
        assert.equal(JSON.parse(row.result_json).inFlight.idempotencyKey,idempotencyKey);
        if(++calls===2)throw Error('provider interrupted');
        return {receipt:receipt(work,work.nextAction,'changed',idempotencyKey,{
          providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/commit/'+SHA
        })};
      }
    });
    assert.equal(result.status,'reconciliation_required');
    const saved=JSON.parse((await d.db.prepare('SELECT result_json FROM continuity_packet_checkpoints WHERE owner_scope=?').bind(OWNER_SCOPE).first()).result_json);
    assert.deepEqual(saved.attempted.map(x=>x.issue),[45]);
    assert.equal(saved.receipts.length,1);
    assert.equal(saved.inFlight.issue,46);
  }finally{d.close();}
});

test('review at a head does not prevent a later authorized merge at that same head',async()=>{
  const d=database();
  try{
    const actions=[];
    const executePacket=async(work,{idempotencyKey})=>{
      actions.push(work.nextAction);
      return {receipt:receipt(work,work.nextAction,work.nextAction==='merge_pr'?'merged':'reviewed',idempotencyKey,{
        providerConfirmed:true,artifactUrl:'https://github.com/www-infinity4/QuantaPhi/pull/100',
        mergeSha:THIRD
      })};
    };
    const first=await claim(d.db,AT,AT,'review-first');
    const original=await runPacketPass({db:d.db,claim:first,ownerScope:OWNER_SCOPE,ownerId:OWNER,
      sourceVersion:SHA,now:AT+1,loadCandidates:async()=>[packet(100,{nextAction:'request_review'})],executePacket});
    assert.equal(original.status,'processed');
    const second=await claim(d.db,AT+INTERVAL,AT+INTERVAL,'merge-second');
    const follow=await runPacketPass({db:d.db,claim:second,ownerScope:OWNER_SCOPE,ownerId:OWNER,
      sourceVersion:NEXT,now:AT+INTERVAL+1,
      loadCandidates:async()=>[packet(100,{nextAction:'merge_pr',requiredChecksPassed:true,requiredReviewsSatisfied:true})],executePacket});
    assert.equal(follow.status,'processed');
    assert.deepEqual(actions,['request_review','merge_pr']);
  }finally{d.close();}
});
