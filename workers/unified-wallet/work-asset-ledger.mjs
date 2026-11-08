/**
 * Owner-only GIT/GPT work-credit projections, deliberately independent of
 * existing Gitcoin repo, Star Coins, Bubble Bits, Quants, and real USD funds.
 *
 * Only an independently validated Brain/ChatGPT executor may later append
 * settled rows. This file exposes READ-ONLY signed-account projections.
 * Browser text, a commit mention, or a model answer cannot mint these assets.
 */
export const workAssetSchema=[
 "CREATE TABLE IF NOT EXISTS verified_work_asset_receipts (receipt_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, asset_code TEXT NOT NULL CHECK(asset_code IN ('GIT_COIN','GPT_COIN')), source_receipt_id TEXT NOT NULL, source_system TEXT NOT NULL, repository TEXT, commit_sha TEXT, evidence_path TEXT, evidence_line INTEGER, evidence_hash TEXT NOT NULL, amount INTEGER NOT NULL CHECK(amount>0 AND amount<=100000), settlement_status TEXT NOT NULL DEFAULT 'pending' CHECK(settlement_status IN ('pending','credited','rejected')), created_at INTEGER NOT NULL, UNIQUE(asset_code,source_receipt_id))",
 "CREATE INDEX IF NOT EXISTS verified_work_asset_owner ON verified_work_asset_receipts(user_id,asset_code,created_at DESC)",
 "CREATE TRIGGER IF NOT EXISTS verified_work_asset_no_update BEFORE UPDATE ON verified_work_asset_receipts BEGIN SELECT RAISE(ABORT,'immutable_work_asset'); END",
 "CREATE TRIGGER IF NOT EXISTS verified_work_asset_no_delete BEFORE DELETE ON verified_work_asset_receipts BEGIN SELECT RAISE(ABORT,'immutable_work_asset'); END"
];
const unavailable={available:false,status:'not_connected',credited:null,pending:null};
export async function readVerifiedWorkAssets(env,userId){
 const blank=()=>({GIT_COIN:{...unavailable},GPT_COIN:{...unavailable}});
 if(env.WORK_ASSET_LEDGER_ENABLED!=='1'||!env.DB)return blank();
 try{
  const rows=(await env.DB.prepare(`SELECT asset_code,
   COALESCE(SUM(CASE WHEN settlement_status='credited' THEN amount ELSE 0 END),0) AS credited,
   COALESCE(SUM(CASE WHEN settlement_status='pending' THEN amount ELSE 0 END),0) AS pending
   FROM verified_work_asset_receipts WHERE user_id=?1 GROUP BY asset_code`).bind(userId).all()).results||[];
  const result={
   GIT_COIN:{available:true,status:'verified_ledger',credited:0,pending:0,source:'authenticated_d1'},
   GPT_COIN:{available:true,status:'verified_ledger',credited:0,pending:0,source:'authenticated_d1'}
  };
  for(const row of rows){
   if(!Object.prototype.hasOwnProperty.call(result,row.asset_code))continue;
   const count=Number(row.credited),pending=Number(row.pending);
   if(!Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(pending)||pending<0)return blank();
   result[row.asset_code]={available:true,status:'verified_ledger',credited:count,pending,source:'authenticated_d1'};
  }
  return result;
 }catch{return blank()}
}
