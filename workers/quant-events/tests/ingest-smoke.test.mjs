import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import worker from '../src/ingest.ts';

const SCHEMA = readFileSync(new URL('../migrations/0001_quant_events.sql', import.meta.url), 'utf8');
const URL = 'https://quantaphi.org/v1/events';
const sample = (n = 2) => ({
  user: {id: 'user-12345678', device_type: ' MOBILE '},
  queries: Array.from({length: n}, (_, i) => ({
    id: 'event-' + String(i).padStart(8, '0'),
    event_type: '  Watches   Football ',
    target_entity: ' NFL:Sports ', numerical_value: 1.5
  }))
});
function request(body, secret = 'local-test-secret') {
  const r = new Request(URL, {method: 'POST',
    headers: {'content-type': 'application/json', authorization: 'Bearer ' + secret},
    body: JSON.stringify(body)});
  r.cf = {region: 'Iowa', regionCode: 'IA', postalCode: '52577'};
  return r;
}
function dbFixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys=ON');
  sqlite.exec(SCHEMA);
  const DB = {
    prepare(sql) {return {bind(...args) {return {sql,args};}};},
    async batch(statements) {
      sqlite.exec('BEGIN');
      try {
        const rows = statements.map(s => ({success:true,meta:{changes:sqlite.prepare(s.sql).run(...s.args).changes}}));
        sqlite.exec('COMMIT');
        return rows;
      } catch (error) {sqlite.exec('ROLLBACK'); throw error;}
    }
  };
  return {DB, sqlite};
}

test('schema creates the user/type/millisecond index', () => {
  const {sqlite} = dbFixture();
  try {
    const fields = sqlite.prepare("PRAGMA index_info('idx_events_user_type_created')").all().map(x => x.name);
    assert.deepEqual(fields, ['user_id','event_type','created_at_ms']);
  } finally {sqlite.close();}
});
test('fails closed for missing queries, bad numbers, and wrong token', async () => {
  const {DB,sqlite} = dbFixture();
  try {
    const env = {DB,INGEST_TOKEN:'local-test-secret',INGEST_MODE:'direct'};
    assert.equal((await worker.fetch(request({user:sample().user}), env)).status,400);
    const bad = sample(); bad.queries[0].numerical_value = '1.5';
    assert.equal((await worker.fetch(request(bad),env)).status,422);
    assert.equal((await worker.fetch(request(sample(),'wrong'),env)).status,401);
    assert.equal(sqlite.prepare('SELECT count(*) n FROM events').get().n,0);
  } finally {sqlite.close();}
});
test('direct HTTP ingestion normalizes, timestamps and deduplicates replay', async () => {
  const {DB,sqlite} = dbFixture();
  try {
    const env = {DB,INGEST_TOKEN:'local-test-secret',INGEST_MODE:'direct'};
    assert.equal((await worker.fetch(request(sample()),env)).status,201);
    assert.deepEqual(await (await worker.fetch(request(sample()),env)).json(),{received:2,inserted:0,duplicates:2});
    assert.equal(sqlite.prepare('SELECT count(*) n FROM events').get().n,2);
    const e=sqlite.prepare('SELECT event_type,target_entity,created_at_ms FROM events LIMIT 1').get();
    assert.equal(e.event_type,'watches football');
    assert.equal(e.target_entity,'nfl:sports');
    assert.ok(Number.isSafeInteger(e.created_at_ms));
    assert.equal(sqlite.prepare('SELECT state_code FROM users').get().state_code,'IA');
  } finally {sqlite.close();}
});
test('100 events use seven multi-row INSERTs with at most 100 bindings',async()=>{
  const calls=[];
  const DB={prepare(sql){return {bind(...args){return {sql,args};}}},async batch(stmts){
    calls.push(stmts);
    return stmts.map(st=>({meta:{changes:st.sql.includes('INSERT INTO events')?(st.sql.match(/\(\?, \?, \?, \?, \?, \?\)/g)||[]).length:1}}));
  }};
  const r=await worker.fetch(request(sample(100)),{DB,INGEST_TOKEN:'local-test-secret',INGEST_MODE:'direct'});
  assert.equal(r.status,201);
  assert.equal(calls[0].length,8);
  assert.ok(calls[0].every(s=>s.args.length<=100));
});
test('queue returns accepted, not persisted; consumer commits and replay is idempotent', async()=>{
  const {DB,sqlite} = dbFixture();
  try {
    const sent=[];
    const env={DB,INGEST_TOKEN:'local-test-secret',INGEST_MODE:'queue',EVENT_QUEUE:{async send(v){sent.push(v);}}};
    const r=await worker.fetch(request(sample()),env);
    assert.equal(r.status,202);
    assert.deepEqual(await r.json(),{received:2,accepted:2,persisted:false});
    assert.equal(sqlite.prepare('SELECT count(*) n FROM events').get().n,0);
    const batch={messages:sent.map(body=>({body}))};
    await worker.queue(batch,env);
    await worker.queue(batch,env);
    assert.equal(sqlite.prepare('SELECT count(*) n FROM events').get().n,2);
  }finally {sqlite.close();}
});
test('queue unavailable fails closed without direct database writes', async()=>{
  const {DB,sqlite} = dbFixture();
  try{
    const r=await worker.fetch(request(sample()),{DB,INGEST_TOKEN:'local-test-secret',INGEST_MODE:'queue'});
    assert.equal(r.status,503);
    assert.equal(sqlite.prepare('SELECT count(*) n FROM events').get().n,0);
  }finally{sqlite.close();}
});
test('foreign-key deletion removes user-owned events',async()=>{
  const {DB,sqlite}=dbFixture();
  try{
    await worker.fetch(request(sample()),{DB,INGEST_TOKEN:'local-test-secret',INGEST_MODE:'direct'});
    sqlite.prepare('DELETE FROM users WHERE id=?').run('user-12345678');
    assert.equal(sqlite.prepare('SELECT count(*) n FROM events').get().n,0);
  }finally{sqlite.close();}
});
