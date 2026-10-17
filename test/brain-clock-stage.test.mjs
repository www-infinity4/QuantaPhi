import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const config=readFileSync('workers/infinity-brain-clock/wrangler.toml','utf8');
const workflow=readFileSync('.github/workflows/brain-clock-stage-verified.yml','utf8');
test('new Cloudflare Brain versions retain production owner identity and require existing payout secret',()=>{
 assert.match(config,/^keep_vars = true$/m);
 assert.match(config,/\[secrets\]\s*\nrequired = \["BOT_WORK_SECRET"\]/);
 for(const name of ['WORK_DB','CLOCK','BOT_WALLET','MODELS','WRITER_AI'])
  assert.match(config,new RegExp('\\b'+name+'\\b'));
});
test('no routine commit, scheduled trigger or unreviewed workflow action can deploy production Brain',()=>{
 assert.match(workflow,/^  workflow_dispatch:/m);
 assert.doesNotMatch(workflow,/^  (?:push|schedule|pull_request):/m);
 assert.match(workflow,/^\s*--dry-run --outdir \/tmp\/brain-clock-staged-build$/m);
 assert.match(workflow,/wrangler@4 versions upload/);
 assert.doesNotMatch(workflow,/wrangler@4 versions deploy/);
 assert.equal((workflow.match(/wrangler@4 deploy\b/g)||[]).length,1);
 const safeBuild=workflow.slice(workflow.indexOf('npx --yes wrangler@4 deploy'),workflow.indexOf('Check existing production binding names'));
 assert.match(safeBuild,/--dry-run/);
 assert.match(workflow,/persist-credentials: false/);
 assert.match(workflow,/CF_TOKEN: \${{ secrets\.CLOUDFLARE_API_TOKEN }}/);
 assert.match(workflow,/if: \${{ inputs\.operation == 'stage_version' }}/);
});
test('production secret and binding names are preflight-verified before any zero-traffic version upload',()=>{
 const check=workflow.indexOf('Check existing production binding names');
 const stage=workflow.indexOf('Upload a NEW, undeployed version');
 assert.ok(check>0&&stage>check);
 for(const name of ['BOT_WORK_SECRET','WRITER_OWNER_HASH','WORK_DB','CLOCK','MODELS','BOT_WALLET'])
  assert.ok(workflow.includes(name));
 assert.match(workflow,/production_binding_missing_or_wrong_type/);
 assert.match(workflow,/This workflow never deploys a Worker/);
});
