-- GPT Coin: model-invocation receipts, DRAFT migration, NOT deployed.
-- GIT Coin is ALREADY the separate canonical Cloudflare D1
-- "quantaphi-gitcoin-ledger" (gitcoin_line_claims, gitcoin_awards and
-- gitcoin_bubbles_executor). Do not create a duplicate GIT issuer.
-- Receipts here do not prove a ChatGPT message happened. Only a separately
-- authenticated, evidence-validated GPT/Bubbles model runner may append rows.
-- No client POST writes to this ledger; no real USD or other assets touched.
CREATE TABLE IF NOT EXISTS verified_gpt_coin_receipts (
 receipt_id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 source_receipt_id TEXT NOT NULL UNIQUE,
 source_system TEXT NOT NULL,
 model_reference TEXT NOT NULL,
 evidence_hash TEXT NOT NULL,
 amount INTEGER NOT NULL DEFAULT 1 CHECK(amount=1),
 settlement_status TEXT NOT NULL DEFAULT 'pending'
  CHECK(settlement_status IN ('pending','credited','rejected')),
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS verified_gpt_coin_owner
 ON verified_gpt_coin_receipts(user_id,created_at DESC);
CREATE TRIGGER IF NOT EXISTS verified_gpt_coin_no_update
 BEFORE UPDATE ON verified_gpt_coin_receipts
 BEGIN SELECT RAISE(ABORT,'immutable_gpt_coin'); END;
CREATE TRIGGER IF NOT EXISTS verified_gpt_coin_no_delete
 BEFORE DELETE ON verified_gpt_coin_receipts
 BEGIN SELECT RAISE(ABORT,'immutable_gpt_coin'); END;
