import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {buildManifest} from '../gitcoin/line-receipts.mjs';
import {evaluateCustomerJob,planAcceptedGits,postVerifiedCustomerGits} from '../gitcoin/customer-work.mjs';

const sha='c'.repeat(40), requestHash='d'.repeat(64);
const diff='diff --git a/src/feature.js b/src/feature.js\n--- /dev/null\n+++ b/src/feature.js\n@@ -0,0 +1,2 @@\n+export const feature = true;\n+export function result() { return 42; }';
const manifest=buildManifest(diff,{repo:'customer/project',commit:sha,intent:'website',builderClaim:'bubbles',githubLoginClaim:'customer-one'});
function dependencies(claim=manifest,customerId='customer-1'){
 const principal={id:customerId,walletId:'wallet/'+customerId,executionChannel:'bubbles'};
 const grant={verified:true,active:true,customerId,repo:claim.repo,provider:'bubbles',
  grantId:'grant-accepted001',requestHash,recipientWalletId:'wallet/bubbles-executor',
  customerConsentReceiptId:'consent-verified-001',expiresAt:Date.now()+86_400_000};
 const acceptance={verified:true,customerId,repo:claim.repo,commit:claim.commit,
  grantId:grant.grantId,requestHash,acceptanceReceiptId:'accept-commit-001',
  acceptedResult:true,source:'authenticated_customer_acceptance'};
 const attribution={valid:true,recipient:'wallet/bubbles-executor',executionChannel:'bubbles',
  source:'signed_agent_job',server_signature_verified:true,evidenceId:'signed-job-'+customerId,
  customerId,customerWalletId:principal.walletId,customerAuthorizationVerified:true,executorBindingId:'verified-owner-binding'};
 const github={getDiff:async()=>diff,containsCommitOnDefault:async()=>true,checksPassed:async()=>true,
  resolveAttribution:async()=>attribution};
 const quantAI={review:async({lines})=>({reviewId:'review-customer001',
  decisions:lines.map(l=>({id:l.id,approved:true,reason:'Requested functionality passes checks'}))})};
 const contracts={verifyGrant:async()=>grant,verifyAcceptance:async()=>acceptance};
 const bubblesExecutor={resolve:async()=>({bindingId:'verified-owner-binding',walletId:'wallet/bubbles-executor',
  ownerSubject:'verified-owner',active:true,ownerVerified:true})};
 return {principal,github,quantAI,contracts,grant,acceptance,attribution,bubblesExecutor};
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
 d.github.resolveAttribution=async()=>({...d.attribution,recipient:'wallet/attacker'});
 await assert.rejects(evaluateCustomerJob(manifest,d),/bubbles_owner_recipient_required/);
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
function ledger(){
 const sql=new DatabaseSync(':memory:');
 for(const file of ['schema.sql','customer-contract-schema.sql'])
  sql.exec(readFileSync(new URL('../gitcoin/'+file,import.meta.url),'utf8'));
 sql.exec("INSERT INTO gitcoin_bubbles_executor VALUES (1,'verified-owner-binding','wallet/bubbles-executor','verified-owner',1,1)");
 const db={prepare(query){
  const stmt=sql.prepare(query);
  return {first:async()=>stmt.get(),bind:(...params)=>({all:async()=>({results:stmt.all(...params)}),run:()=>({meta:stmt.run(...params)})})};
 },async batch(stmts){
  sql.exec('BEGIN');
  try{const results=stmts.map(stmt=>stmt.run());sql.exec('COMMIT');return results;}
  catch(error){sql.exec('ROLLBACK');throw error;}
 }};
 return {sql,db};
}
test('accepted customer jobs use one immutable owner ledger and dedupe replay and repo casing',async()=>{
 const {sql,db}=ledger();
 const second=buildManifest(diff,{repo:'other/project',commit:'e'.repeat(40),intent:'website',builderClaim:'bubbles'});
 const recased=buildManifest(diff,{repo:'Customer/Project',commit:'f'.repeat(40),intent:'website',builderClaim:'bubbles'});
 for(const [claim,customer] of [[manifest,'customer-1'],[second,'customer-2']]){
  const opts={...dependencies(claim,customer),db};
  const result=await postVerifiedCustomerGits(claim,opts);
  assert.equal(result.credited,2);
  assert.equal(result.recipientWalletId,'wallet/bubbles-executor');
  const replay=await postVerifiedCustomerGits(claim,opts);
  assert.equal(replay.credited,0);assert.equal(replay.alreadyCredited,2);
 }
 const duplicate=await postVerifiedCustomerGits(recased,{...dependencies(recased),db});
 assert.equal(duplicate.credited,0);assert.equal(duplicate.excludedHistorical,2);
 const balance=sql.prepare('SELECT wallet_id,SUM(amount) AS amount FROM gitcoin_awards GROUP BY wallet_id').all();
 assert.deepEqual(balance.map(row=>({...row})),[{wallet_id:'wallet/bubbles-executor',amount:4}]);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM gitcoin_customer_award_links').get().n,4);
 const serials=sql.prepare('SELECT serial_no,receipt_id,wallet_id,creator_subject FROM gitcoin_serials ORDER BY serial_no').all();
 assert.equal(serials.length,4);
 assert.deepEqual(serials.map(x=>x.serial_no),[1,2,3,4]);
 assert.ok(serials.every(x=>x.wallet_id==='wallet/bubbles-executor'));
 assert.deepEqual(serials.map(x=>x.creator_subject),['customer-1','customer-1','customer-2','customer-2']);
 assert.throws(()=>sql.exec('DELETE FROM gitcoin_serials'),/immutable_gitcoin_serial/);
 assert.throws(()=>sql.exec('DELETE FROM gitcoin_customer_award_links'),/immutable_gitcoin_customer_receipt/);
});
test('missing database never claims to have minted a spendable credit',async()=>{
 await assert.rejects(postVerifiedCustomerGits(manifest,{...dependencies(),db:null}),/gitcoin_database_unavailable/);
});

test('wallet redirection and changed agreement replays fail without additional credit',async()=>{
 const {sql,db}=ledger(),d=dependencies();
 d.github.resolveAttribution=async()=>({...d.attribution,recipient:d.principal.walletId});
 d.bubblesExecutor.resolve=async()=>({bindingId:'verified-owner-binding',walletId:d.principal.walletId,
  ownerSubject:'forged-owner',active:true,ownerVerified:true});
 await assert.rejects(postVerifiedCustomerGits(manifest,{...d,db}),/bubbles_owner_recipient_required/);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM gitcoin_awards').get().n,0);
 const legitimate=dependencies();
 await postVerifiedCustomerGits(manifest,{...legitimate,db});
 legitimate.contracts.verifyAcceptance=async()=>({...legitimate.acceptance,acceptanceReceiptId:'changed-acceptance'});
 await assert.rejects(postVerifiedCustomerGits(manifest,{...legitimate,db}),/gitcoin_customer_receipt_conflict/);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM gitcoin_awards').get().n,2);
});
