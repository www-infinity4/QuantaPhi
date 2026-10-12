-- Infinity Brain durable episodic job memory, additive D1 migration.
-- Run on WORK_DB (rogers-consensus) before deploying the Brain Clock code.
-- Source of truth, partitioned by server-authorized owner. Vector index is rebuildable.
CREATE TABLE IF NOT EXISTS brain_experiences (
 id TEXT PRIMARY KEY,
 owner_hash TEXT NOT NULL CHECK(length(owner_hash)=64),
 repository TEXT NOT NULL,
 ticket_id TEXT NOT NULL,
 job_id TEXT NOT NULL,
 status TEXT NOT NULL,
 task TEXT NOT NULL,
 summary TEXT NOT NULL,
 commit_sha TEXT NOT NULL DEFAULT '',
 occurred_at INTEGER NOT NULL,
 vector_state TEXT NOT NULL DEFAULT 'pending' CHECK(vector_state IN ('pending','indexed','retry')),
 created_at INTEGER NOT NULL DEFAULT (unixepoch()*1000)
);
CREATE INDEX IF NOT EXISTS idx_brain_experiences_owner_repo_time
 ON brain_experiences(owner_hash,repository,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_experiences_retry
 ON brain_experiences(vector_state,occurred_at);