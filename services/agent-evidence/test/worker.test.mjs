import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { readEvidence } from '../src/worker.mjs';

function db(records = []) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const call = { sql, args: [] };
      calls.push(call);
      return {
        bind(...args) { call.args = args; return this; },
        async all() { return { results: sql.includes('FROM categories') ? [{slug:'agents', parent_slug:null}] : records }; },
        async first() { return sql.includes('COUNT(') ? {total:records.length} : records[0] || null; },
        async run() { return {meta:{changes:1}}; }
      };
    }
  };
}

test('GET catalog supports nested categories', async () => {
  const result = await readEvidence(new Request('https://x/v1/categories'), db());
  assert.equal(result.status, 200);
  assert.equal((await result.json()).categories[0].slug, 'agents');
});
test('health answers with actual row count', async () => {
  const r = await readEvidence(new Request('https://x/health'),db([{id:'a'},{id:'b'}]));
  assert.equal((await r.json()).evidence_count,2);
});
test('no mutation or code execution route is exposed', async () => {
  const result = await readEvidence(new Request('https://x/v1/evidence',{method:'POST'}),db());
  assert.equal(result.status,405);
  assert.equal((await result.json()).error,'read_only');
});
test('invalid numeric pagination fails closed', async () => {
  const result = await readEvidence(new Request('https://x/v1/evidence?limit=nan'),db());
  assert.equal(result.status,400);
});
test('filters are positional parameters, not SQL fragments', async () => {
  const fake=db();
  await readEvidence(new Request('https://x/v1/evidence?q=%27%20OR%201%3D1--&category=agents'),fake);
  const call=fake.calls.at(-1);
  assert.match(call.sql,/category_slug LIKE \?/);
  assert.doesNotMatch(call.sql,/OR 1=1/);
  assert.equal(call.args.at(-2),20);
});
test('agent context excludes unreviewed feed claims', async () => {
  const fake=db();
  await readEvidence(new Request('https://x/v1/agent-context'),fake);
  assert.match(fake.calls.at(-1).sql,/review_status = \?/);
  assert.ok(fake.calls.at(-1).args.includes('curated'));
});
test('unknown evidence level is rejected', async () => {
  const r=await readEvidence(new Request('https://x/v1/evidence?evidence=magic'),db());
  assert.equal(r.status,400);
});
test('collector labels upstream releases unreviewed', async () => {
  const fake=db();
  const oldFetch=globalThis.fetch;
  globalThis.fetch=async()=>({ok:true,json:async()=>[{id:123,html_url:'https://github.com/x/y/releases/tag/v1',tag_name:'v1',body:'released',published_at:'2026-10-01'}]});
  try { await worker.scheduled({}, {EVIDENCE_DB:fake}, {}); }
  finally { globalThis.fetch=oldFetch; }
  const added=fake.calls.filter(c=>c.sql.includes('INSERT OR IGNORE INTO evidence'));
  assert.equal(added.length,3);
  assert.ok(added.every(c=>c.sql.includes("'unreviewed'")));
});
