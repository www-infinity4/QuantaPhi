import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const writer=readFileSync(new URL('../scripts/brain-writer.mjs',import.meta.url),'utf8');
const clock=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
const workflow=readFileSync(new URL('../.github/workflows/brain-writer.yml',import.meta.url),'utf8');
test('a claimed no-diff writer cannot vanish as success or leave the lease working',()=>{
 assert.doesNotMatch(writer,/process\.exit\(0\)/);
 assert.match(writer,/No source diff:/);
 assert.match(writer,/No applicable source diff was proposed/);
 assert.match(writer,/if\(lease\)try\{await call\('result'/);
 assert.match(writer,/report\.status=commitSha\?'committed_unverified':'blocked'/);
});
test('the existing cron owns autonomous builds; triage does not create a second writer',()=>{
 assert.match(workflow,/cron: '\*\/5 \* \* \* \*'/);
 assert.match(clock,/triageBacklog\(this\.env\.WORK_DB,this\.ctx\.storage,this\.env\.WRITER_OWNER_HASH/);
 assert.match(clock,/await this\.retryPendingWork\(\)/);
 assert.match(clock,/path==='\/work\/autopilot\/status'/);
 assert.match(clock,/ownerAuthorized\(env,token\)/);
});
