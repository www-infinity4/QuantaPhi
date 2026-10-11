-- Media Star followed-X-Space library. No copies of the Fred payout ledger.
CREATE TABLE IF NOT EXISTS follow_snapshots (
 owner_id TEXT NOT NULL, snapshot_id TEXT NOT NULL, source TEXT NOT NULL
 CHECK(source IN ('x_api_verified','owner_import')), imported_at INTEGER NOT NULL,
 account_count INTEGER NOT NULL, PRIMARY KEY(owner_id,snapshot_id)
);
CREATE TABLE IF NOT EXISTS followed_hosts (
 owner_id TEXT NOT NULL, x_user_id TEXT NOT NULL, handle TEXT NOT NULL,
 display_name TEXT NOT NULL, source TEXT NOT NULL CHECK(source IN ('x_api_verified','owner_import')),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
 snapshot_id TEXT NOT NULL, updated_at INTEGER NOT NULL,
 PRIMARY KEY(owner_id,x_user_id)
);
CREATE INDEX IF NOT EXISTS followed_hosts_active ON followed_hosts(owner_id,active,handle);
CREATE TABLE IF NOT EXISTS space_hosts (
 x_user_id TEXT PRIMARY KEY,handle TEXT NOT NULL,display_name TEXT NOT NULL,
 profile_url TEXT NOT NULL,featured INTEGER NOT NULL DEFAULT 0 CHECK(featured IN (0,1)),
 updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS space_episodes (
 space_id TEXT PRIMARY KEY, host_user_id TEXT NOT NULL REFERENCES space_hosts(x_user_id),
 title TEXT NOT NULL,space_url TEXT NOT NULL UNIQUE,
 started_at TEXT, duration_seconds INTEGER, summary TEXT NOT NULL DEFAULT '',
 source_type TEXT NOT NULL CHECK(source_type IN ('x_api','curated_archive','owner_submitted')),
 availability TEXT NOT NULL DEFAULT 'indexed'
 CHECK(availability IN ('indexed','verified_replay','unavailable')),
 last_checked INTEGER,checked_by TEXT,imported_at INTEGER NOT NULL,
 CHECK(space_url LIKE 'https://x.com/i/spaces/%')
);
CREATE INDEX IF NOT EXISTS space_episodes_by_host ON space_episodes(host_user_id,availability,space_id);
CREATE TABLE IF NOT EXISTS space_import_runs (
 run_id TEXT PRIMARY KEY,owner_id TEXT NOT NULL,source TEXT NOT NULL,
 imported_hosts INTEGER NOT NULL DEFAULT 0,imported_episodes INTEGER NOT NULL DEFAULT 0,
 rejected INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS space_rolls (
 owner_id TEXT NOT NULL,roll_id TEXT NOT NULL,host_user_id TEXT NOT NULL,
 space_id TEXT NOT NULL,host_roll INTEGER NOT NULL,host_range INTEGER NOT NULL,
 episode_roll INTEGER NOT NULL,episode_range INTEGER NOT NULL,
 created_at INTEGER NOT NULL,PRIMARY KEY(owner_id,roll_id)
);
CREATE INDEX IF NOT EXISTS space_rolls_recent ON space_rolls(owner_id,created_at DESC);
CREATE TABLE IF NOT EXISTS space_seen (
 owner_id TEXT NOT NULL,space_id TEXT NOT NULL,last_seen INTEGER NOT NULL,
 cycle INTEGER NOT NULL DEFAULT 1,PRIMARY KEY(owner_id,space_id)
);

-- Source discovery links are NOT verified playable episodes. These source
-- indexes let a reviewer/authorized importer investigate each followed host.
CREATE TABLE IF NOT EXISTS space_host_sources (
 host_user_id TEXT NOT NULL REFERENCES space_hosts(x_user_id),
 source_url TEXT NOT NULL,
 source_kind TEXT NOT NULL CHECK(source_kind IN ('x_profile','public_archive')),
 review_status TEXT NOT NULL DEFAULT 'discovery_only'
 CHECK(review_status IN ('discovery_only','reviewed')),
 last_checked INTEGER,
 notes TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(host_user_id,source_url)
);
CREATE INDEX IF NOT EXISTS idx_space_sources_host ON space_host_sources(host_user_id);

-- An owner-declared X @handle identifies which authorized X account may sync.
-- A screenshot/name alone is not provider authentication. Only X /2/users/me
-- can transition a matching handle to x_api_verified.
CREATE TABLE IF NOT EXISTS x_account_links (
 owner_id TEXT PRIMARY KEY,
 handle TEXT NOT NULL,
 verification TEXT NOT NULL DEFAULT 'owner_claimed'
  CHECK(verification IN ('owner_claimed','x_api_verified')),
 x_user_id TEXT,
 declared_at INTEGER NOT NULL,
 verified_at INTEGER,
 CHECK(verification!='x_api_verified' OR (x_user_id IS NOT NULL AND verified_at IS NOT NULL))
);

-- Private per-listener replay outcomes: owner-reported "no audio" episodes are
-- excluded from subsequent rolls for that owner only. A reported successful
-- playback is NOT a global verified_replay entitlement.
CREATE TABLE IF NOT EXISTS space_playback_reports (
 owner_id TEXT NOT NULL,
 space_id TEXT NOT NULL REFERENCES space_episodes(space_id),
 state TEXT NOT NULL CHECK(state IN ('played','unavailable')),
 reported_at INTEGER NOT NULL,
 PRIMARY KEY(owner_id,space_id)
);
CREATE INDEX IF NOT EXISTS idx_space_playback_reports_owner
 ON space_playback_reports(owner_id,state);

-- Personal radio settings. Weighted means an episode ticket wins first,
-- so a 342-episode host naturally wins more often than a one-episode host.
-- Only eligible indexed hosts participate; unfinished Magoo source cards don't.
CREATE TABLE IF NOT EXISTS space_radio_preferences (
 owner_id TEXT PRIMARY KEY,
 selection_mode TEXT NOT NULL DEFAULT 'episodes_weighted'
 CHECK(selection_mode IN ('episodes_weighted','equal_hosts')),
 include_fred INTEGER NOT NULL DEFAULT 0 CHECK(include_fred IN (0,1)),
 updated_at INTEGER NOT NULL
);
