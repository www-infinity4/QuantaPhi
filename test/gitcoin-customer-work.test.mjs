import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildManifest} from '../gitcoin/line-receipts.mjs';
import {evaluateCustomerJob,planAcceptedGits,postVerifiedCustomerGits} from '../gitcoin/customer-work.mjs';

const sha='c'.repeat(40), requestHash='d'.repeat(64);
const diff='diff --git a/src/feature.js b/src/feature.js\n--- /dev/null\n+++ b/src/feature.js\n@@ -0,0 +1,2 @@\n+export const feature = true;\n+export function result() { return 42; }';
const manifest=buildManifest(diff,{repo:'customer/project',commit:sha,intent:'website',builderClaim:'bubbles',githubLoginClaim:'customer-one'});
function dependencies(){
 const principal={id:'customer-1',walletId:'wallet/customer-one'};
 const grant={verified:true,active:true,customerId:'customer-1',repo:'customer/project',provider:'bubbles',
  grantId:'grant-accepted001',requestHash,recipientWalletId:'wallet/bubbles-executor',
  customerConsentReceiptId:'consent-verified-001',expiresAt:Date.now()+86_400_000};
 const acceptance={verified:true,customerId:'customer-1',repo:'customer/project',commit:sha,
  grantId:grant.grantId,requestHash,acceptanceReceiptId:'accept-commit-001',
  acceptedResult:true,source:'authenticated_customer_acceptance'};
 const github={getDiff:async()=>diff,containsCommitOnDefault:async()=>true,checksPassed:async()=>true,
  resolveAttribution:async()=>({valid:true,recipient:'wallet/bubbles-executor',
   source:'signed_agent_job',server_signature_verified:true})};
 const quantAI={review:async({lines})=>({reviewId:'review-customer001',
  decisions:lines.map(l=>({id:l.id,approved:true,reason:'Requested functionality passes checks'}))})};
 const contracts={verifyGrant:async()=>grant,verifyAcceptance:async()=>acceptance};
 return {principal,github,quantAI,contracts,grant,acceptance};
}
test('one accepted customer deliverable yields one proposed GIT per independently accepted line',async()=>{
 const verified=await evaluateCustomerJob(manifest,dependencies());
 const plan=planAcceptedGits(verified);
 assert.equal(plan.length,2);
 assert.equal(plan[0].credits,1);
 assert.equal(plan[1].credits,1);
 assert.equal(new Set(plan.map(x=>x.receipt_id)).size,2);
 assert.ok(plan.every(x=>x.wallet_id==='wallet/bubbles-executor'));
 assert.ok(plan.every(x=>x.grant_id==='grant-accepted001'));
 assert.ok(plan.every(x=>x.acceptance_receipt_id==='accept-commit-001'));
});
test('customer authorization cannot be substituted by AI self-assertion',async()=>{
 const d=dependencies();d.contracts.verifyGrant=async()=>({...d.grant,verified:false});
 await assert.rejects(evaluateCustomerJob(manifest,d),/customer_grant_unverified/);
 const d2=dependencies();d2.contracts.verifyGrant=async()=>({...d2.grant,customerId:'another-customer'});
 await assert.rejects(evaluateCustomerJob(manifest,d2),/customer_grant_unverified/);
 const d3=dependencies();d3.contracts.verifyGrant=async()=>({...d3.grant,recipientWalletId:'wallet/attacker'});
 await assert.rejects(evaluateCustomerJob(manifest,d3),/executor_recipient_mismatch/);
});
test('customer must accept this exact commit and criteria before provider gets GIT',async()=>{
 for(const changed of [
  {acceptedResult:false},
  {commit:'a'.repeat(40)},
  {requestHash:'b'.repeat(64)},
  {source:'model_says_done'},
  {verified:false}
 ]){
  const d=dependencies();d.contracts.verifyAcceptance=async()=>({...d.acceptance,...changed});
  await assert.rejects(evaluateCustomerJob(manifest,d),/customer_acceptance_unverified/);
 }
});
test('signed Bubbles job cannot redirect Copilot or GPT earnings to a new recipient',async()=>{
 const d=dependencies();
 d.github.resolveAttribution=async()=>({valid:true,recipient:'wallet/attacker',
  source:'signed_agent_job',server_signature_verified:true});
 await assert.rejects(evaluateCustomerJob(manifest,d),/executor_recipient_mismatch/);
 const copied={...manifest,builder_claim:'copilot'};
 const d2=dependencies();
 await assert.rejects(evaluateCustomerJob(copied,d2),/customer_grant_unverified/);
});
test('failed CI or failed quality review produces no award',async()=>{
 const d=dependencies();d.github.checksPassed=async()=>false;
 await assert.rejects(evaluateCustomerJob(manifest,d),/ci_not_passing/);
 const d2=dependencies();d2.quantAI.review=async({lines})=>({reviewId:'review-customer002',
  decisions:lines.map(l=>({id:l.id,approved:false,reason:'Does not address the requested customer work'}))});
 const decision=await evaluateCustomerJob(manifest,d2);
 assert.equal(planAcceptedGits(decision).length,0);
});
test('D1 writer receives only server-verified line plans and no website-supplied payment action',async()=>{
 const calls=[];
 const db={prepare(sql){return{bind(...args){return{sql,args}}}},async batch(stmts){
   calls.push(...stmts);return stmts.map(()=>({success:true,meta:{changes:1}}));
 }};
 const r=await postVerifiedCustomerGits(manifest,{...dependencies(),db});
 assert.equal(r.proposedLineCount,2);
 assert.equal(r.submittedForIdempotentStorage,2);
 assert.ok(calls.some(x=>x.sql.includes('INSERT OR IGNORE INTO gitcoin_awards')));
 assert.ok(calls.some(x=>x.sql.includes('INSERT OR IGNORE INTO gitcoin_customer_award_links')));
 assert.ok(!calls.some(x=>/UPDATE\s+unified_wallet/i.test(x.sql)));
 const schema=readFileSync('gitcoin/customer-contract-schema.sql','utf8');
 assert.match(schema,/PRIMARY KEY \(receipt_id\)/);
 assert.match(schema,/acceptance_receipt_id/);
});
test('missing database never claims to have minted a spendable credit',async()=>{
 await assert.rejects(postVerifiedCustomerGits(manifest,{...dependencies(),db:null}),/gitcoin_database_unavailable/);
});
