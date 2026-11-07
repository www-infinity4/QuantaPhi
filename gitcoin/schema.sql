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
  execution_channel TEXT NOT NULL DEFAULT 'github_cli' CHECK(execution_channel IN ('bubbles','github_cli','provider')),
  recipient_policy TEXT NOT NULL DEFAULT 'verified_external_builder_v1',
  executor_binding_id TEXT,
  customer_wallet_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','excluded','rejected','verified')),
  github_evidence_id TEXT,
  quant_ai_review_id TEXT,
  reason_code TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gitcoin_claims_submitter ON gitcoin_line_claims(authenticated_submitter,status);
CREATE INDEX IF NOT EXISTS idx_gitcoin_claims_commit ON gitcoin_line_claims(repo,commit_sha);

-- Exactly one server-provisioned Bubbles owner executor. No public enrollment
-- route, first-customer fallback, username guessing or customer wallet selector.
-- Populate only from the existing verified owner binding during reviewed setup.
CREATE TABLE IF NOT EXISTS gitcoin_bubbles_executor (
 singleton INTEGER PRIMARY KEY CHECK(singleton=1),
 binding_id TEXT NOT NULL UNIQUE,
 wallet_id TEXT NOT NULL,
 owner_subject TEXT NOT NULL,
 active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),
 owner_verified INTEGER NOT NULL DEFAULT 0 CHECK(owner_verified IN (0,1))
);
CREATE TRIGGER IF NOT EXISTS gitcoin_bubbles_executor_identity_lock
BEFORE UPDATE OF binding_id,wallet_id,owner_subject ON gitcoin_bubbles_executor
WHEN NEW.binding_id<>OLD.binding_id OR NEW.wallet_id<>OLD.wallet_id OR NEW.owner_subject<>OLD.owner_subject
BEGIN SELECT RAISE(ABORT,'bubbles_executor_identity_locked'); END;

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
CREATE TRIGGER IF NOT EXISTS gitcoin_claim_recipient_guard_v2 BEFORE INSERT ON gitcoin_line_claims
WHEN EXISTS(SELECT 1 FROM gitcoin_line_claims c WHERE c.receipt_id=NEW.receipt_id AND
 (c.repo<>NEW.repo OR c.commit_sha<>NEW.commit_sha OR c.file_path<>NEW.file_path OR c.line_number<>NEW.line_number OR
  c.content_sha256<>NEW.content_sha256 OR c.recipient_wallet_id IS NOT NEW.recipient_wallet_id OR
  c.execution_channel<>NEW.execution_channel OR c.recipient_policy<>NEW.recipient_policy OR c.executor_binding_id IS NOT NEW.executor_binding_id))
BEGIN SELECT RAISE(ABORT,'git_receipt_conflict'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_award_verified_guard_v2 BEFORE INSERT ON gitcoin_awards
WHEN NOT EXISTS(SELECT 1 FROM gitcoin_line_claims c WHERE c.receipt_id=NEW.receipt_id AND c.status='verified'
 AND c.recipient_wallet_id=NEW.wallet_id AND c.git_type=NEW.git_type
 AND c.github_evidence_id=NEW.github_evidence_id AND c.quant_ai_review_id=NEW.quant_ai_review_id
 AND (c.execution_channel<>'bubbles' OR EXISTS(SELECT 1 FROM gitcoin_bubbles_executor e
  WHERE e.singleton=1 AND e.active=1 AND e.owner_verified=1 AND e.binding_id=c.executor_binding_id
  AND e.wallet_id=NEW.wallet_id AND c.recipient_policy='bubbles_owner_executor_v1')))
BEGIN SELECT RAISE(ABORT,'git_verified_claim_required'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_awards_no_update BEFORE UPDATE ON gitcoin_awards
BEGIN SELECT RAISE(ABORT,'immutable_git_award'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_awards_no_delete BEFORE DELETE ON gitcoin_awards
BEGIN SELECT RAISE(ABORT,'immutable_git_award'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_history_no_update BEFORE UPDATE ON gitcoin_line_history
BEGIN SELECT RAISE(ABORT,'immutable_git_history'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_history_no_delete BEFORE DELETE ON gitcoin_line_history
BEGIN SELECT RAISE(ABORT,'immutable_git_history'); END;


-- One globally serialized issued GIT per verified award, shared across users
-- in this ONE authoritative GIT D1 database. Termux provisional IDs are not
-- coin serial numbers. SQLite AUTOINCREMENT prevents reuse of deleted serials.
CREATE TABLE IF NOT EXISTS gitcoin_serials (
  serial_no INTEGER PRIMARY KEY AUTOINCREMENT,
  receipt_id TEXT NOT NULL UNIQUE REFERENCES gitcoin_awards(receipt_id),
  wallet_id TEXT NOT NULL,
  creator_subject TEXT NOT NULL,
  customer_wallet_id TEXT,
  git_type TEXT NOT NULL,
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gitcoin_serials_wallet ON gitcoin_serials(wallet_id,serial_no);
CREATE TRIGGER IF NOT EXISTS gitcoin_serials_verified_guard BEFORE INSERT ON gitcoin_serials
WHEN NOT EXISTS (
 SELECT 1 FROM gitcoin_awards a JOIN gitcoin_line_claims c ON c.receipt_id=a.receipt_id
 WHERE a.receipt_id=NEW.receipt_id AND a.wallet_id=NEW.wallet_id
 AND a.git_type=NEW.git_type AND c.authenticated_submitter=NEW.creator_subject
 AND c.customer_wallet_id IS NEW.customer_wallet_id
)
BEGIN SELECT RAISE(ABORT,'gitcoin_serial_requires_verified_award'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_serials_no_update BEFORE UPDATE ON gitcoin_serials
BEGIN SELECT RAISE(ABORT,'immutable_gitcoin_serial'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_serials_no_delete BEFORE DELETE ON gitcoin_serials
BEGIN SELECT RAISE(ABORT,'immutable_gitcoin_serial'); END;
-- Deterministic backfill for older awards in the isolated GIT ledger, if any.
-- The historic receipt, wallet and creator remain unchanged.
INSERT OR IGNORE INTO gitcoin_serials(receipt_id,wallet_id,creator_subject,customer_wallet_id,git_type)
SELECT a.receipt_id,a.wallet_id,c.authenticated_submitter,c.customer_wallet_id,a.git_type
FROM gitcoin_awards a JOIN gitcoin_line_claims c ON c.receipt_id=a.receipt_id
ORDER BY a.issued_at,a.receipt_id;

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
