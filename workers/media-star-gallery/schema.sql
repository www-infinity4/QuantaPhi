-- Shared, owner-partitioned Media Star creator submissions and reviewed public gallery.
-- Apply to explicitly chosen D1 after privacy/rights review; do not create one DB per creator.
-- This is NOT Fred's payout ledger or the existing Unified Wallet.
CREATE TABLE IF NOT EXISTS media_star_gallery_submissions (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL,
 title TEXT NOT NULL,
 description TEXT NOT NULL,
 source_url TEXT NOT NULL,
 image_url TEXT NOT NULL,
 topics_json TEXT NOT NULL,
 rights_declared INTEGER NOT NULL DEFAULT 0 CHECK(rights_declared IN (0,1)),
 rights_verified INTEGER NOT NULL DEFAULT 0 CHECK(rights_verified IN (0,1)),
 image_verified INTEGER NOT NULL DEFAULT 0 CHECK(image_verified IN (0,1)),
 status TEXT NOT NULL DEFAULT 'pending_review'
   CHECK(status IN ('pending_review','approved','rejected','hidden')),
 review_receipt TEXT,
 media_mode TEXT NOT NULL DEFAULT 'original_site'
   CHECK(media_mode IN ('original_site','linked_audio','linked_video','licensed_embed')),
 created_at INTEGER NOT NULL,
 reviewed_at INTEGER,
 UNIQUE(owner_id,source_url),
 CHECK(status<>'approved' OR (rights_verified=1 AND image_verified=1 AND review_receipt IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS media_star_gallery_review ON media_star_gallery_submissions(status,created_at DESC);
CREATE INDEX IF NOT EXISTS media_star_gallery_by_owner ON media_star_gallery_submissions(owner_id,created_at DESC);
-- Owner payout receipts, when separately funded and independently signed, must
-- stay in original payout ledgers. Neither gallery impression nor submission
-- invokes any currency change.

-- Per-creator impressions/clicks: browser observations, NOT paid conversions.
-- No IP, email, user-agent or arbitrary payout instructions are stored.
CREATE TABLE IF NOT EXISTS media_star_gallery_events (
 event_id TEXT PRIMARY KEY,
 content_id TEXT NOT NULL REFERENCES media_star_gallery_submissions(id),
 session_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('impression','click','play_intent')),
 created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS media_star_gallery_events_by_card
 ON media_star_gallery_events(content_id,created_at,kind);
CREATE UNIQUE INDEX IF NOT EXISTS media_star_gallery_impression_once
 ON media_star_gallery_events(content_id,session_id) WHERE kind='impression';
