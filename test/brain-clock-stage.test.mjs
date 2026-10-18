import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const config=readFileSync('workers/infinity-brain-clock/wrangler.toml','utf8');
const workflow=readFileSync('.github/workflows/brain-clock-stage-verified.yml','utf8');
const script=readFileSync('scripts/verify-brain-stage.mjs','utf8');
test('source-only Brain staging retains existing owner identity and secret bindings',()=>{
 assert.match(config,/^keep_vars = true$/m);
 assert.match(config,/\[secrets\]\s*\nrequired = \["BOT_WORK_SECRET"\]/);
 for(const name of ['WORK_DB','CLOCK','BOT_WALLET','MODELS','WRITER_AI'])
  assert.match(config,new RegExp('\\b'+name+'\\b'));
});
test('a trusted main commit may stage a zero-traffic version but NEVER routes production Worker traffic',()=>{
 assert.match(workflow,/^  workflow_dispatch:/m);
 assert.match(workflow,/^  push:/m);
 assert.doesNotMatch(workflow,/^  (?:schedule|pull_request):/m);
 assert.match(workflow,/^\s*--dry-run --outdir \/tmp\/brain-clock-staged-build$/m);
 assert.match(workflow,/wrangler@4 versions upload/);
 assert.doesNotMatch(workflow,/wrangler@4 versions deploy/);
 assert.equal((workflow.match(/wrangler@4 deploy\b/g)||[]).length,1);
 const build=workflow.slice(workflow.indexOf('npx --yes wrangler@4 deploy'));
 assert.match(build,/--dry-run/);
 assert.match(workflow,/persist-credentials: false/);
 assert.match(workflow,/if: \${{ github\.event_name == 'push' \|\| inputs\.operation == 'stage_version' }}/);
 assert.match(workflow,/CLOUDFLARE_API_TOKEN: \${{ secrets\.CLOUDFLARE_API_TOKEN }}/);
 assert.match(workflow,/This workflow never deploys a Worker/);
});
test('staging preflight checks every sensitive binding BEFORE upload and then exact identity AFTER',()=>{
 const check=workflow.indexOf('Verify original live version');
 const stage=workflow.indexOf('Upload immutable version');
 const verify=workflow.indexOf('Prove staged version');
 assert.ok(check>0&&stage>check&&verify>stage);
 assert.match(workflow,/node scripts\/verify-brain-stage\.mjs before/);
 assert.match(workflow,/node scripts\/verify-brain-stage\.mjs after/);
 for(const name of ['BOT_WORK_SECRET','WRITER_OWNER_HASH','WORK_DB','CLOCK','MODELS','BOT_WALLET'])
  assert.match(script,new RegExp('\\b'+name+'\\b'));
 for(const phrase of ['production_worker_traffic_changed_during_stage','candidate_binding_identity_changed',
  'no_new_immutable_stage_version','source','candidate_version_list_missing'])
  assert.ok(script.includes(phrase),phrase);
 assert.match(script,/productionUnchanged:true/);
 assert.match(script,/canaryPromoted:false/);
 assert.doesNotMatch(script,/method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
});
