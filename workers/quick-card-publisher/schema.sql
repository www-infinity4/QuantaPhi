-- Separate public card data from wallet, owner sessions and Robot Brain.
CREATE TABLE IF NOT EXISTS quick_cards (
 slug TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL,
 interaction_request TEXT NOT NULL, website TEXT NOT NULL, image TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL CHECK(kind IN ('search','visit','video')),
 search_template TEXT NOT NULL DEFAULT '', video_id TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'unlisted' CHECK(status IN ('unlisted','approved','removed')),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS quick_cards_approved ON quick_cards(status,created_at DESC);
CREATE TABLE IF NOT EXISTS card_publish_limits (
 day TEXT NOT NULL,ip_hash TEXT NOT NULL,count INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day,ip_hash)
);
