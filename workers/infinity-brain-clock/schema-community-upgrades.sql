-- Apply with the existing rogers-consensus D1 before deploying community intake.
-- Bounded public suggestion text; no phone numbers, wallet identifiers or raw IPs.
CREATE TABLE IF NOT EXISTS community_upgrade_proposals (
 id TEXT PRIMARY KEY,
 client_hash TEXT NOT NULL,
 content_hash TEXT NOT NULL UNIQUE,
 submitted_at INTEGER NOT NULL,
 author_name TEXT NOT NULL DEFAULT '',
 suggestion TEXT NOT NULL,
 category TEXT NOT NULL,
 placement TEXT NOT NULL,
 gpt_status TEXT NOT NULL DEFAULT 'needs_review',
 gpt_summary TEXT NOT NULL DEFAULT '',
 gpt_risk TEXT NOT NULL DEFAULT 'high',
 review_state TEXT NOT NULL DEFAULT 'pending',
 ticket_id TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS community_upgrade_client_time
 ON community_upgrade_proposals(client_hash, submitted_at DESC);
CREATE INDEX IF NOT EXISTS community_upgrade_latest
 ON community_upgrade_proposals(submitted_at DESC);
