-- GIT Coin and GPT Coin receipt ledger, separate from StarCoins, Quants,
-- Bubble Bits, Infinity, coupons and USD Cash Wallet.
-- DRAFT MIGRATION. Do not run on production before authorizer/source validation
-- and user-scoped, immutable credit ingestion have passed review.
-- One row = one independently validated code line or one model invocation.
CREATE TABLE IF NOT EXISTS verified_work_asset_receipts (
 receipt_id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 asset_code TEXT NOT NULL CHECK(asset_code IN ('GIT_COIN','GPT_COIN')),
 source_receipt_id TEXT NOT NULL,
 source_system TEXT NOT NULL,
 repository TEXT,
 commit_sha TEXT,
 evidence_path TEXT,
 evidence_line INTEGER,
 evidence_hash TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK(amount=1),
 settlement_status TEXT NOT NULL DEFAULT 'pending'
  CHECK(settlement_status IN ('pending','credited','rejected')),
 created_at INTEGER NOT NULL,
 UNIQUE(asset_code,source_receipt_id),
 UNIQUE(user_id,asset_code,repository,commit_sha,evidence_path,evidence_line,evidence_hash),
 CHECK(asset_code!='GIT_COIN' OR (
  repository IS NOT NULL AND commit_sha IS NOT NULL AND
  evidence_path IS NOT NULL AND evidence_line>0))
);
CREATE INDEX IF NOT EXISTS verified_work_asset_owner
 ON verified_work_asset_receipts(user_id,asset_code,created_at DESC);
CREATE TRIGGER IF NOT EXISTS verified_work_asset_no_update
 BEFORE UPDATE ON verified_work_asset_receipts
 BEGIN SELECT RAISE(ABORT,'immutable_work_asset'); END;
CREATE TRIGGER IF NOT EXISTS verified_work_asset_no_delete
 BEFORE DELETE ON verified_work_asset_receipts
 BEGIN SELECT RAISE(ABORT,'immutable_work_asset'); END;
