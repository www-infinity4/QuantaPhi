-- Apply only to the isolated GIT D1 after the phase-1 schema and security review.
-- Does not change Unified Wallet, original StarCoins, Fred's rights or Quants.
-- Customer consent and accepted work MUST be verified by the trusted server,
-- not inferred from the Git commit author, a prompt, robot messages or a click.
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS gitcoin_customer_award_links (
 receipt_id TEXT NOT NULL PRIMARY KEY REFERENCES gitcoin_awards(receipt_id),
 customer_id TEXT NOT NULL,
 grant_id TEXT NOT NULL,
 acceptance_receipt_id TEXT NOT NULL,
 request_sha256 TEXT NOT NULL CHECK(length(request_sha256)=64),
 provider TEXT NOT NULL CHECK(provider IN ('human','bubbles','gpt','copilot','other-ai')),
 executor_wallet_id TEXT NOT NULL,
 recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(customer_id,grant_id,receipt_id)
);
CREATE INDEX IF NOT EXISTS idx_gitcoin_customer_awards_owner ON gitcoin_customer_award_links(executor_wallet_id,recorded_at);
CREATE INDEX IF NOT EXISTS idx_gitcoin_customer_awards_grant ON gitcoin_customer_award_links(customer_id,grant_id);
CREATE TRIGGER IF NOT EXISTS gitcoin_customer_award_conflict BEFORE INSERT ON gitcoin_customer_award_links
WHEN EXISTS(SELECT 1 FROM gitcoin_customer_award_links c WHERE c.receipt_id=NEW.receipt_id AND
 (c.customer_id<>NEW.customer_id OR c.grant_id<>NEW.grant_id OR c.acceptance_receipt_id<>NEW.acceptance_receipt_id
  OR c.request_sha256<>NEW.request_sha256 OR c.provider<>NEW.provider OR c.executor_wallet_id<>NEW.executor_wallet_id))
BEGIN SELECT RAISE(ABORT,'gitcoin_customer_receipt_conflict'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_customer_awards_no_update BEFORE UPDATE ON gitcoin_customer_award_links
BEGIN SELECT RAISE(ABORT,'immutable_gitcoin_customer_receipt'); END;
CREATE TRIGGER IF NOT EXISTS gitcoin_customer_awards_no_delete BEFORE DELETE ON gitcoin_customer_award_links
BEGIN SELECT RAISE(ABORT,'immutable_gitcoin_customer_receipt'); END;
