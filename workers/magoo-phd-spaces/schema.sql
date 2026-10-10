CREATE TABLE IF NOT EXISTS hosts (
 host_id TEXT PRIMARY KEY,
 display_name TEXT NOT NULL,
 handle TEXT NOT NULL UNIQUE,
 profile_url TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS episodes (
 episode_id TEXT PRIMARY KEY,
 host_id TEXT NOT NULL REFERENCES hosts(host_id),
 space_id TEXT NOT NULL UNIQUE,
 title TEXT NOT NULL,
 source_url TEXT NOT NULL UNIQUE,
 episode_date TEXT,
 duration TEXT,
 topics_json TEXT NOT NULL DEFAULT '[]',
 availability TEXT NOT NULL DEFAULT 'unverified',
 added_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_magoo_spaces_host_date ON episodes(host_id, episode_date DESC);
INSERT OR IGNORE INTO hosts(host_id,display_name,handle,profile_url)
 VALUES('hodlmagoo','Magoo PhD','HodlMagoo','https://x.com/HodlMagoo');
