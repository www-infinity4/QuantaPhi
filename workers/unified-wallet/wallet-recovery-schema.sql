-- Apply only to the existing starquest-ledger D1 (IDENTITY_DB).
-- Issue grants only from an authenticated Cloudflare operator session.
-- Never expose an API endpoint that creates grant rows for arbitrary wallet IDs.
CREATE TABLE IF NOT EXISTS wallet_recovery_grants (
  claim_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_wallet_recovery_grant_expiry ON wallet_recovery_grants(expires_at);
CREATE TABLE IF NOT EXISTS wallet_recovery_audit (
  claim_hash TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  redeemed_at INTEGER NOT NULL
);
