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
