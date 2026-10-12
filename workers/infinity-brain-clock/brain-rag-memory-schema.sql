-- Compatibility migration for the EXISTING live brain_experiences table in WORK_DB.
-- Additive-only; no ALTER, DROP, DELETE, wallet mutations or table replacement.
CREATE TABLE IF NOT EXISTS brain_experiences (
 experience_id TEXT PRIMARY KEY,
 owner_hash TEXT NOT NULL,
 repository TEXT NOT NULL,
 ticket_id TEXT NOT NULL DEFAULT '',
 job_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL CHECK(kind IN ('observation','outcome','lesson','procedure')),
 status TEXT NOT NULL,
 summary TEXT NOT NULL CHECK(length(summary) BETWEEN 1 AND 1800),
 evidence_url TEXT NOT NULL DEFAULT '',
 metadata_json TEXT NOT NULL DEFAULT '{}',
 verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN (0,1)),
 occurred_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 embedding_status TEXT NOT NULL DEFAULT 'pending'
);
CREATE INDEX IF NOT EXISTS idx_brain_memory_owner_repo_time
 ON brain_experiences(owner_hash,repository,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_memory_owner_time
 ON brain_experiences(owner_hash,occurred_at DESC);