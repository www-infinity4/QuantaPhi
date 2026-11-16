-- Feed readiness, licensed media, and consented feedback provenance.
-- These tables are intentionally EMPTY until sources/permissions are verified.
-- No product prices, retail orders, sensitive customer identity, or account
-- credentials are kept here. Never treat queued connections as live inventory.
CREATE TABLE IF NOT EXISTS store_inventory_connections (
 store_id TEXT NOT NULL REFERENCES store_sources(id) ON DELETE CASCADE,
 provider TEXT NOT NULL CHECK(provider IN ('weedmaps','dutchie','jane','merchant','other')),
 connection_state TEXT NOT NULL DEFAULT 'not_connected'
  CHECK(connection_state IN ('not_connected','requested','authorized','paused','disabled')),
 license_review_state TEXT NOT NULL DEFAULT 'unreviewed'
  CHECK(license_review_state IN ('unreviewed','under_review','verified','rejected')),
 permission_evidence_url TEXT NOT NULL DEFAULT '',
 source_menu_url TEXT NOT NULL DEFAULT '',
 last_sync_at TEXT NOT NULL DEFAULT '',
 last_items_seen INTEGER NOT NULL DEFAULT 0 CHECK(last_items_seen>=0),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(store_id,provider)
);
CREATE TABLE IF NOT EXISTS store_source_media (
 asset_id TEXT PRIMARY KEY,
 store_id TEXT NOT NULL REFERENCES store_sources(id) ON DELETE CASCADE,
 media_kind TEXT NOT NULL CHECK(media_kind IN ('storefront','interior','brand','other')),
 image_url TEXT NOT NULL,
 source_url TEXT NOT NULL,
 publisher TEXT NOT NULL,
 rights_evidence_url TEXT NOT NULL DEFAULT '',
 rights_cleared INTEGER NOT NULL DEFAULT 0 CHECK(rights_cleared IN (0,1)),
 review_state TEXT NOT NULL DEFAULT 'pending' CHECK(review_state IN ('pending','approved','rejected')),
 reviewed_at TEXT NOT NULL DEFAULT '',
 expires_at TEXT NOT NULL DEFAULT '',
 added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_store_source_media ON store_source_media(store_id,review_state,rights_cleared);
CREATE TABLE IF NOT EXISTS store_review_quotes (
 quote_id TEXT PRIMARY KEY,
 store_id TEXT NOT NULL REFERENCES store_sources(id) ON DELETE CASCADE,
 quote_text TEXT NOT NULL,
 author_display TEXT NOT NULL,
 publisher TEXT NOT NULL,
 source_url TEXT NOT NULL,
 consent_evidence TEXT NOT NULL DEFAULT '',
 consent_verified INTEGER NOT NULL DEFAULT 0 CHECK(consent_verified IN (0,1)),
 review_state TEXT NOT NULL DEFAULT 'pending' CHECK(review_state IN ('pending','approved','rejected')),
 published_at TEXT NOT NULL DEFAULT '',
 reviewed_at TEXT NOT NULL DEFAULT '',
 expires_at TEXT NOT NULL DEFAULT '',
 added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_store_review_quotes ON store_review_quotes(store_id,review_state,consent_verified);
CREATE TABLE IF NOT EXISTS cannabis_brand_references (
 brand_id TEXT PRIMARY KEY,
 brand_name TEXT NOT NULL,
 official_url TEXT NOT NULL,
 official_domain TEXT NOT NULL,
 source_kind TEXT NOT NULL DEFAULT 'brand_profile',
 source_verified_at TEXT NOT NULL DEFAULT '',
 image_reuse_allowed INTEGER NOT NULL DEFAULT 0 CHECK(image_reuse_allowed IN (0,1)),
 merchant_product_feed_connected INTEGER NOT NULL DEFAULT 0 CHECK(merchant_product_feed_connected IN (0,1)),
 note TEXT NOT NULL DEFAULT ''
);
