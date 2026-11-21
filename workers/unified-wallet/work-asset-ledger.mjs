/**
 * Unified Wallet's authenticated READ-ONLY projections for the separate work
 * assets. The canonical GIT Coin D1 already exists in
 * quantaphi-gitcoin-ledger: NEVER double mint it in Unified Wallet.
 *
 * GPT Coin is a new separate proposed model-invocation receipt journal.
 * Neither a model's text nor a page animation proves earned coins.
 */
export const workAssetSchema=[
 "CREATE TABLE IF NOT EXISTS verified_gpt_coin_receipts (receipt_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, source_receipt_id TEXT NOT NULL UNIQUE, source_system TEXT NOT NULL, model_reference TEXT NOT NULL, evidence_hash TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 1 CHECK(amount=1), settlement_status TEXT NOT NULL DEFAULT 'pending' CHECK(settlement_status IN ('pending','credited','rejected')), created_at INTEGER NOT NULL)",
 "CREATE INDEX IF NOT EXISTS verified_gpt_coin_owner ON verified_gpt_coin_receipts(user_id,created_at DESC)",
 "CREATE TRIGGER IF NOT EXISTS verified_gpt_coin_no_update BEFORE UPDATE ON verified_gpt_coin_receipts BEGIN SELECT RAISE(ABORT,'immutable_gpt_coin'); END",
 "CREATE TRIGGER IF NOT EXISTS verified_gpt_coin_no_delete BEFORE DELETE ON verified_gpt_coin_receipts BEGIN SELECT RAISE(ABORT,'immutable_gpt_coin'); END"
];
const missing=()=>({available:false,status:'not_connected',credited:null,pending:null});
const valid=n=>Number.isSafeInteger(Number(n))&&Number(n)>=0;
async function readCanonicalGitcoin(env,userId){
 if(env.GITCOIN_OWNER_BINDING_ENABLED!=='1'||!env.GITCOIN_DB)return missing();
 try{
  // owner_subject must be independently verified to be the signed-in StarQuest
  // account ID. NEVER accept the wallet id or GitHub username from the browser.
  const owner=await env.GITCOIN_DB.prepare(`SELECT wallet_id FROM gitcoin_bubbles_executor
   WHERE owner_subject=?1 AND active=1 AND owner_verified=1`).bind(userId).first();
  if(!owner?.wallet_id)return missing();
  const [issued,pending]=await Promise.all([
   env.GITCOIN_DB.prepare('SELECT COALESCE(SUM(amount),0) AS n FROM gitcoin_awards WHERE wallet_id=?1')
    .bind(owner.wallet_id).first(),
   env.GITCOIN_DB.prepare(`SELECT COUNT(*) AS n FROM gitcoin_line_claims c
    LEFT JOIN gitcoin_awards a ON a.receipt_id=c.receipt_id
    WHERE c.recipient_wallet_id=?1 AND c.status IN ('pending','verified') AND a.receipt_id IS NULL`)
    .bind(owner.wallet_id).first()
  ]);
  if(!valid(issued?.n)||!valid(pending?.n))return missing();
  return {available:true,status:'verified_ledger',credited:Number(issued.n),
   pending:Number(pending.n),source:'canonical_gitcoin_d1'};
 }catch{return missing()}
}
async function readGptCoin(env,userId){
 if(env.GPT_COIN_LEDGER_ENABLED!=='1'||!env.DB)return missing();
 try{
  const row=await env.DB.prepare(`SELECT
   COALESCE(SUM(CASE WHEN settlement_status='credited' THEN amount ELSE 0 END),0) AS credited,
   COALESCE(SUM(CASE WHEN settlement_status='pending' THEN amount ELSE 0 END),0) AS pending
   FROM verified_gpt_coin_receipts WHERE user_id=?1`).bind(userId).first();
  if(!valid(row?.credited)||!valid(row?.pending))return missing();
  return {available:true,status:'verified_ledger',credited:Number(row.credited),
   pending:Number(row.pending),source:'verified_gpt_invocation_receipts'};
 }catch{return missing()}
}
export async function readVerifiedWorkAssets(env,userId){
 const [GIT_COIN,GPT_COIN]=await Promise.all([
  readCanonicalGitcoin(env,userId),readGptCoin(env,userId)
 ]);
 return {GIT_COIN,GPT_COIN};
}
