-- Isolated organic directory only. No quality decisions or stars are seeded.
-- A ★ requires two independently corroborated recent approved sources,
-- a time-limited reviewer decision and no pending/contested appeal.
-- No customer identities, wallet, medical claims, product potency or ads.
CREATE TABLE IF NOT EXISTS store_quality_evidence (
 evidence_id TEXT PRIMARY KEY,
 store_id TEXT NOT NULL REFERENCES store_sources(id),
 source_url TEXT NOT NULL,
 source_domain TEXT NOT NULL,
 publisher_group TEXT NOT NULL,
 evidence_kind TEXT NOT NULL CHECK(evidence_kind IN ('customer_experience','store_conditions')),
 assessment TEXT NOT NULL CHECK(assessment IN ('positive','negative')),
 observed_at TEXT NOT NULL,
 reviewed_at TEXT NOT NULL,
 review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','approved','rejected')),
 reviewer_ref TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS store_quality_evidence_store_idx ON store_quality_evidence(store_id);
CREATE TABLE IF NOT EXISTS store_quality_decisions (
 store_id TEXT PRIMARY KEY REFERENCES store_sources(id),
 status TEXT NOT NULL DEFAULT 'unrated' CHECK(status IN ('unrated','star','withheld')),
 review_status TEXT NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','approved','rejected')),
 appeal_status TEXT NOT NULL DEFAULT 'none' CHECK(appeal_status IN ('none','pending','upheld','reversed')),
 reviewed_at TEXT NOT NULL DEFAULT '',
 expires_at TEXT NOT NULL DEFAULT '',
 reviewer_ref TEXT NOT NULL,
 rationale TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Separate reviewer-verified merchant domain: the listing source may be a
-- regulator rather than the merchant's own website. Empty by default.
CREATE TABLE IF NOT EXISTS store_quality_merchant_domains (
 store_id TEXT PRIMARY KEY REFERENCES store_sources(id),
 domain TEXT NOT NULL,
 source_url TEXT NOT NULL,
 verified_at TEXT NOT NULL,
 reviewer_ref TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS store_quality_appeals (
 appeal_id TEXT PRIMARY KEY,
 store_id TEXT NOT NULL REFERENCES store_sources(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','upheld','reversed','rejected')),
 opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 resolved_at TEXT,
 reviewer_ref TEXT NOT NULL DEFAULT '',
 correction_note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS store_quality_appeals_store_idx ON store_quality_appeals(store_id);
CREATE TABLE IF NOT EXISTS store_quality_events (
 event_id TEXT PRIMARY KEY,
 store_id TEXT NOT NULL REFERENCES store_sources(id),
 event_kind TEXT NOT NULL CHECK(event_kind IN ('evidence_review','decision','appeal','correction','revocation')),
 actor_ref TEXT NOT NULL,
 event_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 event_note TEXT NOT NULL DEFAULT ''
);
CREATE TRIGGER IF NOT EXISTS store_quality_events_no_update
BEFORE UPDATE ON store_quality_events
BEGIN SELECT RAISE(ABORT,'append_only_quality_event'); END;
CREATE TRIGGER IF NOT EXISTS store_quality_events_no_delete
BEFORE DELETE ON store_quality_events
BEGIN SELECT RAISE(ABORT,'append_only_quality_event'); END;
-- Public Worker exposes only approved evidence source URLs and review date
-- for an eligible star; raw review, appeal, moderation and actor records stay private.
