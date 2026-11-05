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

-- One historical copy per repository/path/content. Copying the same line back
-- into the file after deletion cannot mint it again under a new commit SHA.
CREATE TABLE IF NOT EXISTS gitcoin_line_history (
 repo TEXT NOT NULL,
 file_path TEXT NOT NULL,
 content_sha256 TEXT NOT NULL,
 receipt_id TEXT NOT NULL UNIQUE REFERENCES gitcoin_line_claims(receipt_id),
 PRIMARY KEY(repo,file_path,content_sha256)
);
-- Preserve historical award provenance if this proposal is later applied over
-- an earlier pilot schema. Existing balances and receipts are never rewritten.
INSERT OR IGNORE INTO gitcoin_line_history(repo,file_path,content_sha256,receipt_id)
SELECT c.repo,c.file_path,c.content_sha256,c.receipt_id FROM gitcoin_awards a
JOIN gitcoin_line_claims c ON c.receipt_id=a.receipt_id ORDER BY a.issued_at,a.receipt_id;
CREATE TRIGGER IF NOT EXISTS gitcoin_claim_recipient_guard BEFORE INSERT ON gitcoin_line_claims
WHEN EXISTS(SELECT 1 FROM gitcoin_line_claims c WHERE c.receipt_id=NEW.receipt_id AND
 (c.repo<>NEW.repo OR c.commit_sha<>NEW.commit_sha OR c.file_path<>NEW.file_path OR c.line_number<>NEW.line_number OR
  c.content_sha256<>NEW.content_sha256 OR c.recipient_wallet_id IS NOT NEW.recipient_wallet_id))
BEGIN SELECT RAISE(ABORT,'git_receipt_conflict'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_award_verified_guard BEFORE INSERT ON gitcoin_awards
WHEN NOT EXISTS(SELECT 1 FROM gitcoin_line_claims c WHERE c.receipt_id=NEW.receipt_id AND c.status='verified'
 AND c.recipient_wallet_id=NEW.wallet_id AND c.git_type=NEW.git_type
 AND c.github_evidence_id=NEW.github_evidence_id AND c.quant_ai_review_id=NEW.quant_ai_review_id)
BEGIN SELECT RAISE(ABORT,'git_verified_claim_required'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_awards_no_update BEFORE UPDATE ON gitcoin_awards
BEGIN SELECT RAISE(ABORT,'immutable_git_award'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_awards_no_delete BEFORE DELETE ON gitcoin_awards
BEGIN SELECT RAISE(ABORT,'immutable_git_award'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_history_no_update BEFORE UPDATE ON gitcoin_line_history
BEGIN SELECT RAISE(ABORT,'immutable_git_history'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_history_no_delete BEFORE DELETE ON gitcoin_line_history
BEGIN SELECT RAISE(ABORT,'immutable_git_history'); END;

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
