/* Bubbles/GPT/Copilot work-to-GIT gate.
 * A customer's AUTHENTICATED requirement, consent and acceptance are mandatory.
 * This module is for a trusted server-side verifier only. It cannot discover
 * customers, resolve signatures, charge them or authenticate by itself.
 */
import {evaluateClaim,createSettlementPlan} from './verification.mjs';
import {databaseBubblesExecutor,storeVerifiedGitCredits} from './settlement.mjs';

const error=code=>{throw Error(code)};
const SHA=/^[a-f0-9]{64}$/i;
const validId=v=>typeof v==='string'&&/^[a-zA-Z0-9:_./-]{8,160}$/.test(v);
const providers=new Set(['bubbles','gpt','copilot','human','other-ai']);

export async function evaluateCustomerJob(manifest,{principal,github,quantAI,contracts,bubblesExecutor}={}){
 if(!principal?.id||!principal?.walletId)error('unauthenticated_customer');
 if(!contracts?.verifyGrant||!contracts?.verifyAcceptance)error('customer_contract_service_unavailable');
 if(!providers.has(manifest?.builder_claim))error('unsupported_builder');
 // The verifier MUST resolve the consent grant from its own authenticated
 // storage. A browser-uploaded grant, client-side wallet ID or project file
 // cannot satisfy this check.
 const grant=await contracts.verifyGrant({
  authenticatedCustomerId:principal.id,
  repo:manifest.repo,commit:manifest.commit,provider:manifest.builder_claim
 });
 const validGrant=grant?.verified===true&&grant.active===true&&
  grant.customerId===principal.id&&grant.repo===manifest.repo&&
  grant.provider===manifest.builder_claim&&validId(grant.grantId)&&
  SHA.test(grant.requestHash||'')&&validId(grant.customerConsentReceiptId)&&
  validId(grant.recipientWalletId)&&
  Number.isSafeInteger(grant.expiresAt)&&grant.expiresAt>Date.now();
 if(!validGrant)error('customer_grant_unverified');
 const accepted=await contracts.verifyAcceptance({
  authenticatedCustomerId:principal.id,
  grantId:grant.grantId,
  repo:manifest.repo,commit:manifest.commit,requestHash:grant.requestHash
 });
 if(!(accepted?.verified===true&&accepted?.acceptedResult===true&&
  accepted.source==='authenticated_customer_acceptance'&&
  accepted.customerId===principal.id&&accepted.repo===manifest.repo&&
  accepted.commit===manifest.commit&&accepted.grantId===grant.grantId&&
  accepted.requestHash===grant.requestHash&&validId(accepted.acceptanceReceiptId)))
  error('customer_acceptance_unverified');

 // Independent immutable GitHub diff, default branch, CI, signed agent job,
 // and Quant AI per-line quality gates run only AFTER acceptance is verified.
 const evaluated=await evaluateClaim(manifest,{principal,github,quantAI,bubblesExecutor});
 if(evaluated.recipient_wallet_id!==grant.recipientWalletId)error('executor_recipient_mismatch');
 return {
  ...evaluated,
  customer_contract:Object.freeze({
   customerId:principal.id,grantId:grant.grantId,provider:grant.provider,
   requestHash:grant.requestHash,
   consentReceiptId:grant.customerConsentReceiptId,
   acceptanceReceiptId:accepted.acceptanceReceiptId,
   recipientWalletId:grant.recipientWalletId
  })
 };
}

export function planAcceptedGits(evaluated){
 if(!evaluated?.customer_contract||evaluated.customer_contract.recipientWalletId!==evaluated.recipient_wallet_id)
  error('customer_contract_required');
 const contract=evaluated.customer_contract;
 if(!validId(contract.grantId)||!validId(contract.acceptanceReceiptId)||
  !validId(contract.consentReceiptId)||!SHA.test(contract.requestHash||'')||
  !validId(contract.customerId))error('customer_contract_invalid');
 if(evaluated.status==='rejected'&&Array.isArray(evaluated.lines)&&
  evaluated.lines.every(line=>line.status!=='verified'))return [];
 const plans=createSettlementPlan(evaluated);
 if(plans.length>100)error('too_many_line_awards_for_one_transaction');
 return plans.map(x=>({
  ...x,customer_id:contract.customerId,grant_id:contract.grantId,
  consent_receipt_id:contract.consentReceiptId,
  acceptance_receipt_id:contract.acceptanceReceiptId,
  request_sha256:contract.requestHash,
  provider:contract.provider
 }));
}

/* The only production entry point. No public HTTP credit route.
 * DB is isolated GIT D1, not StarQuest/Fred/Unified Wallet.
 * All writes must be triggered by signed server-side operation identity,
 * not directly from a card click or user-supplied JSON.
 */
export async function postVerifiedCustomerGits(manifest,options={}){
 const {db,principal}=options;
 if(!db?.prepare||!db?.batch)error('gitcoin_database_unavailable');
 const reviewed=await evaluateCustomerJob(manifest,{...options,bubblesExecutor:databaseBubblesExecutor(db)});
 const plan=planAcceptedGits(reviewed);
 if(!plan.length)return {ok:true,proposedLineCount:0,submittedForIdempotentStorage:0,
  walletMinted:false,spendableBalanceProvided:false};
 const awardLinks=plan.map(line=>db.prepare(
   'INSERT OR IGNORE INTO gitcoin_customer_award_links (receipt_id,customer_id,grant_id,acceptance_receipt_id,request_sha256,provider,executor_wallet_id) SELECT ?1,?2,?3,?4,?5,?6,?7 WHERE EXISTS (SELECT 1 FROM gitcoin_awards WHERE receipt_id=?1 AND wallet_id=?7)'
  ).bind(line.receipt_id,line.customer_id,line.grant_id,line.acceptance_receipt_id,
   line.request_sha256,line.provider,line.wallet_id));
 const settlement=await storeVerifiedGitCredits(manifest,reviewed,{principal,db,awardLinks});
 const ids=settlement.receiptIds;
 if(ids.length){
  const byId=new Map(plan.map(line=>[line.receipt_id,line]));
  const placeholders=ids.map((_,i)=>'?'+(i+1)).join(',');
  const rows=await db.prepare(
   'SELECT * FROM gitcoin_customer_award_links WHERE receipt_id IN ('+placeholders+')'
  ).bind(...ids).all();
  if(rows.results?.length!==ids.length)error('gitcoin_readback_unconfirmed');
  for(const row of rows.results){
   const x=byId.get(row.receipt_id);
   if(!x||row.executor_wallet_id!==x.wallet_id||row.customer_id!==x.customer_id||row.grant_id!==x.grant_id||
    row.acceptance_receipt_id!==x.acceptance_receipt_id||row.request_sha256!==x.request_sha256||row.provider!==x.provider)
    error('gitcoin_readback_mismatch');
  }
 }
 // Verified, idempotent ledger receipt. Whether it is available to trade or
 // redeem depends on a separate authorized wallet/read-policy rollout.
 return {ok:true,proposedLineCount:plan.length,
  submittedForIdempotentStorage:plan.length,verifiedLedgerReceipts:ids.length,
  credited:settlement.credited,alreadyCredited:settlement.alreadyCredited,excludedHistorical:settlement.excludedHistorical.length,
  walletMinted:false,spendableBalanceProvided:false,
  creditUnit:'GIT',recipientWalletId:reviewed.recipient_wallet_id};
}
