-- Proposed ISOLATED Cloudflare D1 schema for GIT evidence and accounting.
-- NOT applied by committing this file. No existing unified-wallet tables are changed.
-- Only a trusted, authenticated server may perform INSERT/UPDATE or settle GIT.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS gitcoin_line_claims (
  receipt_id TEXT PRIMARY KEY CHECK (length(receipt_id)=64),
  repo TEXT NOT NULL,
  commit_sha TEXT NOT NULL,
  file_path TEXT NOT NULL,
  line_number INTEGER NOT NULL CHECK (line_number>0),
  content_sha256 TEXT NOT NULL CHECK (length(content_sha256)=64),
  git_type TEXT NOT NULL,
  intent TEXT NOT NULL,
  builder_claim TEXT NOT NULL,
  authenticated_submitter TEXT NOT NULL,
  recipient_wallet_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','excluded','rejected','verified')),
  github_evidence_id TEXT,
  quant_ai_review_id TEXT,
  reason_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gitcoin_claims_submitter ON gitcoin_line_claims(authenticated_submitter,status);
CREATE INDEX IF NOT EXISTS idx_gitcoin_claims_commit ON gitcoin_line_claims(repo,commit_sha);

-- No credit is spendable unless the independent verifier has accepted the line.
-- Duplicate claims/retries hit a UNIQUE primary key instead of crediting twice.
CREATE TABLE IF NOT EXISTS gitcoin_awards (
  receipt_id TEXT PRIMARY KEY REFERENCES gitcoin_line_claims(receipt_id),
  wallet_id TEXT NOT NULL,
  git_type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1 CHECK(amount=1),
  github_evidence_id TEXT NOT NULL,
  quant_ai_review_id TEXT NOT NULL,
  attribution_evidence_id TEXT NOT NULL,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gitcoin_awards_wallet ON gitcoin_awards(wallet_id,issued_at);

-- Trade/transfer proposal: NO API and NO active transfer process yet.
-- Later service must lock/serialize per wallet, prove authorized signatures,
-- check sufficient available balance atomically, dedupe transaction IDs, and
-- persist equal debit/credit movements in one transaction before enabling.
CREATE TABLE IF NOT EXISTS gitcoin_transfer_requests (
  transfer_id TEXT PRIMARY KEY,
  from_wallet_id TEXT NOT NULL,
  to_wallet_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount>0),
  state TEXT NOT NULL DEFAULT 'proposed' CHECK(state IN ('proposed','denied','settled')),
  authorization_receipt_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(from_wallet_id<>to_wallet_id)
);
