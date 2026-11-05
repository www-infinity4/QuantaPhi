/* Bubbles/GPT/Copilot work-to-GIT gate.
 * A customer's AUTHENTICATED requirement, consent and acceptance are mandatory.
 * This module is for a trusted server-side verifier only. It cannot discover
 * customers, resolve signatures, charge them or authenticate by itself.
 */
import {evaluateClaim,createSettlementPlan} from './verification.mjs';

const error=code=>{throw Error(code)};
const SHA=/^[a-f0-9]{64}$/i;
const validId=v=>typeof v==='string'&&/^[a-zA-Z0-9:_./-]{8,160}$/.test(v);
const providers=new Set(['bubbles','gpt','copilot','human','other-ai']);

export async function evaluateCustomerJob(manifest,{principal,github,quantAI,contracts}={}){
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
 const evaluated=await evaluateClaim(manifest,{principal,github,quantAI});
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
 const {db}=options;
 if(!db?.prepare||!db?.batch)error('gitcoin_database_unavailable');
 const reviewed=await evaluateCustomerJob(manifest,options);
 const plan=planAcceptedGits(reviewed);
 if(!plan.length)return {ok:true,proposedLineCount:0,submittedForIdempotentStorage:0,
  walletMinted:false,spendableBalanceProvided:false};
 const statements=[];
 for(const line of plan){
  statements.push(db.prepare(
   'INSERT OR IGNORE INTO gitcoin_line_claims (receipt_id,repo,commit_sha,file_path,line_number,content_sha256,git_type,intent,builder_claim,authenticated_submitter,recipient_wallet_id,status,github_evidence_id,quant_ai_review_id) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,\'verified\',?12,?13)'
  ).bind(
   line.receipt_id,line.repo,line.commit_sha,line.path,line.line_number,
   line.content_sha256,line.git_type,String(reviewed.lines.find(x=>x.id===line.receipt_id)?.git_type||'').split(':')[1],
   line.provider,line.customer_id,line.wallet_id,'github:'+line.commit_sha,line.quant_ai_review_id
  ));
  statements.push(db.prepare(
   'INSERT OR IGNORE INTO gitcoin_awards (receipt_id,wallet_id,git_type,amount,github_evidence_id,quant_ai_review_id,attribution_evidence_id) SELECT ?1,?2,?3,1,?4,?5,?6 WHERE EXISTS (SELECT 1 FROM gitcoin_line_claims WHERE receipt_id=?1 AND recipient_wallet_id=?2 AND status=\'verified\' AND quant_ai_review_id=?5)'
  ).bind(line.receipt_id,line.wallet_id,line.git_type,'github:'+line.commit_sha,
   line.quant_ai_review_id,line.consent_receipt_id));
  statements.push(db.prepare(
   'INSERT OR IGNORE INTO gitcoin_customer_award_links (receipt_id,customer_id,grant_id,acceptance_receipt_id,request_sha256,provider,executor_wallet_id) SELECT ?1,?2,?3,?4,?5,?6,?7 WHERE EXISTS (SELECT 1 FROM gitcoin_awards WHERE receipt_id=?1 AND wallet_id=?7)'
  ).bind(line.receipt_id,line.customer_id,line.grant_id,line.acceptance_receipt_id,
   line.request_sha256,line.provider,line.wallet_id));
 }
 const outcome=await db.batch(statements);
 if(!Array.isArray(outcome)||outcome.some(x=>x?.success!==true))error('gitcoin_atomic_write_unconfirmed');
 // Receipt ledger evidence still requires a separately live, authenticated
 // GIT balance reader and policy before calling anything spendable or cash.
 return {ok:true,proposedLineCount:plan.length,
  submittedForIdempotentStorage:plan.length,walletMinted:false,
  spendableBalanceProvided:false,creditUnit:'GIT',recipientWalletId:reviewed.recipient_wallet_id};
}
