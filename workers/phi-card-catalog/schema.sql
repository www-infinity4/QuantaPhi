-- Phi Cards tenant content. NEVER combine with wallets, StarCoins, or private
-- Reads & Realms library. Run migrations only against the dedicated tenant DB.
CREATE TABLE IF NOT EXISTS card_sites (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL,
 request_key TEXT NOT NULL,
 name TEXT NOT NULL,
 origin TEXT,
 slug TEXT NOT NULL UNIQUE,
 status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
 created_at INTEGER NOT NULL,
 UNIQUE(owner_id,request_key)
);
CREATE INDEX IF NOT EXISTS card_sites_owner ON card_sites(owner_id,created_at DESC);
CREATE TABLE IF NOT EXISTS card_instances (
 id TEXT PRIMARY KEY,
 site_id TEXT NOT NULL REFERENCES card_sites(id),
 card_id TEXT NOT NULL,
 options_json TEXT NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(site_id,id)
);
CREATE INDEX IF NOT EXISTS card_instances_by_site ON card_instances(site_id);
CREATE TABLE IF NOT EXISTS card_stories (
 id TEXT PRIMARY KEY,
 site_id TEXT NOT NULL REFERENCES card_sites(id),
 title TEXT NOT NULL,
 body TEXT NOT NULL,
 sources_json TEXT NOT NULL,
 editorial_status TEXT NOT NULL CHECK(editorial_status IN ('draft','published')),
 access TEXT NOT NULL DEFAULT 'free' CHECK(access IN ('free','paid')),
 reviewed_by TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 UNIQUE(site_id,id)
);
CREATE INDEX IF NOT EXISTS card_stories_published ON card_stories(site_id,editorial_status,created_at DESC);
CREATE TABLE IF NOT EXISTS card_research_events (
 site_id TEXT NOT NULL REFERENCES card_sites(id),
 event_id TEXT NOT NULL,
 card_instance_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('search','click','research')),
 query_text TEXT NOT NULL,
 source_url TEXT NOT NULL DEFAULT '',
 occurred_at INTEGER NOT NULL,
 PRIMARY KEY(site_id,event_id)
);
CREATE INDEX IF NOT EXISTS card_research_by_site ON card_research_events(site_id,occurred_at DESC);
