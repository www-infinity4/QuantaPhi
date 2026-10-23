import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {bundleFingerprint,sourceStageReceipt,stageDecision} from '../scripts/brain-stage-source-receipt.mjs';
const sha='a'.repeat(40),account='c'.repeat(32);
function fixture(fn){
 const root=mkdtempSync(join(tmpdir(),'brain-stage-test-'));
 try{mkdirSync(join(root,'assets'));writeFileSync(join(root,'index.js'),'export default {};\n');
 writeFileSync(join(root,'assets','lib.js'),'export const value=1;\n');return fn(root);}
 finally{rmSync(root,{recursive:true,force:true})}
}
test('main push without GitHub Cloudflare credential produces truthful source-only receipt',()=>{
 fixture(root=>{
  const x=sourceStageReceipt({directory:root,sha,eventName:'push',operation:'stage_version',accountId:'',hasToken:false});
  assert.equal(x.status,'source_verified_stage_blocked_missing_credentials');
  assert.equal(x.stageUploadAttempted,false);
  assert.equal(x.stageVersionVerified,false);
  assert.equal(x.productionUnchanged,null);
  assert.equal(x.stageReady,false);
  assert.equal(x.releaseBlocked,undefined);
  assert.equal(x.sourceDryRunVerified,true);
  assert.match(x.sourceBundleSha256,/^[a-f0-9]{64}$/);
  assert.ok(!JSON.stringify(x).includes('CLOUDFLARE_API_TOKEN'));
 });
});
test('explicit owner stage_version fails closed when Cloudflare runner secret is absent',()=>{
 const r=stageDecision({eventName:'workflow_dispatch',operation:'stage_version',accountId:account,hasToken:false});
 assert.equal(r.mustFail,true);
 assert.equal(r.stageReady,false);
 assert.match(r.status,/blocked_missing_credentials/);
});
test('dry_run never stages, including when credentials exist',()=>{
 const r=stageDecision({eventName:'workflow_dispatch',operation:'dry_run',accountId:account,hasToken:true});
 assert.equal(r.stageReady,false);
 assert.equal(r.status,'source_verified_dry_run_only');
});
test('only exact scoped credentials permit automatic zero-traffic staging attempt',()=>{
 for(const eventName of ['push','workflow_dispatch']){
  const r=stageDecision({eventName,operation:'stage_version',accountId:account,hasToken:true});
  assert.equal(r.stageReady,true);
  assert.equal(r.status,'source_verified_cloudflare_stage_pending');
 }
 assert.equal(stageDecision({eventName:'push',operation:'stage_version',accountId:'not-account',hasToken:true}).stageReady,false);
});
test('bundle fingerprint is reproducible and changes with actual bundled source',()=>{
 fixture(root=>{
  const old=bundleFingerprint(root),again=bundleFingerprint(root);
  assert.deepEqual(old,again);
  assert.equal(old.fileCount,2);
  writeFileSync(join(root,'index.js'),'export default {fetch(){}};\n');
  assert.notEqual(bundleFingerprint(root).digest,old.digest);
 });
});
test('empty or symlinked dry-run directories fail before any stage grant',()=>{
 const root=mkdtempSync(join(tmpdir(),'brain-empty-'));
 try{
  assert.throws(()=>bundleFingerprint(root),/brain_dry_run_bundle_missing/);
  writeFileSync(join(root,'payload.js'),'a');
  symlinkSync(join(root,'payload.js'),join(root,'other.js'));
  assert.throws(()=>bundleFingerprint(root),/brain_dry_run_bundle_symlink_disallowed/);
 }finally{rmSync(root,{recursive:true,force:true})}
});
test('no unknown events, operations or revision SHAs gain staging authority',()=>{
 for(const r of [
  {eventName:'pull_request',operation:'stage_version',accountId:account,hasToken:true},
  {eventName:'push',operation:'unknown',accountId:account,hasToken:true}
 ])assert.throws(()=>stageDecision(r),/brain_stage_event_or_operation_invalid/);
 fixture(root=>assert.throws(()=>sourceStageReceipt({directory:root,sha:'bad',eventName:'push',
  operation:'stage_version',accountId:account,hasToken:true}),/brain_stage_git_sha_required/));
});
test('CI gates version upload on the credentials step, not on every main push',()=>{
 const wf=readFileSync('.github/workflows/brain-clock-stage-verified.yml','utf8');
 assert.match(wf,/id: stage_gate/);
 assert.match(wf,/node scripts\/brain-stage-source-receipt\.mjs gate/);
 assert.equal((wf.match(/if: \${{ steps\.stage_gate\.outputs\.stage_ready == 'true' }}/g)||[]).length,3);
 assert.doesNotMatch(wf,/if: \${{ github\.event_name == 'push' \|\| inputs\.operation == 'stage_version' }}/);
 assert.match(wf,/wrangler@4 versions upload/);
 assert.doesNotMatch(wf,/wrangler@4 versions deploy/);
});
