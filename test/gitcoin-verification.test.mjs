import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildManifest} from '../gitcoin/line-receipts.mjs';
import {evaluateClaim, createSettlementPlan} from '../gitcoin/verification.mjs';
const sha='b'.repeat(40);
const diff='diff --git a/src/a.js b/src/a.js\n--- /dev/null\n+++ b/src/a.js\n@@ -0,0 +1,2 @@\n+export const answer = 42;\n+export const useful = true;';
const manifest=buildManifest(diff,{repo:'www-infinity4/demo',commit:sha,intent:'app',builderClaim:'copilot',githubLoginClaim:'demo-user'});
const context={principal:{id:'user/123',walletId:'wallet/123'},github:{getDiff:async()=>diff,containsCommitOnDefault:async()=>true,resolveAttribution:async()=>({valid:true,recipient:'wallet/123',source:'verified_human_authorization'}),checksPassed:async()=>true},quantAI:{review:async({lines})=>({reviewId:'review-001',decisions:lines.map(l=>({id:l.id,approved:true,reason:'tested and meaningful'}))})}};

test('verified line requires independent GitHub and Quant AI receipts before settlement',async()=>{
 const result=await evaluateClaim(manifest,context);
 assert.equal(result.status,'verified');
 assert.equal(result.lines.length,2);
 assert.ok(result.lines.every(l=>l.status==='verified'));
 const plan=createSettlementPlan(result);
 assert.equal(plan.length,2);
 assert.deepEqual(plan.map(x=>x.credits),[1,1]);
 assert.equal(plan[0].wallet_id,'wallet/123');
 assert.equal(plan[0].receipt_id,manifest.lines[0].id);
});

test('reject spoofed local line metadata even when GitHub and Quant AI would approve',async()=>{
 const tampered=structuredClone(manifest);
 tampered.lines[0].content_sha256='f'.repeat(64);
 await assert.rejects(evaluateClaim(tampered,context),/manifest_mismatch/);
});

test('fail closed if no binding, no merged commit, failed CI, or unverifiable attribution',async()=>{
 await assert.rejects(evaluateClaim(manifest,{...context,quantAI:null}),/quant_ai_unavailable/);
 await assert.rejects(evaluateClaim(manifest,{...context,github:{...context.github,containsCommitOnDefault:async()=>false}}),/not_on_default_branch/);
 await assert.rejects(evaluateClaim(manifest,{...context,github:{...context.github,checksPassed:async()=>false}}),/ci_not_passing/);
 await assert.rejects(evaluateClaim(manifest,{...context,github:{...context.github,resolveAttribution:async()=>({valid:false})}}),/attribution_unverified/);
});

test('a reviewer can reject low quality code but cannot mint tokens by merely claiming success',async()=>{
 const result=await evaluateClaim(manifest,{...context,quantAI:{review:async({lines})=>({reviewId:'review-002',decisions:lines.map((l,i)=>({id:l.id,approved:i===1,reason:'independent quality evaluation'}))})}});
 assert.equal(result.status,'partially_verified');
 assert.equal(createSettlementPlan(result).length,1);
 await assert.rejects(evaluateClaim(manifest,{...context,quantAI:{review:async()=>({decisions:[{id:manifest.lines[0].id,approved:true}]})}}),/quant_ai_invalid_review/);
});

test('claimed Copilot/Bubbles/GPT provider never changes recipient without a signed attribution proof',async()=>{
 const provider={...context,github:{...context.github,resolveAttribution:async()=>({valid:true,recipient:'wallet/agent-provider',source:'self_reported_builder'})}};
 await assert.rejects(evaluateClaim(manifest,provider),/attribution_unverified/);
});
