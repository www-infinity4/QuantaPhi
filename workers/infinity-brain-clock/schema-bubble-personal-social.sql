-- Wallet-scoped personal social tags, separate from public #bubbles proposals.
-- Do not run this before reviewing and backing up the existing WORK_DB.
CREATE TABLE IF NOT EXISTS bubble_social_profiles(
 user_id TEXT PRIMARY KEY,
 bubble_name TEXT NOT NULL,
 command_tag TEXT NOT NULL,
 provider TEXT NOT NULL CHECK(provider IN ('x','facebook_page')),
 social_account_id TEXT NOT NULL,
 verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN (0,1)),
 challenge_hash TEXT NOT NULL DEFAULT '',
 challenge_issued_at INTEGER NOT NULL DEFAULT 0,
 challenge_expires_at INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
-- A verified account can be bound to only one wallet identity.
CREATE UNIQUE INDEX IF NOT EXISTS bubble_verified_social_account
 ON bubble_social_profiles(provider,social_account_id) WHERE verified=1;
CREATE TABLE IF NOT EXISTS bubble_social_inbox(
 user_id TEXT NOT NULL,
 source_id TEXT NOT NULL,
 provider TEXT NOT NULL,
 source_url TEXT NOT NULL,
 command_tag TEXT NOT NULL,
 suggestion TEXT NOT NULL,
 category TEXT NOT NULL DEFAULT 'feature',
 proposed_placement TEXT NOT NULL DEFAULT 'community-review',
 gpt_status TEXT NOT NULL DEFAULT 'needs_review',
 gpt_summary TEXT NOT NULL DEFAULT '',
 risk TEXT NOT NULL DEFAULT 'high',
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','reviewed','dismissed')),
 added_at INTEGER NOT NULL,
 PRIMARY KEY(user_id,source_id),
 FOREIGN KEY(user_id) REFERENCES bubble_social_profiles(user_id)
);
CREATE INDEX IF NOT EXISTS bubble_social_inbox_by_owner
 ON bubble_social_inbox(user_id,added_at DESC);
