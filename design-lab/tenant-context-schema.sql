-- Design-only schema: do NOT apply to the production wallet or memory D1.
-- A dedicated routing D1 can use this after review and a separate migration.
-- Cloudflare D1 enforces foreign keys by default; local SQLite tests enable them.

CREATE TABLE IF NOT EXISTS qp_context_profiles (
  owner_id TEXT NOT NULL CHECK(length(owner_id) BETWEEN 1 AND 128),
  profile_id TEXT NOT NULL CHECK(length(profile_id) BETWEEN 1 AND 128),
  label TEXT NOT NULL DEFAULT '' CHECK(length(label) <= 120),
  policy_version INTEGER NOT NULL CHECK(policy_version > 0),
  created_at INTEGER NOT NULL CHECK(created_at > 0),
  PRIMARY KEY(owner_id, profile_id)
);

CREATE TABLE IF NOT EXISTS qp_context_sessions (
  owner_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  session_id TEXT NOT NULL CHECK(length(session_id) BETWEEN 8 AND 128),
  context_sha256 TEXT NOT NULL CHECK(length(context_sha256) = 64),
  updated_at INTEGER NOT NULL CHECK(updated_at > 0),
  PRIMARY KEY(owner_id, profile_id, session_id),
  FOREIGN KEY(owner_id, profile_id) REFERENCES qp_context_profiles(owner_id, profile_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS qp_route_jobs (
  owner_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  job_id TEXT NOT NULL CHECK(length(job_id) BETWEEN 8 AND 128),
  idempotency_key TEXT NOT NULL CHECK(length(idempotency_key) BETWEEN 8 AND 128),
  circuit TEXT NOT NULL CHECK(circuit IN ('collect','research','shop','signal','mixed')),
  request_sha256 TEXT NOT NULL CHECK(length(request_sha256) = 64),
  state TEXT NOT NULL DEFAULT 'queued'
    CHECK(state IN ('queued','running','completed','failed','cancelled')),
  target_limit INTEGER NOT NULL CHECK(target_limit BETWEEN 1 AND 40),
  created_at INTEGER NOT NULL CHECK(created_at > 0),
  updated_at INTEGER NOT NULL CHECK(updated_at >= created_at),
  PRIMARY KEY(owner_id, job_id),
  UNIQUE(owner_id, profile_id, job_id),
  UNIQUE(owner_id, idempotency_key),
  FOREIGN KEY(owner_id, profile_id) REFERENCES qp_context_profiles(owner_id, profile_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS qp_jobs_queue ON qp_route_jobs(state, created_at);

CREATE TABLE IF NOT EXISTS qp_route_targets (
  owner_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  domain TEXT NOT NULL CHECK(length(domain) BETWEEN 4 AND 253 AND instr(domain, '/') = 0),
  position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 40),
  state TEXT NOT NULL DEFAULT 'queued'
    CHECK(state IN ('queued','running','matched','empty','error','cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
  updated_at INTEGER NOT NULL CHECK(updated_at > 0),
  PRIMARY KEY(owner_id, job_id, domain),
  UNIQUE(owner_id, job_id, position),
  FOREIGN KEY(owner_id, profile_id, job_id)
    REFERENCES qp_route_jobs(owner_id, profile_id, job_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS qp_route_target_queue
  ON qp_route_targets(state, updated_at);

-- Evidence pointer only; this does not mint, transfer, or balance Quants.
-- Do not persist raw search text, cookies, OAuth tokens or chat transcripts.
CREATE TABLE IF NOT EXISTS qp_route_receipts (
  owner_id TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  receipt_id TEXT NOT NULL CHECK(length(receipt_id) BETWEEN 8 AND 128),
  job_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL CHECK(length(idempotency_key) BETWEEN 8 AND 128),
  kind TEXT NOT NULL CHECK(kind IN ('source-result','source-error','job-finished')),
  payload_sha256 TEXT NOT NULL CHECK(length(payload_sha256) = 64),
  created_at INTEGER NOT NULL CHECK(created_at > 0),
  PRIMARY KEY(owner_id, receipt_id),
  UNIQUE(owner_id, idempotency_key),
  FOREIGN KEY(owner_id, profile_id, job_id)
    REFERENCES qp_route_jobs(owner_id, profile_id, job_id)
    ON UPDATE RESTRICT ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS qp_receipts_job
  ON qp_route_receipts(owner_id, profile_id, job_id, created_at);

CREATE TRIGGER IF NOT EXISTS qp_receipts_immutable_update
BEFORE UPDATE ON qp_route_receipts
BEGIN SELECT RAISE(ABORT, 'immutable_route_receipt'); END;

CREATE TRIGGER IF NOT EXISTS qp_receipts_immutable_delete
BEFORE DELETE ON qp_route_receipts
BEGIN SELECT RAISE(ABORT, 'immutable_route_receipt'); END;

CREATE TRIGGER IF NOT EXISTS qp_job_identity_immutable
BEFORE UPDATE OF owner_id, profile_id, job_id, idempotency_key, request_sha256
ON qp_route_jobs
BEGIN SELECT RAISE(ABORT, 'immutable_job_identity'); END;

CREATE TRIGGER IF NOT EXISTS qp_target_identity_immutable
BEFORE UPDATE OF owner_id, profile_id, job_id, domain, position
ON qp_route_targets
BEGIN SELECT RAISE(ABORT, 'immutable_target_identity'); END;
