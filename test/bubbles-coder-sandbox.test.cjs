const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const yaml=fs.readFileSync('.github/workflows/bubbles-coder-sandbox.yml','utf8');
const site=fs.readFileSync('bubbles-ai.js','utf8');

test('Bubbles Coder sandbox checks out isolated Linux runtime with no write token',()=>{
 assert.match(yaml,/workflow_dispatch:/);
 assert.match(yaml,/runs-on: ubuntu-latest/);
 assert.match(yaml,/timeout-minutes: 8/);
 assert.match(yaml,/persist-credentials: false/);
 assert.match(yaml,/permissions:\s*\n\s*contents: read/);
 assert.match(yaml,/timeout --signal=TERM 180s python3 -I/);
 assert.match(yaml,/timeout --signal=TERM 180s bash --noprofile --norc/);
 assert.match(yaml,/^\s*if: always\(\)/m);
 assert.match(yaml,/actions\/upload-artifact@v4/);
 assert.doesNotMatch(yaml,/permissions:\s*\n\s*contents: write/);
});

test('Bubbles Coder direct dispatch is not a Robot Brain ticket',()=>{
 assert.match(site,/const coderRequest=/);
 assert.match(site,/directRequest\|\|githubCheck\|\|createRepository\|\|coderRequest/);
 assert.match(site,/args\.workflow='bubbles-coder-sandbox\.yml'/);
 assert.match(site,/args\.action='dispatch_workflow'/);
 assert.match(site,/args\.action='list_runs'/);
 assert.match(site,/directGithubOperation\(args\)/);
 assert.match(site,/const args=\{action,repository,request,description:request,mode\}/);
});
