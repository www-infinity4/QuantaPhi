/* Five-minute observation cycle. Existing Brain tickets and grants remain authoritative.
 * No chat/session execution adapter, work queue, credential or owner impersonation.
 */
import {PAGE, STYLE, APP} from './view.mjs';
export const INTERVAL = 300_000;
export const LEASE = 120_000;
const RETENTION = 7 * 86_400_000;
const SHA = /^[a-f0-9]{40}$/;
const API = 'https://api.github.com/repos/www-infinity4/QuantaPhi';
const PROTOCOL = 'continuity-cycle-v1';
const SOURCE_TTL = 15 * 60_000;
const SOURCE_MAX_AGE = 60 * 60_000;
// Prior independently verified PR #1144 workflow inventory had 37 distinct workflows.
// A one-run GitHub API response is not proof of full current-head CI coverage.
const PR1144_WORKFLOW_FLOOR = 37;
const SOURCE_URLS = Object.freeze({
  history: 'https://github.com/www-infinity4/QuantaPhi',
  build: 'https://github.com/www-infinity4/QuantaPhi/pull/1144',
  integra: 'https://github.com/www-infinity4/QuantaPhi/issues/525',
});
const PUBLIC_PROBES = Object.freeze({
  SITE: 'https://quantaphi.org/',
  BROWSER: 'https://bubbles-cloud-browser.marvaseater.workers.dev/health',
  TOOLS: 'https://bubbles-tools.marvaseater.workers.dev/health',
  CONNECTIONS: 'https://quantaphi.org/api/bubbles/connections/health',
  TRAFFIC: 'https://quantaphi.org/api/site-traffic',
});
export const TRACKS = Object.freeze([
  ['coordinator', 'Coordinator'], ['history', 'Research & history'],
  ['design', 'Product & design'], ['build', 'Build & integration'],
  ['integra', 'Integra validation'], ['qa', 'QA & live checks'],
  ['operations', 'Operations & Gemini collection'], ['work', 'Reserved Work runner'],
].map(([id, label]) => Object.freeze({id, label})));

const SCHEMA = `CREATE TABLE IF NOT EXISTS continuity_cycle_receipts (
  cycle_id INTEGER PRIMARY KEY, scheduled_for INTEGER NOT NULL,
  started_at INTEGER NOT NULL, lease_until INTEGER NOT NULL,
  fence TEXT NOT NULL, attempts INTEGER NOT NULL,
  state TEXT NOT NULL CHECK(state IN ('running','complete','failed')),
  completed_at INTEGER, report_json TEXT
)`;

export async function claimCycle(db, scheduledFor, now, fence) {
  if (!Number.isSafeInteger(scheduledFor) || scheduledFor < 0 ||
      !Number.isSafeInteger(now) || now < scheduledFor || typeof fence !== 'string' || !fence)
    throw Error('invalid_cycle_claim');
  const id = Math.floor(scheduledFor / INTERVAL);
  await db.prepare(SCHEMA).run();
  const result = await db.prepare(`INSERT INTO continuity_cycle_receipts
    (cycle_id,scheduled_for,started_at,lease_until,fence,attempts,state)
    VALUES(?,?,?,?,?,1,'running') ON CONFLICT(cycle_id) DO UPDATE SET
    started_at=excluded.started_at,lease_until=excluded.lease_until,
    fence=excluded.fence,attempts=continuity_cycle_receipts.attempts+1,state='running'
    WHERE continuity_cycle_receipts.state!='complete' AND continuity_cycle_receipts.lease_until<=?`)
    .bind(id, id * INTERVAL, now, now + LEASE, fence, now).run();
  if (result?.success === false) throw Error('cycle_claim_unavailable');
  return {id, fence, claimed: result?.meta?.changes === 1};
}

export async function finishCycle(db, claim, report, now, state = 'complete') {
  if (!['complete', 'failed'].includes(state)) throw Error('invalid_cycle_state');
  const result = await db.prepare(`UPDATE continuity_cycle_receipts SET
    state=?,completed_at=?,report_json=? WHERE cycle_id=? AND fence=?
    AND state='running' AND lease_until>?`)
    .bind(state, now, JSON.stringify(report), claim.id, claim.fence, now).run();
  if (result?.success === false) throw Error('cycle_receipt_unavailable');
  return result?.meta?.changes === 1;
}

// Read only fixed public endpoints. Never forward incoming headers or store upstream bodies.
async function boundedBody(response, max = 262_144) {
  if (!response.ok) {
    await response.body?.cancel();
    throw Error('upstream_http_' + response.status);
  }
  if (Number(response.headers.get('content-length')) > max) {
    await response.body?.cancel();
    throw Error('upstream_too_large');
  }
  const reader = response.body?.getReader();
  if (!reader) throw Error('upstream_empty');
  const parts = []; let size = 0;
  try {
    for (;;) {
      const {done, value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {await reader.cancel(); throw Error('upstream_too_large');}
      parts.push(value);
    }
  } finally {reader.releaseLock();}
  const data = new Uint8Array(size); let offset = 0;
  for (const part of parts) {data.set(part, offset); offset += part.byteLength;}
  return new TextDecoder().decode(data);
}

async function read(fetcher, url, kind = 'json', max) {
  const response = await fetcher(url, {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(10_000),
    headers: {Accept: kind === 'json' ? 'application/json' : 'text/html',
      'User-Agent': 'QuantaPhi-Continuity/1.0', 'Cache-Control': 'no-cache'},
  });
  const text = await boundedBody(response, max);
  if (kind === 'html') {
    if (!response.headers.get('content-type')?.includes('text/html') || !/<html\b/i.test(text))
      throw Error('upstream_html_invalid');
    return {text, source: response.headers.get('x-continuity-source')};
  }
  try {return JSON.parse(text);} catch {throw Error('upstream_json_invalid');}
}

function failure(error) {
  const code = String(error?.message || '');
  return /^(?:upstream_(?:http_\d{3}|too_large|empty|html_invalid|json_invalid)|schema_invalid|binding_missing)$/.test(code)
    ? code : 'upstream_unavailable';
}
const track = (id, state, detail, evidence = {}) => ({
  id, label: TRACKS.find(t => t.id === id).label, state, detail, ...evidence,
});
async function inspect(id, action) {
  try {return await action();}
  catch (error) {return track(id, 'unreachable', failure(error));}
}
function binding(env, name) {
  if (!env[name]?.fetch) throw Error('binding_missing');
  return (url, options) => env[name].fetch(url, options);
}

async function publicProbe(env, name, url, kind, max, fetcher) {
  try {return {data: await read(binding(env, name), url, kind, max), transport: 'service-binding', internalError: null};}
  catch (error) {
    const reason = failure(error);
    // Only these fixed, credential-free public reads may fall back on transport
    // errors. Never turn an auth denial, invalid body or size limit into a retry.
    if (!Object.hasOwn(PUBLIC_PROBES, name) ||
        !/^(upstream_unavailable|binding_missing|upstream_http_50[234])$/.test(reason)) throw error;
    return {data: await read(fetcher, PUBLIC_PROBES[name], kind, max),
      transport: 'public-fallback', internalError: reason};
  }
}

// This cache contains public source observations only. It cannot authorize work
// or turn an older CI result into current-head/release acceptance.
export async function sourceCache(db, at) {
  const cache = {};
  try {
    const rows = await db.prepare(`SELECT report_json FROM continuity_cycle_receipts
      WHERE state='complete' ORDER BY cycle_id DESC LIMIT 13`).all();
    for (const row of rows.results || []) {
      let report; try {report = JSON.parse(row.report_json);} catch {continue;}
      if (report?.protocol !== PROTOCOL || !Array.isArray(report.tracks)) continue;
      for (const t of report.tracks) {
        if (!Object.hasOwn(SOURCE_URLS, t.id) || cache[t.id] || t.url !== SOURCE_URLS[t.id]) continue;
        const sourceState = t.sourceState || t.state;
        const stamp = Date.parse(t.observedAt || report.checkedAt);
        if (!['checked', 'blocked'].includes(sourceState) || !Number.isFinite(stamp) ||
            stamp > at || at - stamp > SOURCE_MAX_AGE) continue;
        // Older deployed versions incorrectly marked one successful workflow as
        // full CI coverage. Never carry that legacy verdict into a corrected
        // coordinator through the public-source cache.
        if (t.id === 'build') {
          const ci = t.ci;
          if (!ci || ci.expectedMinimum !== PR1144_WORKFLOW_FLOOR ||
              typeof ci.responseComplete !== 'boolean' ||
              typeof ci.coverageComplete !== 'boolean' ||
              !Number.isSafeInteger(ci.observed) ||
              ci.coverageComplete !== (ci.responseComplete &&
                ci.observed >= PR1144_WORKFLOW_FLOOR) ||
              (ci.passed === true && (!ci.coverageComplete || ci.success !== ci.observed)))
            continue;
        }
        cache[t.id] = {...t, sourceState, sourceDetail: t.sourceDetail || t.detail,
          observedAt: new Date(stamp).toISOString()};
      }
    }
  } catch {/* Missing history never blocks fresh, bounded source reads. */}
  return cache;
}

function savedSource(prior, state, error) {
  return {...prior, state, cached: true,
    detail: (error ? 'Current read failed (' + error + '). ' : '') +
      'Saved source check from ' + prior.observedAt + '. ' + prior.sourceDetail,
    refreshError: error || null};
}

export async function observe(env, fetcher, at, cycleId, cache = {}) {
  const checkedAt = new Date(at).toISOString();
  async function source(id, action) {
    const prior = cache[id];
    const age = at - Date.parse(prior?.observedAt);
    const valid = prior && prior.url === SOURCE_URLS[id] &&
      ['checked', 'blocked'].includes(prior.sourceState) &&
      Number.isFinite(age) && age >= 0 && age <= SOURCE_MAX_AGE;
    if (valid && age < SOURCE_TTL) return savedSource(prior, 'cached');
    const current = await inspect(id, action);
    if (current.state !== 'unreachable') return {...current, observedAt: checkedAt};
    return valid ? savedSource(prior, 'stale', current.detail) : current;
  }
  const results = await Promise.all([
    source('history', async () => {
      const doc = await read(fetcher, API + '/git/ref/heads/main');
      if (!SHA.test(doc?.object?.sha) || doc.ref !== 'refs/heads/main') throw Error('schema_invalid');
      return track('history', 'checked', 'Current public main revision read', {
        sourceRevision: doc.object.sha, url: 'https://github.com/www-infinity4/QuantaPhi',
      });
    }),
    inspect('design', async () => {
      const probe = await publicProbe(env, 'SITE', 'https://quantaphi.org/', 'html', 1_048_576, fetcher);
      const page = probe.data;
      const viewport = /<meta\b[^>]*name=["']viewport["']/i.test(page.text);
      return track('design', viewport && !probe.internalError ? 'checked' : 'attention',
        (viewport ? 'Public home HTML and mobile viewport declaration read; visual acceptance remains separate'
          : 'Home HTML has no verified mobile viewport declaration') +
          (probe.internalError ? '. Public endpoint verified; internal routing needs attention' : ''),
        {url: 'https://quantaphi.org/', visualAcceptance: false,
          transport: probe.transport, internalProbeError: probe.internalError});
    }),
    source('build', async () => {
      const pr = await read(fetcher, API + '/pulls/1144');
      if (pr?.number !== 1144 || !SHA.test(pr?.head?.sha) || !['open', 'closed'].includes(pr.state))
        throw Error('schema_invalid');
      const doc = await read(fetcher, API + '/actions/runs?head_sha=' + pr.head.sha + '&per_page=100', 'json', 1_048_576);
      if (!Number.isInteger(doc.total_count) || !Array.isArray(doc.workflow_runs)) throw Error('schema_invalid');
      // Workflow reruns may coexist. Use the latest run/attempt for each workflow and event.
      const runs = new Map();
      for (const run of doc.workflow_runs) {
        if (run.head_sha !== pr.head.sha || !Number.isSafeInteger(run.id) || !run.workflow_id || !run.event)
          throw Error('schema_invalid');
        const key = run.workflow_id + ':' + run.event, prior = runs.get(key);
        if (!prior || run.id > prior.id || (run.id === prior.id && run.run_attempt > prior.run_attempt)) runs.set(key, run);
      }
      const values = [...runs.values()];
      const success = values.filter(r => r.status === 'completed' && r.conclusion === 'success').length;
      const failed = values.filter(r => r.status === 'completed' && !['success', 'skipped', 'neutral'].includes(r.conclusion)).length;
      const pending = values.filter(r => r.status !== 'completed').length;
      const responseComplete = doc.total_count <= doc.workflow_runs.length;
      const coverageComplete = responseComplete && values.length >= PR1144_WORKFLOW_FLOOR;
      const ciPassed = coverageComplete && success === values.length;
      return track('build', failed ? 'attention' : ciPassed ? 'checked' : 'blocked',
        'PR #1144: ' + success + '/' + values.length + ' observed workflows successful' +
          (coverageComplete ? '' : '; CI inventory incomplete (minimum ' + PR1144_WORKFLOW_FLOOR + ' distinct workflows required)') + '; ' +
          (pr.draft ? 'draft' : pr.merged_at ? 'merged' : pr.state) + '; production acceptance is separate', {
        url: 'https://github.com/www-infinity4/QuantaPhi/pull/1144', sourceRevision: pr.head.sha,
        ci: {success, failed, pending, observed: values.length, expectedMinimum: PR1144_WORKFLOW_FLOOR,
          responseComplete, coverageComplete, passed: ciPassed},
        draft: pr.draft === true, merged: Boolean(pr.merged_at), deploymentVerified: false,
      });
    }),
    source('integra', async () => {
      const issue = await read(fetcher, API + '/issues/525');
      if (issue?.number !== 525 || !['open', 'closed'].includes(issue.state)) throw Error('schema_invalid');
      return track('integra', 'blocked', issue.state === 'open'
        ? 'APK security hold #525 remains open; no release authority granted'
        : 'Hold issue closed; independent release acceptance still required', {
        url: 'https://github.com/www-infinity4/QuantaPhi/issues/525', issueState: issue.state,
        securityValidated: false, executionAllowed: false,
      });
    }),
    inspect('qa', async () => {
      const targets = [
        ['BROWSER', 'https://bubbles-cloud-browser.internal/health', 'bubbles-cloud-browser'],
        ['TOOLS', 'https://bubbles-tools.internal/health', 'bubbles-tools'],
        ['CONNECTIONS', 'https://quantaphi.org/api/bubbles/connections/health', 'bubbles-connections'],
      ];
      const probes = await Promise.all(targets.map(async ([name, url, service]) => {
        try {
          const probe = await publicProbe(env, name, url, 'json', undefined, fetcher);
          const doc = probe.data;
          if (doc?.ok !== true || doc.service !== service) throw Error('schema_invalid');
          return {service, state: 'reachable', transport: probe.transport, internalProbeError: probe.internalError};
        } catch (error) {return {service, state: 'unreachable', reason: failure(error)};}
      }));
      return track('qa', probes.every(p => p.state === 'reachable' && !p.internalProbeError) ? 'checked' : 'attention',
        (probes.some(p => p.internalProbeError) ? 'Public endpoint comparison completed; internal routing needs attention. ' : '') +
        'Public service health checks; authenticated sign-in, model responses and Android acceptance remain unverified',
        {probes, authenticatedAcceptance: false});
    }),
    inspect('operations', async () => {
      const probe = await publicProbe(env, 'TRAFFIC', 'https://quantaphi.org/api/site-traffic', 'json', undefined, fetcher);
      const doc = probe.data;
      const stamp = Date.parse(doc?.fetchedAt);
      if (doc.site !== 'quantaphi.org' || !Number.isFinite(stamp) || stamp > at + 60_000 ||
          !Number.isSafeInteger(doc.requests) || doc.requests < 0 ||
          !Number.isSafeInteger(doc.pageViews) || doc.pageViews < 0) throw Error('schema_invalid');
      const fresh = at - stamp <= 60 * 60_000;
      return track('operations', fresh && !probe.internalError ? 'checked' : 'attention',
        (fresh ? 'Traffic data refreshed within one hour; Gemini batching awaits an authorized runtime adapter'
          : 'Traffic data older than one hour; inspect the existing traffic refresh service') +
          (probe.internalError ? '. Public endpoint verified; internal routing needs attention' : ''), {
        url: 'https://quantaphi.org/api/site-traffic', traffic: {
          requests: doc.requests, pageViews: doc.pageViews, fetchedAt: doc.fetchedAt,
          since: /^\d{4}-\d{2}-\d{2}$/.test(doc.since || '') ? doc.since : null,
          lifetimeVerified: false, fresh,
        }, geminiRuntimeConnected: false, transport: probe.transport, internalProbeError: probe.internalError,
      });
    }),
  ]);
  return {
    protocol: PROTOCOL, cycleId, checkedAt, intervalSeconds: INTERVAL / 1000,
    sourceRevision: SHA.test(env.SOURCE_REVISION || '') ? env.SOURCE_REVISION : null,
    mode: 'observation', engineeringTask: 'hourly',
    observedAuthenticatedSessions: 0, autonomousChatExecution: false,
    workLease: 'unclaimed', ownerPresence: 'unknown',
    tracks: [track('coordinator', 'checked', 'Five-minute cycle claimed with a bounded fenced lease'),
      ...results,
      track('work', 'blocked', 'Authenticated ChatGPT/Work runner is not bound; owner has immediate priority')],
  };
}

export async function runCycle(env, scheduledFor, {now = Date.now, fetcher = fetch, fence = crypto.randomUUID()} = {}) {
  if (env.CYCLE_ENABLED !== 'true') return {started: false, reason: 'cycle_disabled'};
  if (!env.WORK_DB || !SHA.test(env.SOURCE_REVISION || '')) throw Error('coordinator_configuration_missing');
  const claim = await claimCycle(env.WORK_DB, scheduledFor, now(), fence);
  if (!claim.claimed) return {started: false, reason: 'cycle_already_claimed_or_complete'};
  try {
    const cache = await sourceCache(env.WORK_DB, now());
    const report = await observe(env, fetcher, now(), claim.id, cache);
    const committed = await finishCycle(env.WORK_DB, claim, report, now());
    if (!committed) throw Error('cycle_lease_lost');
    // Retain seven days of public monitoring receipts. Never touch work_tickets or grants.
    try {
      await env.WORK_DB.prepare('DELETE FROM continuity_cycle_receipts WHERE scheduled_for<?')
        .bind(now() - RETENTION).run();
    } catch {console.warn(JSON.stringify({event: PROTOCOL, retention: 'deferred'}));}
    console.log(JSON.stringify({event: PROTOCOL, cycleId: claim.id, tracks: report.tracks.length,
      attention: report.tracks.filter(t => ['attention', 'unreachable', 'stale'].includes(t.state)).map(t => t.id)}));
    return {started: true, committed: true, report};
  } catch {
    await finishCycle(env.WORK_DB, claim, {protocol: PROTOCOL, error: 'cycle_failed'}, now(), 'failed');
    throw Error('cycle_failed');
  }
}

const HEADERS = {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"};
const json = (value, status = 200) => Response.json(value, {status, headers: HEADERS});
export default {
  async scheduled(controller, env) {await runCycle(env, controller.scheduledTime);},
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    // Public reads never start a cycle, acquire a Work lease, dispatch or accept credentials.
    if (request.method !== 'GET') return json({ok: false, error: 'method_not_allowed'}, 405);
    const asset = path === '/' ? [PAGE, 'text/html; charset=utf-8']
      : path === '/style.css' ? [STYLE, 'text/css; charset=utf-8']
      : path === '/app.js' ? [APP, 'text/javascript; charset=utf-8'] : null;
    if (asset) return new Response(asset[0], {headers: {...HEADERS, 'Content-Type': asset[1],
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"}});
    if (path === '/health') return json({ok: true, service: 'continuity-session-coordinator',
      mode: 'observation', cycleEnabled: env.CYCLE_ENABLED === 'true',
      sourceRevision: SHA.test(env.SOURCE_REVISION || '') ? env.SOURCE_REVISION : null,
      configuredTracks: TRACKS.length, observedAuthenticatedSessions: 0});
    if (path !== '/status') return json({ok: false, error: 'not_found'}, 404);
    try {
      const row = await env.WORK_DB.prepare(`SELECT scheduled_for,completed_at,report_json
        FROM continuity_cycle_receipts WHERE state='complete' ORDER BY cycle_id DESC LIMIT 1`).first();
      if (!row) return json({ok: false, error: 'no_completed_cycle', configuredTracks: TRACKS.length}, 503);
      const report = JSON.parse(row.report_json);
      if (report?.protocol !== PROTOCOL || report.tracks?.length !== TRACKS.length) throw Error();
      const ageMs = Date.now() - row.completed_at;
      const fresh = ageMs >= 0 && ageMs <= 2 * INTERVAL;
      return json({ok: fresh, fresh, scheduledFor: new Date(row.scheduled_for).toISOString(),
        completedAt: new Date(row.completed_at).toISOString(), ageSeconds: Math.floor(ageMs / 1000), report}, fresh ? 200 : 503);
    } catch {return json({ok: false, error: 'cycle_receipt_unavailable'}, 503);}
  },
};
