-- Separate evidence and engagement store. Never overwrite Unified Wallet/Fred D1.
-- Only an independently signed Brain/wallet verifier may INSERT income evidence.
-- The public Worker exposes no income-evidence write endpoint.
CREATE TABLE IF NOT EXISTS executor_income_evidence (
 owner_id TEXT NOT NULL,
 receipt_id TEXT NOT NULL,
 asset TEXT NOT NULL CHECK(asset IN ('BUBBLE_BIT','GPT_BIT','GIT','QUANT')),
 units INTEGER NOT NULL CHECK(units>0 AND units<=1000000),
 status TEXT NOT NULL CHECK(status IN ('pending','settled')),
 source_system TEXT NOT NULL,
 work_id TEXT NOT NULL,
 verified_at INTEGER NOT NULL,
 wallet_settlement_receipt TEXT,
 PRIMARY KEY(owner_id,receipt_id),
 CHECK((status='settled' AND wallet_settlement_receipt IS NOT NULL)
    OR (status='pending' AND wallet_settlement_receipt IS NULL))
);
CREATE INDEX IF NOT EXISTS executor_income_by_owner ON executor_income_evidence(owner_id,asset,status);
CREATE UNIQUE INDEX IF NOT EXISTS executor_settlement_unique
 ON executor_income_evidence(owner_id,wallet_settlement_receipt) WHERE wallet_settlement_receipt IS NOT NULL;

CREATE TABLE IF NOT EXISTS media_star_events (
 event_id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL,
 session_id TEXT NOT NULL,
 card_id TEXT NOT NULL CHECK(card_id IN ('media-star','fred-spaces','following-spaces','media-star-creator')),
 kind TEXT NOT NULL CHECK(kind IN ('impression','card_click','play_intent')),
 placement TEXT NOT NULL CHECK(placement IN ('homepage','quick_card','bubbles')),
 quality TEXT NOT NULL CHECK(quality='browser_observed'),
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS media_star_events_owner_window ON media_star_events(owner_id,created_at,card_id,kind);
-- A repeated viewport intersection in one browser session is never a new impression.
CREATE UNIQUE INDEX IF NOT EXISTS media_star_impression_once ON media_star_events(owner_id,session_id,card_id) WHERE kind='impression';
