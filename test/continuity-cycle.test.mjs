import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker, {INTERVAL, LEASE, TRACKS, claimCycle, finishCycle, observe, runCycle}
  from '../workers/continuity-session-coordinator/worker.mjs';

const SHA = 'a'.repeat(40), OTHER = 'b'.repeat(40);
const AT = Math.floor(Date.now() / INTERVAL) * INTERVAL;
function database() {
  const sql = new DatabaseSync(':memory:');
  const writes = [];
  const db = {prepare(query) {
    let params = [];
    const statement = {
      bind(...values) {params = values; return statement;},
      async run() {
        writes.push(query);
        const result = sql.prepare(query).run(...params);
        return {success: true, meta: {changes: Number(result.changes)}};
      },
      async first() {return sql.prepare(query).get(...params) || null;},
      async all() {return {success: true, results: sql.prepare(query).all(...params)};},
    };
    return statement;
  }};
  return {db, sql, writes, close: () => sql.close()};
}
const json = data => Response.json(data);
const html = text => new Response(text, {headers: {'Content-Type': 'text/html; charset=utf-8'}});
function fixture() {
  const calls = [];
  const at = Date.now();
  const env = {
    CYCLE_ENABLED: 'true', SOURCE_REVISION: SHA,
    SITE: {fetch: async (url, options) => {
      calls.push({url, options});
      return html('<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>Home</body></html>');
    }},
    TRAFFIC: {fetch: async () => json({site: 'quantaphi.org', requests: 12345, pageViews: 3210,
      fetchedAt: new Date(at).toISOString(), since: '2026-09-27'})},
  };
  for (const [name, service] of [['BROWSER', 'bubbles-cloud-browser'], ['TOOLS', 'bubbles-tools'], ['CONNECTIONS', 'bubbles-connections']]) {
    env[name] = {fetch: async (url, options) => {
      calls.push({url, options});
      // Deliberate sensitive extras: never retained by the allowlisted projection.
      return json({ok: true, service, token: 'PRIVATE_UPSTREAM_SENTINEL', account: 'private@example.invalid'});
    }};
  }
  const runs = [1, 2].map(id => ({id, workflow_id: id, event: 'pull_request', head_sha: SHA,
    status: 'completed', conclusion: 'success', run_attempt: 1}));
  const fetcher = async (url, options) => {
    calls.push({url, options});
    if (url.includes('/git/ref/')) return json({ref: 'refs/heads/main', object: {sha: OTHER}});
    if (url.endsWith('/pulls/1144')) return json({number: 1144, state: 'open', draft: true, head: {sha: SHA}});
    if (url.includes('/actions/runs')) return json({total_count: runs.length, workflow_runs: runs});
    if (url.endsWith('/issues/525')) return json({number: 525, state: 'open'});
    throw Error('UNEXPECTED_URL');
  };
  return {env, fetcher, calls, runs, at};
}

test('real SQLite claims are unique per scheduled bucket, even with concurrent deliveries', async () => {
  const d = database();
  try {
    const claims = await Promise.all([
      claimCycle(d.db, AT, AT + 10, 'first'), claimCycle(d.db, AT + 20, AT + 30, 'second'),
    ]);
    assert.equal(claims.filter(x => x.claimed).length, 1);
    const row = d.sql.prepare('SELECT * FROM continuity_cycle_receipts').get();
    assert.equal(row.attempts, 1);
    assert.equal(row.scheduled_for, AT);
  } finally {d.close();}
});

test('expired lease recovery fences the old writer and completed cycles cannot replay', async () => {
  const d = database();
  try {
    const a = await claimCycle(d.db, AT, AT, 'old');
    assert.equal((await claimCycle(d.db, AT, AT + LEASE - 1, 'early')).claimed, false);
    const b = await claimCycle(d.db, AT, AT + LEASE, 'new');
    assert.equal(b.claimed, true);
    assert.equal(await finishCycle(d.db, a, {stale: true}, AT + LEASE + 1), false);
    assert.equal(await finishCycle(d.db, b, {accepted: true}, AT + LEASE + 1), true);
    assert.equal((await claimCycle(d.db, AT, AT + 10 * LEASE, 'replay')).claimed, false);
    const row = d.sql.prepare('SELECT * FROM continuity_cycle_receipts').get();
    assert.equal(row.attempts, 2);
    assert.deepEqual(JSON.parse(row.report_json), {accepted: true});
  } finally {d.close();}
});

test('a writer cannot finish after its own lease has expired', async () => {
  const d = database();
  try {
    const claim = await claimCycle(d.db, AT, AT, 'one');
    assert.equal(await finishCycle(d.db, claim, {late: true}, AT + LEASE), false);
    assert.equal(d.sql.prepare('SELECT state FROM continuity_cycle_receipts').get().state, 'running');
  } finally {d.close();}
});

test('cycle observes eight tracks, preserves private work and grants, and skips duplicate execution', async () => {
  const d = database(), f = fixture();
  try {
    d.sql.exec("CREATE TABLE work_tickets (id TEXT,request TEXT); INSERT INTO work_tickets VALUES ('existing','PRIVATE_TICKET'); CREATE TABLE owner_grants (expires_at INTEGER,revoked INTEGER); INSERT INTO owner_grants VALUES (1234,1)");
    const privateBefore = d.sql.prepare('SELECT * FROM work_tickets').get();
    const grantsBefore = d.sql.prepare('SELECT * FROM owner_grants').get();
    f.env.WORK_DB = d.db;
    const result = await runCycle(f.env, AT, {now: () => f.at, fetcher: f.fetcher, fence: 'run'});
    assert.equal(result.committed, true);
    assert.deepEqual(result.report.tracks.map(t => t.id), TRACKS.map(t => t.id));
    assert.equal(result.report.observedAuthenticatedSessions, 0);
    assert.equal(result.report.autonomousChatExecution, false);
    assert.equal(result.report.workLease, 'unclaimed');
    assert.equal(result.report.tracks.find(t => t.id === 'build').ci.passed, true);
    assert.equal(result.report.tracks.find(t => t.id === 'integra').securityValidated, false);
    assert.equal(result.report.tracks.find(t => t.id === 'work').state, 'blocked');
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE_UPSTREAM_SENTINEL|private@example|PRIVATE_TICKET/);
    const callCount = f.calls.length;
    const duplicate = await runCycle(f.env, AT + 1, {now: () => f.at, fetcher: f.fetcher, fence: 'duplicate'});
    assert.equal(duplicate.started, false);
    assert.equal(f.calls.length, callCount);
    assert.deepEqual(d.sql.prepare('SELECT * FROM work_tickets').get(), privateBefore);
    assert.deepEqual(d.sql.prepare('SELECT * FROM owner_grants').get(), grantsBefore);
    assert.ok(d.writes.every(q => q.includes('continuity_cycle_receipts')));
    for (const call of f.calls) {
      assert.equal(call.options.method, 'GET');
      assert.equal(call.options.headers.Authorization, undefined);
      assert.equal(call.options.headers.Cookie, undefined);
      assert.equal(call.options.redirect, 'manual');
    }
  } finally {d.close();}
});

test('public routes never dispatch, accept a token or claim a cycle', async () => {
  const d = database(), f = fixture();
  try {
    f.env.WORK_DB = d.db;
    const url = 'https://monitor.invalid/';
    for (const path of ['run', 'start', 'dispatch', 'sessions', 'lease', 'status']) {
      const response = await worker.fetch(new Request(url + path, {method: 'POST',
        headers: {Authorization: 'Bearer OWNER_SENTINEL'}, body: '{}'}), f.env);
      assert.equal(response.status, 405);
    }
    const health = await worker.fetch(new Request(url + 'health?token=OWNER_SENTINEL'), f.env);
    assert.equal(health.status, 200);
    assert.equal((await health.json()).observedAuthenticatedSessions, 0);
    assert.equal(d.writes.length, 0);
  } finally {d.close();}
});

test('disabled or unpinned deployments do not start a cycle', async () => {
  const f = fixture();
  assert.deepEqual(await runCycle({...f.env, CYCLE_ENABLED: 'false'}, AT), {started: false, reason: 'cycle_disabled'});
  await assert.rejects(runCycle({...f.env, SOURCE_REVISION: 'main'}, AT), /configuration_missing/);
  assert.equal(f.calls.length, 0);
});

test('upstream errors stay explicit, without blocking independent observations or inventing sign-in', async () => {
  const f = fixture();
  f.env.BROWSER.fetch = async () => html('<html>Sign in</html>');
  f.env.CONNECTIONS.fetch = async () => new Response('private error', {status: 503});
  const report = await observe(f.env, async () => new Response('rate limited', {status: 429}), f.at, 1);
  assert.equal(report.tracks.find(t => t.id === 'history').state, 'unreachable');
  assert.equal(report.tracks.find(t => t.id === 'build').state, 'unreachable');
  assert.equal(report.tracks.find(t => t.id === 'design').state, 'checked');
  const qa = report.tracks.find(t => t.id === 'qa');
  assert.equal(qa.state, 'attention');
  assert.equal(qa.authenticatedAcceptance, false);
  assert.equal(report.observedAuthenticatedSessions, 0);
  assert.doesNotMatch(JSON.stringify(report), /private error|<html>/);
});

test('wrong-revision CI and truncated run inventories cannot pass', async () => {
  const f = fixture(), original = f.fetcher;
  for (const bad of [
    {total_count: 2, workflow_runs: [{...f.runs[0], head_sha: OTHER}]},
    {total_count: 301, workflow_runs: f.runs},
    {total_count: 0, workflow_runs: []},
  ]) {
    const report = await observe(f.env, (url, opts) => url.includes('/actions/runs') ? json(bad) : original(url, opts), f.at, 1);
    assert.notEqual(report.tracks.find(t => t.id === 'build').ci?.passed, true);
  }
});

test('latest workflow rerun wins, while failed or pending current checks remain visible', async () => {
  const f = fixture();
  f.runs.push({...f.runs[0], id: 10, conclusion: 'failure'});
  let report = await observe(f.env, f.fetcher, f.at, 1);
  let build = report.tracks.find(t => t.id === 'build');
  assert.equal(build.ci.passed, false);
  assert.equal(build.ci.failed, 1);
  f.runs.push({...f.runs[0], id: 11});
  report = await observe(f.env, f.fetcher, f.at, 1);
  assert.equal(report.tracks.find(t => t.id === 'build').ci.passed, true);
  f.runs.push({...f.runs[1], id: 12, status: 'in_progress', conclusion: null});
  report = await observe(f.env, f.fetcher, f.at, 1);
  build = report.tracks.find(t => t.id === 'build');
  assert.equal(build.ci.passed, false);
  assert.equal(build.ci.pending, 1);
});

test('oversized upstream bodies and stale traffic are flagged with bounded public receipts', async () => {
  const f = fixture();
  f.env.SITE.fetch = async () => html('<html>' + 'x'.repeat(1_048_576));
  f.env.TRAFFIC.fetch = async () => json({site: 'quantaphi.org', requests: 5, pageViews: 2,
    fetchedAt: new Date(f.at - 2 * 60 * 60_000).toISOString(), since: '2026-09-27'});
  const report = await observe(f.env, f.fetcher, f.at, 1);
  assert.equal(report.tracks.find(t => t.id === 'design').detail, 'upstream_too_large');
  const ops = report.tracks.find(t => t.id === 'operations');
  assert.equal(ops.state, 'attention');
  assert.equal(ops.traffic.fresh, false);
  assert.equal(ops.traffic.lifetimeVerified, false);
});

test('status freshness follows last completed receipt, and delayed cron cannot replace a newer cycle', async () => {
  const d = database(), f = fixture();
  try {
    f.env.WORK_DB = d.db;
    const newer = await claimCycle(d.db, AT, f.at, 'newer');
    const report = await observe(f.env, f.fetcher, f.at, newer.id);
    assert.equal(await finishCycle(d.db, newer, report, f.at), true);
    const older = await claimCycle(d.db, AT - INTERVAL, f.at, 'older');
    assert.equal(await finishCycle(d.db, older, {...report, cycleId: older.id}, f.at + 1), true);
    let response = await worker.fetch(new Request('https://monitor.invalid/status'), f.env);
    assert.equal(response.status, 200);
    assert.equal((await response.json()).report.cycleId, newer.id);
    d.sql.prepare('UPDATE continuity_cycle_receipts SET completed_at=?').run(f.at - 3 * INTERVAL);
    response = await worker.fetch(new Request('https://monitor.invalid/status'), f.env);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).fresh, false);
  } finally {d.close();}
});

test('retention only prunes its own old telemetry, preserving fresh cycles', async () => {
  const d = database(), f = fixture();
  try {
    f.env.WORK_DB = d.db;
    await claimCycle(d.db, AT - 8 * 86_400_000, f.at, 'old');
    await runCycle(f.env, AT, {now: () => f.at, fetcher: f.fetcher, fence: 'fresh'});
    const rows = d.sql.prepare('SELECT scheduled_for FROM continuity_cycle_receipts').all();
    assert.deepEqual(rows.map(x => x.scheduled_for), [AT]);
  } finally {d.close();}
});

test('source cache reduces calls, preserves observation age and marks failed refreshes stale', async () => {
  const d = database(), f = fixture();
  try {
    f.env.WORK_DB = d.db;
    let requests = 0;
    const fetcher = (url, opts) => {requests++; return f.fetcher(url, opts);};
    const first = await runCycle(f.env, AT, {now: () => f.at, fetcher, fence: 'first'});
    assert.equal(requests, 4);
    const observedAt = first.report.tracks.find(t => t.id === 'build').observedAt;
    let current = await runCycle(f.env, AT + INTERVAL, {
      now: () => f.at + INTERVAL, fetcher, fence: 'second',
    });
    assert.equal(requests, 4, 'a five-minute cycle must not repeat the source requests');
    assert.equal(current.report.tracks.find(t => t.id === 'build').state, 'cached');
    assert.equal(current.report.tracks.find(t => t.id === 'build').observedAt, observedAt);
    const denied = async () => {requests++; return new Response('restricted', {status: 403});};
    current = await runCycle(f.env, AT + 3 * INTERVAL, {
      now: () => f.at + 3 * INTERVAL, fetcher: denied, fence: 'refresh',
    });
    const stale = current.report.tracks.find(t => t.id === 'build');
    assert.equal(stale.state, 'stale');
    assert.equal(stale.observedAt, observedAt, 'reuse cannot renew verification time');
    assert.equal(stale.refreshError, 'upstream_http_403');
    assert.equal(stale.sourceState, 'checked');
    assert.match(stale.detail, /Current read failed/);
    const hold = current.report.tracks.find(t => t.id === 'integra');
    assert.equal(hold.sourceState, 'blocked');
    assert.equal(hold.executionAllowed, false);
    current = await runCycle(f.env, AT + 13 * INTERVAL, {
      now: () => f.at + 13 * INTERVAL, fetcher: denied, fence: 'expired',
    });
    assert.equal(current.report.tracks.find(t => t.id === 'build').state, 'unreachable');
    assert.equal(current.report.tracks.find(t => t.id === 'build').ci, undefined);
  } finally {d.close();}
});

test('future-dated or wrong-resource cache entries cannot suppress a real source read', async () => {
  const f = fixture(); let requests = 0;
  const bad = {build: {id: 'build', url: 'https://github.com/other/repo/pull/1144',
    sourceState: 'checked', observedAt: new Date(f.at).toISOString()}};
  let report = await observe(f.env, (url, opts) => {requests++; return f.fetcher(url, opts);}, f.at, 1, bad);
  assert.equal(report.tracks.find(t => t.id === 'build').state, 'checked');
  assert.equal(requests, 4);
  bad.build.url = 'https://github.com/www-infinity4/QuantaPhi/pull/1144';
  bad.build.observedAt = new Date(f.at + INTERVAL).toISOString();
  report = await observe(f.env, async () => new Response('denied', {status: 403}), f.at, 2, bad);
  assert.equal(report.tracks.find(t => t.id === 'build').state, 'unreachable');
});
