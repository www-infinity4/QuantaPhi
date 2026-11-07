// Server-only settlement. No HTTP endpoint, provider key, caller-selected wallet
// or browser mint primitive. Real authenticated adapters are required each time.
import {evaluateClaim,createSettlementPlan} from './verification.mjs';

const evidence=x=>typeof x==='string'&&/^[A-Za-z0-9_:./-]{8,200}$/.test(x);
const fail=code=>{throw Error(code)};

// Pure SQL plan for the already independently verified result. The public
// server entrypoint below always runs evaluateClaim before constructing it.
export function gitCreditStatements(manifest,result,principal){
 if(!principal?.id||!principal.walletId||!evidence(result?.attribution_evidence_id)||!evidence(result.github_evidence_id))fail('attribution_receipt_required');
 const lines=createSettlementPlan(result);
 if(lines.length>200)fail('git_settlement_batch_too_large');
 const statements=[];
 for(const line of lines){
  statements.push({sql:`INSERT OR IGNORE INTO gitcoin_line_claims(receipt_id,repo,commit_sha,file_path,line_number,content_sha256,git_type,intent,builder_claim,authenticated_submitter,recipient_wallet_id,status,github_evidence_id,quant_ai_review_id,execution_channel,recipient_policy,executor_binding_id,customer_wallet_id)
   VALUES(?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,'verified',?12,?13,?14,?15,?16,?17)`,
   params:[line.receipt_id,line.repo,line.commit_sha,line.path,line.line_number,line.content_sha256,line.git_type,manifest.intent,manifest.builder_claim,principal.id,line.wallet_id,result.github_evidence_id,result.review_id,result.execution_channel,result.recipient_policy,result.executor_binding_id,result.customer_wallet_id]});
  statements.push({sql:'INSERT OR IGNORE INTO gitcoin_line_history(repo,file_path,content_sha256,receipt_id) VALUES(?1,?2,?3,?4)',
   params:[line.repo,line.path,line.content_sha256,line.receipt_id]});
  // The unique historical source fingerprint prevents removing and re-adding
  // the same source line in a later commit to earn again. A genuine new line
  // retains its own repo/commit/path/line/content receipt and receives 1 GIT.
  statements.push({sql:`INSERT OR IGNORE INTO gitcoin_awards(receipt_id,wallet_id,git_type,amount,github_evidence_id,quant_ai_review_id,attribution_evidence_id)
   SELECT c.receipt_id,?2,c.git_type,1,c.github_evidence_id,c.quant_ai_review_id,?3 FROM gitcoin_line_claims c
   JOIN gitcoin_line_history h ON h.receipt_id=c.receipt_id WHERE c.receipt_id=?1`,
   params:[line.receipt_id,line.wallet_id,result.attribution_evidence_id]});
  // One authoritative sequence for all customers, independent of their local
  // Termux installations. Only a persisted independently verified award can
  // acquire a GIT serial, within the same transactional batch.
  statements.push({sql:`INSERT OR IGNORE INTO gitcoin_serials(receipt_id,wallet_id,creator_subject,customer_wallet_id,git_type)
   SELECT a.receipt_id,a.wallet_id,c.authenticated_submitter,c.customer_wallet_id,a.git_type
   FROM gitcoin_awards a JOIN gitcoin_line_claims c ON c.receipt_id=a.receipt_id WHERE a.receipt_id=?1
   AND NOT EXISTS(SELECT 1 FROM gitcoin_serials existing WHERE existing.receipt_id=a.receipt_id)`,
   params:[line.receipt_id]});
 }
 return statements;
}

export async function settleGitClaim(manifest,{principal,github,quantAI,db}={}){
 if(!db?.batch||!db.prepare)fail('git_ledger_unavailable');
 // No caller-supplied resolver is accepted here. The Bubbles owner binding
 // is provisioned server-side from the existing verified executor identity.
 const bubblesExecutor={resolve:async()=>{
  const row=await db.prepare('SELECT binding_id,wallet_id,owner_subject,active,owner_verified FROM gitcoin_bubbles_executor WHERE singleton=1').first();
  return row?{bindingId:row.binding_id,walletId:row.wallet_id,ownerSubject:row.owner_subject,active:row.active===1,ownerVerified:row.owner_verified===1}:null;
 }};
 const verified=await evaluateClaim(manifest,{principal,github,quantAI,bubblesExecutor});
 if(verified.status==='rejected')return {asset:'GIT',status:'rejected',credited:0,receiptIds:[]};
 const plan=gitCreditStatements(manifest,verified,principal);
 // D1 batch is transactional: a provenance/recipient conflict aborts the
 // complete batch. An interruption is safe to retry with the same receipts.
 const changes=await db.batch(plan.map(s=>db.prepare(s.sql).bind(...s.params)));
 const expected=createSettlementPlan(verified),receiptIds=[],serials=[],excludedHistorical=[];
 const readback=await db.prepare(`SELECT c.receipt_id,c.recipient_wallet_id,h.receipt_id AS canonical_receipt,a.wallet_id,a.amount,s.serial_no,s.wallet_id AS serial_wallet_id,s.creator_subject AS serial_creator
   FROM gitcoin_line_claims c JOIN gitcoin_line_history h ON h.repo=c.repo AND h.file_path=c.file_path AND h.content_sha256=c.content_sha256
   LEFT JOIN gitcoin_awards a ON a.receipt_id=c.receipt_id
   LEFT JOIN gitcoin_serials s ON s.receipt_id=a.receipt_id WHERE c.receipt_id IN (${expected.map((_,i)=>'?'+(i+1)).join(',')})`).bind(...expected.map(x=>x.receipt_id)).all();
 const saved=new Map((readback.results||[]).map(row=>[row.receipt_id,row]));
 for(const line of expected){
  const row=saved.get(line.receipt_id);
  if(!row||row.recipient_wallet_id!==line.wallet_id)fail('git_credit_readback_failed');
  if(row.canonical_receipt!==line.receipt_id){excludedHistorical.push(line.receipt_id);continue;}
  if(row.wallet_id!==line.wallet_id||row.amount!==1||row.serial_wallet_id!==line.wallet_id||
     !Number.isSafeInteger(row.serial_no)||row.serial_no<1||row.serial_creator!==principal.id)fail('git_credit_readback_failed');
  receiptIds.push(line.receipt_id);
  serials.push('GIT-'+String(row.serial_no).padStart(12,'0'));
 }
 const credited=changes.reduce((n,x,i)=>n+(i%4===2?Number(x.meta?.changes||0):0),0);
 if(!Number.isSafeInteger(credited)||credited<0||credited>receiptIds.length)fail('git_credit_readback_failed');
 return {asset:'GIT',status:'settled',walletId:verified.recipient_wallet_id,credited,alreadyCredited:receiptIds.length-credited,
  receiptIds,serials,excludedHistorical,reviewId:verified.review_id,cashPaid:false};
}
