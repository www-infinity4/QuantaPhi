-- Media Star X following/Spaces catalogue. Matches the existing Cloudflare D1 schema.
-- Owner follow sets are isolated by owner_id; original Fred unlocks are NOT copied.
CREATE TABLE IF NOT EXISTS follow_snapshots(
 owner_id TEXT NOT NULL,snapshot_id TEXT NOT NULL,source TEXT NOT NULL CHECK(source IN ('x_api_verified','owner_import')),
 imported_at INTEGER NOT NULL,account_count INTEGER NOT NULL,PRIMARY KEY(owner_id,snapshot_id));
CREATE TABLE IF NOT EXISTS space_hosts(
 x_user_id TEXT PRIMARY KEY,handle TEXT NOT NULL,display_name TEXT NOT NULL,
 profile_url TEXT NOT NULL,featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN(0,1)),updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS followed_hosts(
 owner_id TEXT NOT NULL,x_user_id TEXT NOT NULL,handle TEXT NOT NULL,display_name TEXT NOT NULL,
 source TEXT NOT NULL CHECK(source IN ('x_api_verified','owner_import')),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),snapshot_id TEXT NOT NULL,updated_at INTEGER NOT NULL,
 PRIMARY KEY(owner_id,x_user_id));
CREATE TABLE IF NOT EXISTS space_episodes(
 space_id TEXT PRIMARY KEY,host_user_id TEXT NOT NULL REFERENCES space_hosts(x_user_id),
 title TEXT NOT NULL,space_url TEXT NOT NULL UNIQUE,started_at TEXT,duration_seconds INTEGER,
 summary TEXT NOT NULL DEFAULT '',source_type TEXT NOT NULL CHECK(source_type IN ('x_api','curated_archive','owner_submitted')),
 availability TEXT NOT NULL DEFAULT 'indexed' CHECK(availability IN ('indexed','verified_replay','unavailable')),
 last_checked INTEGER,checked_by TEXT,imported_at INTEGER NOT NULL,
 CHECK(space_url LIKE 'https://x.com/i/spaces/%'));
CREATE TABLE IF NOT EXISTS space_import_runs(
 run_id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,source TEXT NOT NULL,imported_hosts INTEGER NOT NULL DEFAULT 0,
 imported_episodes INTEGER NOT NULL DEFAULT 0,rejected INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS space_seen(
 owner_id TEXT NOT NULL,space_id TEXT NOT NULL,last_seen INTEGER NOT NULL,
 cycle INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(owner_id,space_id));
CREATE TABLE IF NOT EXISTS space_rolls(
 owner_id TEXT NOT NULL,roll_id TEXT NOT NULL,host_user_id TEXT NOT NULL,
 space_id TEXT NOT NULL,host_roll INTEGER NOT NULL,host_range INTEGER NOT NULL,
 episode_roll INTEGER NOT NULL,episode_range INTEGER NOT NULL,created_at INTEGER NOT NULL,
 PRIMARY KEY(owner_id,roll_id));
CREATE INDEX IF NOT EXISTS idx_followed_owner_active ON followed_hosts(owner_id,active,handle);
CREATE INDEX IF NOT EXISTS idx_episodes_host ON space_episodes(host_user_id,availability,imported_at);
CREATE INDEX IF NOT EXISTS idx_rolls_owner ON space_rolls(owner_id,created_at DESC);
