import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
import {join} from 'node:path';

const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
const folder = new URL('work/unfinished/', root);

test('agent entry point links the mandatory unfinished-work protocol', () => {
  const agents = read('AGENTS.md');
  assert.match(agents, /work\/unfinished\/README\.md/);
  assert.match(agents, /work\/unfinished\/INDEX\.md/);
  const readme = read('work/unfinished/README.md');
  assert.match(readme, /GitHub Issues/);
  assert.match(readme, /lease/i);
  assert.match(readme, /independent (?:review|release)/i);
});

test('every versioned ticket has a canonical issue and a matching index route', () => {
  const index = read('work/unfinished/INDEX.md');
  const files = readdirSync(folder).filter(name => /^TICKET-\d+\.md$/.test(name));
  assert.ok(files.length > 0, 'at least one versioned ticket must exist');
  for (const filename of files) {
    const number = Number(filename.match(/^TICKET-(\d+)\.md$/)[1]);
    const body = read('work/unfinished/' + filename);
    assert.match(body, new RegExp('^issue:\\s*' + number + '$', 'm'), filename + ' issue mismatch');
    assert.ok(index.includes('](' + filename + ')'), filename + ' must be routed from INDEX.md');
    assert.ok(body.includes('https://github.com/www-infinity4/QuantaPhi/issues/' + number), filename + ' must link its canonical issue');
    for (const field of ['state:', 'dot:', 'progress_percent:', 'sessions_spent:', 'sessions_remaining_estimate:', 'lease_id:', 'fence:', 'next_action:', 'merged:', 'deployed:', 'live_verified:']) {
      assert.ok(body.includes('\n' + field), filename + ' missing ' + field);
    }
    assert.match(body, /progress_percent:\s*(?:unknown|(?:100|[1-9]?\d))\s*$/m, filename + ' invalid percent');
    assert.match(body, /next_action:\s*"[^"]+"/m, filename + ' requires one explicit next action');
  }
});

test('index references only existing ticket files', () => {
  const index = read('work/unfinished/INDEX.md');
  for (const match of index.matchAll(/\]\((TICKET-\d+\.md)\)/g)) {
    assert.ok(existsSync(join(new URL(folder).pathname, match[1])), match[1] + ' missing');
  }
});

// A lease is a short-lived, attributable claim, never a bare colored status.
function validateLeaseClaim(field, filename) {
  const unclaimed = value => value === undefined || value === null ||
    value === '' || value === 'null' || value === 'unknown';
  const lease = field('lease_id');
  const fence = field('fence');
  const expiry = field('lease_expires_at');
  const session = field('task_session_id');
  assert.equal(unclaimed(lease), unclaimed(fence), filename + ' lease requires fence');
  if (unclaimed(lease)) {
    assert.ok(unclaimed(expiry), filename + ' unclaimed lease must not retain expiry');
    assert.ok(unclaimed(session), filename + ' unclaimed lease must not retain task/session identity');
    return;
  }
  const timestamp = String(expiry || '').replace(/^"|"$/g, '');
  assert.match(timestamp, /^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?Z$/,
    filename + ' claimed lease requires UTC expiry');
  assert.ok(Number.isFinite(Date.parse(timestamp)), filename + ' lease expiry must be a valid date');
  assert.ok(!unclaimed(session), filename + ' claimed lease requires task/session identity');
  const agent = String(field('agent') || '').replace(/^"|"$/g, '');
  assert.ok(agent && !/^(unassigned|unknown|null)$/i.test(agent),
    filename + ' claimed lease requires named agent');
  assert.match(field('issue') || '', /^[1-9]\\d*$/, filename + ' claimed lease requires canonical ticket');
}

test('lease claims require expiry, fence, agent and task/session identity', () => {
  const fields = values => key => values[key];
  const valid = {issue: '1250', agent: 'build-agent-1', lease_id: 'lease-1',
    fence: 'fence-1', lease_expires_at: '2026-10-31T16:00:00Z', task_session_id: 'session-1'};
  assert.doesNotThrow(() => validateLeaseClaim(fields(valid), 'valid'));
  for (const key of ['fence', 'lease_expires_at', 'task_session_id', 'agent']) {
    assert.throws(() => validateLeaseClaim(fields({...valid, [key]: null}), 'missing-' + key));
  }
  assert.throws(() => validateLeaseClaim(fields({...valid, lease_expires_at: 'not-a-date'}), 'bad-date'));
  assert.doesNotThrow(() => validateLeaseClaim(fields({lease_id: 'null', fence: 'null',
    lease_expires_at: 'null', task_session_id: 'null'}), 'unclaimed'));
  assert.throws(() => validateLeaseClaim(fields({lease_id: 'null', fence: 'null',
    lease_expires_at: '2026-10-31T16:00:00Z', task_session_id: 'null'}), 'stale-expiry'));
});

test('ticket front matter rejects unsupported completion and unfenced lease claims', () => {
  const files = readdirSync(folder).filter(name => /^TICKET-\d+\.md$/.test(name));
  for (const filename of files) {
    const body = read('work/unfinished/' + filename);
    const match = body.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    assert.ok(match, filename + ' must start with machine-readable YAML front matter');
    const metadata = match[1];
    const field = key => metadata.match(new RegExp('^' + key + ':\\s*(.*)$', 'm'))?.[1]?.trim();
    for (const key of ['issue', 'state', 'dot', 'progress_percent', 'progress_basis',
      'sessions_spent', 'sessions_remaining_estimate', 'agent', 'lease_id', 'fence',
      'lease_expires_at', 'task_session_id',
      'next_action', 'merged', 'deployed', 'live_verified']) {
      assert.notEqual(field(key), undefined, filename + ' missing front-matter field ' + key);
    }
    assert.match(field('sessions_spent'), /^(0|[1-9]\d*)$/, filename + ' sessions_spent must be counted');
    assert.match(field('progress_percent'), /^(unknown|100|[1-9]?\d)$/, filename + ' percent must be evidence-based');
    validateLeaseClaim(field, filename);
    if (field('progress_percent') === '100') {
      assert.equal(field('state'), 'complete', filename + ' 100% requires accepted completion');
      assert.match(field('dot'), /🟢/, filename + ' 100% requires accepted green state');
      assert.ok(field('progress_basis') && field('progress_basis') !== 'unknown',
        filename + ' 100% requires a documented acceptance basis');
    }
  }
});
