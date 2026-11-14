
-- Consent-based X OAuth2: server-only encrypted tokens, short-lived one-use PKCE.
-- Idempotent additions; no existing Media Star history or wallet tables altered.
CREATE TABLE IF NOT EXISTS x_oauth_pending (
 state_hash TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL,
 verifier_cipher TEXT NOT NULL,
 created_at INTEGER NOT NULL,
 consumed_at INTEGER
);
CREATE INDEX IF NOT EXISTS x_oauth_pending_owner ON x_oauth_pending(owner_id,created_at DESC);
CREATE TABLE IF NOT EXISTS x_oauth_tokens (
 owner_id TEXT PRIMARY KEY,
 x_user_id TEXT NOT NULL,
 x_handle TEXT NOT NULL,
 access_cipher TEXT NOT NULL,
 refresh_cipher TEXT,
 expires_at INTEGER NOT NULL,
 scope TEXT NOT NULL,
 updated_at INTEGER NOT NULL
);
