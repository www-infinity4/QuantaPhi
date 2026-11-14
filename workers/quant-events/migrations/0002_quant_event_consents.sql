-- Isolated, explicit opt-in telemetry consent registry.
-- APPLY ONLY to a separately approved quant-events D1, never Wallet or quant-ai.
-- No browser route for writing/granting consent is provided by this migration.
-- user_id is a pseudonymous ev_<64 lowercase hex> value generated from a
-- verified Wallet identity by the trusted server. This record is not a payout.
CREATE TABLE IF NOT EXISTS quant_event_consents (
  user_id TEXT NOT NULL CHECK (
    length(user_id)=67 AND substr(user_id,1,3)='ev_'
  ),
  purpose TEXT NOT NULL CHECK (purpose='analytics'),
  policy_version TEXT NOT NULL CHECK (policy_version='v1'),
  consented_at_ms INTEGER NOT NULL CHECK (
    typeof(consented_at_ms)='integer' AND consented_at_ms>0
  ),
  revoked_at_ms INTEGER CHECK (
    revoked_at_ms IS NULL OR
    (typeof(revoked_at_ms)='integer' AND revoked_at_ms>=consented_at_ms)
  ),
  PRIMARY KEY (user_id, purpose)
);
