import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validRepository,composeBuildRequest,prEvidencePrompt,responseText} from '../gitpal/studio.mjs';

const html=readFileSync(new URL('../gitpal/index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('../gitpal/studio.mjs',import.meta.url),'utf8');
const catalog=readFileSync(new URL('../bubbles-card-catalog.mjs',import.meta.url),'utf8');

test('Gitpal is a real same-origin engineering studio with working controls',()=>{
  for(const name of ['sign-in','repository','request','ask-ai','send-build','refresh-prs','prefill','add-field','clear-draft']){
    assert.match(html,new RegExp('id="'+name+'"'),name);
  }
  assert.match(html,/src="\.\/studio\.mjs"/);
  assert.match(html,/Oracle Octaves/);
  assert.match(html,/Gitpro/);
  assert.match(html,/Gitpub/);
  assert.match(catalog,/app\('gitpal-engineer','Gitpal · Infinity Oracle Engineer','\/gitpal\/'/);
});
test('first-party wallet auth does not share secrets with GitHub Pages',()=>{
  assert.match(script,/import\('\/bubbles-connections\.mjs'\)/);
  assert.match(script,/resolveConnectorWalletToken/);
  assert.match(script,/quantaphi\.org/);
  assert.match(script,/window\.location\.assign\('https:\/\/quantaphi\.org\/gitpal\/'\)/);
  assert.doesNotMatch(script,/localStorage\.setItem\(['"]gitpub_token/);
  assert.doesNotMatch(script,/XOR_KEY/);
  assert.doesNotMatch(script,/github_pat_[A-Za-z0-9_]{20,}/);
});
test('Oracle PR evidence requires per-PR opt-in and uses a bounded excerpt',()=>{
  assert.match(script,/window\.confirm\('Send short excerpts from PR/);
  assert.match(script,/action:'details'/);
  assert.match(script,/action:'feedback'/);
  assert.match(script,/task:'gitpal-copilot-gap-review'/);
  const summary=prEvidencePrompt({repository:'www-infinity4/Gitpal',prNumber:2,request:'Complete Cloudflare link',details:{files:[{path:'src/app.js',patch:'+'.repeat(10000)}]}});
  assert.ok(summary.length<=13500);
  assert.match(summary,/src\/app.js/);
});
test('only verified GitHub repos and prompts are eligible',()=>{
  assert.equal(validRepository('www-infinity4/Gitpal'),true);
  assert.equal(validRepository('..//secrets'),false);
  assert.throws(()=>composeBuildRequest({request:'x'}),/twelve/);
  assert.match(composeBuildRequest({request:'Repair the Github login popup',includeGaps:true}),/independent gates/);
  assert.equal(responseText({answer:'Oracle recommendation'}),'Oracle recommendation');
});
