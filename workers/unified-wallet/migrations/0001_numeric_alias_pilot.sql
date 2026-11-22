-- #1906: private Unified Wallet device alias pilot, not an auth switch.
-- Apply only to a verified private identity database in staging AFTER
-- a full backup and review. Do not run on the production D1 now.
-- The device_number is a PUBLIC label, never a bearer token or password.
CREATE TABLE IF NOT EXISTS wallet_device_public_aliases (
 device_number TEXT PRIMARY KEY
  CHECK(length(device_number)=39 AND device_number NOT GLOB '*[^0-9]*'),
 account_id TEXT NOT NULL,
 public_p256_jwk TEXT NOT NULL,
 enrolled_at INTEGER NOT NULL,
 revoked_at INTEGER,
 last_verified_at INTEGER,
 FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_wallet_device_alias_owner
 ON wallet_device_public_aliases(account_id,revoked_at);
-- A future server adapter must issue single-use unpredictable challenges,
-- atomically mark consumed before granting a short-lived account session,
-- enforce HTTPS/origin, validate signed P-256 public-key assertion and
-- rate-limit attempts. No adapter is enabled by creating this table.
CREATE TABLE IF NOT EXISTS wallet_device_proof_challenges (
 challenge_hash TEXT PRIMARY KEY,
 device_number TEXT NOT NULL,
 issued_at INTEGER NOT NULL,
 expires_at INTEGER NOT NULL,
 consumed_at INTEGER,
 FOREIGN KEY(device_number) REFERENCES wallet_device_public_aliases(device_number) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_wallet_device_proof_expiry
 ON wallet_device_proof_challenges(expires_at,consumed_at);
