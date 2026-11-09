import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../../../',import.meta.url);
const configPath=new URL('workers/quant-events/wrangler.staging.jsonc',root);
const workflowPath=new URL('.github/workflows/quant-events-worker-staging.yml',root);

function read(path){return readFileSync(path,'utf8');}
test('compiled Worker is isolated to staging D1/Queue with no HTTP routes or trusted caller secrets',()=>{
  const raw=read(configPath);
  const cfg=JSON.parse(raw.replace(/^\s*\/\/.*$/gm,''));
  assert.equal(cfg.name,'quantaphi-quant-events-worker-staging');
  assert.equal(cfg.main,'src/ingest.ts');
  assert.equal(cfg.workers_dev,false);
  assert.deepEqual(cfg.routes,[]);
  assert.equal(cfg.vars.INGEST_MODE,'queue');
  assert.equal(cfg.vars.GEO_STORAGE_ENABLED,'false');
  assert.equal(cfg.vars.DIRECT_STAGING_ALLOWED,'false');
  assert.deepEqual(cfg.d1_databases?.map(b=>b.binding),['DB']);
  assert.equal(cfg.d1_databases[0].database_name,'quantaphi-quant-events-staging');
  assert.equal(cfg.d1_databases[0].database_id,'d87794f4-a150-469c-bf08-c1055807b145');
  assert.deepEqual(cfg.queues?.consumers?.map(q=>q.queue),['quantaphi-quant-events-staging']);
  const consumer=cfg.queues.consumers[0];
  assert.equal(consumer.max_concurrency,1);
  assert.ok(consumer.max_batch_size<=5);
  assert.equal(consumer.dead_letter_queue,'quantaphi-quant-events-staging-dlq');
  assert.equal(cfg.queues.producers,undefined);
  assert.equal(cfg.vars.INGEST_TOKEN,undefined);
  assert.equal(cfg.vars.USER_IDENTITY_HMAC_SECRET,undefined);
  assert.doesNotMatch(raw,/(?:unified-wallet|quant-ai|starquest-ledger)/i);
});
test('deployment workflow has read-only PR checks and hard-gated main-only staging deploy',()=>{
  const s=read(workflowPath);
  assert.match(s,/pull_request:/);
  assert.match(s,/branches:\s*\[main\]/);
  assert.match(s,/persist-credentials:\s*false/);
  assert.match(s,/wrangler@4 deploy --config workers\/quant-events\/wrangler\.staging\.jsonc --dry-run/);
  assert.match(s,/github\.event_name == 'push'/);
  assert.match(s,/CLOUDFLARE_API_TOKEN:\s*\$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(s,/CLOUDFLARE_ACCOUNT_ID:\s*\$\{\{ vars\.CLOUDFLARE_ACCOUNT_ID \|\| secrets\.CLOUDFLARE_ACCOUNT_ID \}\}/);
  assert.match(s,/test "\$CLOUDFLARE_ACCOUNT_ID" = 'ef25728c096c6ba92cf510caa2058003'/);
  assert.match(s,/wrangler@4 deploy --config workers\/quant-events\/wrangler\.staging\.jsonc/);
  assert.doesNotMatch(s,/quantaphi-site\/wrangler/);
  assert.doesNotMatch(s,/--env production/);
});
