import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {completeMeCommand, completeMeProject, startCompleteMe} from '../bubbles-complete-me.mjs';

const repository = 'www-infinity4/QuantaPhi';
const sourceSha = 'a'.repeat(40);
const project = {
  repository,
  issue: '1927',
  goal: 'Finish the scoped source milestone',
  first: 'Repair the existing project control',
  second: 'Add the dependent source integration',
  acceptance: 'Focused checks pass for both source changes',
};

test('only a fresh explicit Complete Me command opens the owner workflow', () => {
  assert.deepEqual(completeMeCommand('Complete Me AI — Finish the scoped source milestone'), {goal: project.goal});
  assert.deepEqual(completeMeCommand('complete me ai'), {goal: ''});
  assert.equal(completeMeCommand('Explain Complete Me AI — the project'), null);
  assert.equal(completeMeCommand('“Complete Me AI — the project”'), null);
});

test('requires one scoped repository and validated source before creating any jobs', async () => {
  const requests = [];
  const request = async (path, body) => {
    requests.push({path, body});
    return {ok: true, repository: 'different/Project', headSha: sourceSha};
  };
  await assert.rejects(startCompleteMe({...project, repository: 'different/Project'}, request));
  await assert.rejects(startCompleteMe({...project, issue: 'issue'}, request));
  await assert.rejects(startCompleteMe({...project, second: ''}, request));
  assert.deepEqual(requests, []);
  await assert.rejects(startCompleteMe(project, request), /source/i);
  assert.deepEqual(requests, [{path: '/work/github/read', body: {action: 'read_repository', repository}}]);
});

test('distinct Complete Me goals get separate stable project IDs, while retries reuse one',async()=>{
 const ids=[];
 const request=async(path,body)=>{
  if(path==='/work/github/read')return {ok:true,repository,headSha:sourceSha};
  assert.equal(path,'/work/tickets/create');
  ids.push(body.context.submission_id);
  return {ok:true,ticket:{id:'IW-fixture',repository,context:body.context},
   execution:{status:'queued_for_runner'},deduplicated:false};
 };
 await startCompleteMe({...project,goal:'Finish milestone A'},request);
 await startCompleteMe({...project,goal:'Finish milestone B'},request);
 await startCompleteMe({...project,goal:'Finish milestone A'},request);
 assert.notEqual(ids[0],ids[1],'two different projects cannot share a deduplication key');
 assert.equal(ids[0],ids[2],'a repeated project retains its canonical submission key');
});

const workerUrl = new URL('../workers/infinity-brain-clock/worker.js', import.meta.url);
async function loadBrain() {
  const source = (await readFile(workerUrl, 'utf8'))
    .replace("import { DurableObject } from 'cloudflare:workers';", 'class DurableObject {}')
    .replace(/(from\s+|import\(\s*)(['"])(\.\.?\/[^'"]+)\2/g,
      (_, prefix, quote, relative) => prefix + quote + new URL(relative, workerUrl).href + quote);
  return import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
}

test('the existing owner intake saves one project and the signed runner resumes its dependency chain', async t => {
  const {default: worker, BrainClock} = await loadBrain();
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  sqlite.exec(`CREATE TABLE work_tickets (
    id TEXT PRIMARY KEY, owner_hash TEXT, handoff_hash TEXT, source_app TEXT, source_url TEXT,
    repository TEXT, title TEXT, request TEXT, storyboard TEXT, context_json TEXT, status TEXT,
    claimed_by TEXT, created_at INTEGER, updated_at INTEGER, completed_at INTEGER,
    handoff_expires_at INTEGER, result_summary TEXT, result_url TEXT)`);
  const db = {prepare: sql => ({bind: (...args) => {
    const statement = sqlite.prepare(sql);
    return {
      first: async () => statement.get(...args) ?? null,
      all: async () => ({results: statement.all(...args)}),
      run: async () => ({meta: {changes: statement.run(...args).changes}}),
    };
  }})};
  const token = 'rb_' + 'b'.repeat(64);
  const ownerHash = 'c'.repeat(64);
  const durable = new Map();
  const storage = {
    get: async key => structuredClone(durable.get(key)),
    put: async (key, value) => durable.set(key, structuredClone(value)),
    delete: async key => durable.delete(key),
  };
  let auth = true;
  let clock;
  let dispatches = 0;
  const env = {WORK_DB: db, WRITER_OWNER_HASH: ownerHash, CLOCK: {idFromName: () => 'owner', get: () => ({
    fetch: async (url, init) => {
      if (url.endsWith('/owner/session-check')) return Response.json({ok: auth && JSON.parse(init.body).token === token});
      if (url.endsWith('/github/read')) return Response.json({ok: true, repository, headSha: sourceSha});
      return clock.fetch(new Request(url, init));
    },
  })}};
  function restartClock() {
    clock = new BrainClock({storage, blockConcurrencyWhile: async fn => fn()}, env);
    // GitHub workflow dispatch is the external transport in this local test.
    clock.dispatchRunner = async () => {
      dispatches++;
      return {ok: true, status: 'dispatch_accepted'};
    };
  }
  restartClock();
  const browser = async (path, body, bearer = token) => {
    const response = await worker.fetch(new Request('https://brain.test' + path, {
      method: 'POST', headers: {Origin: 'https://quantaphi.org', Authorization: 'Bearer ' + bearer},
      body: JSON.stringify(body),
    }), env);
    return response.json();
  };
  const count = () => sqlite.prepare('SELECT count(*) AS count FROM work_tickets').get().count;
  const read = id => sqlite.prepare('SELECT * FROM work_tickets WHERE id=?').get(id);
  const fixtureReceipt = (id, status, blocker = '') => {
    const row = read(id);
    const context = JSON.parse(row.context_json);
    context.color_jobs[0].status = status;
    context.color_jobs[0].progress = {blocker};
    sqlite.prepare('UPDATE work_tickets SET status=?,context_json=? WHERE id=?').run('working', JSON.stringify(context), id);
  };
  // This internal call is the existing handler after the Worker validates OIDC.
  const claim = async runId => (await clock.fetch(new Request('https://clock.internal/runner/claim', {
    method: 'POST', body: JSON.stringify({runId, runnerRepository: 'www-infinity4/Moltnook'}),
  }))).json();

  const created = await startCompleteMe(project, browser);
  const id = created.project.ticketId;
  assert.equal(created.execution.status, 'queued_for_runner');
  assert.equal(count(), 1);
  assert.equal(dispatches, 1);
  assert.equal(read(id).owner_hash, ownerHash);
  assert.deepEqual(JSON.parse(read(id).context_json).color_jobs.map(job => job.dependencies), [[], ['TASK-1']]);
  assert.equal((await browser('/work/tickets/list', {}, 'rb_' + 'd'.repeat(64))).ok, false);

  const first = (await claim('42')).lease;
  assert.equal(first.jobId, 'TASK-1');
  assert.equal(JSON.parse(read(id).context_json).color_jobs[0].status, 'working');
  restartClock();
  const repeated = await startCompleteMe(project, browser);
  assert.equal(repeated.project.ticketId, id);
  assert.equal(repeated.deduplicated, true);
  assert.equal(dispatches, 1);
  await assert.rejects(startCompleteMe({...project, second: 'A different second scope'}, browser), /already|scope/i);
  assert.equal((await claim('43')).lease, null, 'the live lease survives the worker restart');

  durable.set(first.key, {...first, leaseUntil: 0});
  durable.delete('repository-lease:' + repository);
  fixtureReceipt(id, 'blocked', 'owner_approval_required');
  const blocked = completeMeProject((await browser('/work/tickets/list', {})).tickets[0]);
  assert.equal(blocked.jobs[0].approvalRequired, true);
  assert.equal(blocked.jobs[1].phase, 'dependency_pending');
  assert.equal((await claim('44')).lease, null);

  fixtureReceipt(id, 'working');
  const retried = (await claim('45')).lease;
  assert.equal(retried.jobId, 'TASK-1');
  assert.notEqual(retried.leaseId, first.leaseId);
  durable.delete('repository-lease:' + repository);
  fixtureReceipt(id, 'committed_unverified');
  assert.equal((await claim('46')).lease, null, 'a source-only receipt cannot release the dependent job');
  fixtureReceipt(id, 'merged_verified');
  assert.equal((await claim('47')).lease.jobId, 'TASK-2');
  assert.equal(count(), 1);

  auth = false;
  await assert.rejects(startCompleteMe(project, browser), /owner|source/i);
  assert.equal((await browser('/work/tickets/list', {})).ok, false);
  assert.equal(count(), 1);
});

test('the Bubbles composer intercepts Complete Me before chat history or public inference', async () => {
  const bubbles = await readFile(new URL('../bubbles-ai.js', import.meta.url), 'utf8');
  const composer = bubbles.slice(bubbles.indexOf('async function sendMessage('));
  const command = composer.indexOf('await openCompleteMe(');
  assert.ok(command >= 0 && command < composer.indexOf('await currentOwnerContext('));
  assert.ok(command < composer.indexOf('await askClaudeSteward('));
});
