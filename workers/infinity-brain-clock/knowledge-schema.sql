-- Infinity Brain knowledge phase 2, schema v1.
-- Additive-only: does not alter work_tickets, user identity, rewards, or wallet ledgers.
-- Apply to the verified WORK_DB binding with D1. Safe to run repeatedly.
CREATE TABLE IF NOT EXISTS quant_knowledge_catalog (
  knowledge_id TEXT PRIMARY KEY,
  repository TEXT NOT NULL CHECK(length(repository) BETWEEN 3 AND 160),
  source_kind TEXT NOT NULL CHECK(source_kind IN ('source','test','readme','receipt','deployment','research')),
  source_ref TEXT NOT NULL,
  source_sha TEXT,
  content_hash TEXT NOT NULL CHECK(length(content_hash)=64),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  observed_at INTEGER NOT NULL,
  verified_at INTEGER,
  revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1),
  UNIQUE(repository, source_kind, source_ref, content_hash)
);
CREATE INDEX IF NOT EXISTS idx_brain_knowledge_repo_time
  ON quant_knowledge_catalog(repository, observed_at DESC);
CREATE TABLE IF NOT EXISTS knowledge_dependency_edges (
  edge_id TEXT PRIMARY KEY,
  from_knowledge_id TEXT NOT NULL REFERENCES quant_knowledge_catalog(knowledge_id) ON DELETE RESTRICT,
  to_knowledge_id TEXT NOT NULL REFERENCES quant_knowledge_catalog(knowledge_id) ON DELETE RESTRICT,
  relation TEXT NOT NULL CHECK(relation IN ('depends_on','verifies','supersedes','explains','references')),
  evidence_hash TEXT CHECK(evidence_hash IS NULL OR length(evidence_hash)=64),
  created_at INTEGER NOT NULL,
  CHECK(from_knowledge_id<>to_knowledge_id),
  UNIQUE(from_knowledge_id,to_knowledge_id,relation)
);
CREATE INDEX IF NOT EXISTS idx_brain_dependencies_to
  ON knowledge_dependency_edges(to_knowledge_id,relation);
CREATE TABLE IF NOT EXISTS execution_provenance_registry (
  provenance_id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  job_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  repository TEXT NOT NULL,
  base_sha TEXT,
  commit_sha TEXT,
  status TEXT NOT NULL CHECK(status IN ('claimed','reading','building','review','tested','committed_unverified','deployed_verified','blocked')),
  agent_id TEXT NOT NULL,
  work_receipt_ref TEXT,
  test_receipt_ref TEXT,
  review_receipt_ref TEXT,
  deploy_receipt_ref TEXT,
  summary TEXT NOT NULL DEFAULT '',
  recorded_at INTEGER NOT NULL,
  CHECK(status NOT IN ('committed_unverified','deployed_verified') OR
    (commit_sha IS NOT NULL AND length(commit_sha)=40 AND test_receipt_ref IS NOT NULL AND review_receipt_ref IS NOT NULL)),
  CHECK(status<>'deployed_verified' OR (deploy_receipt_ref IS NOT NULL AND length(deploy_receipt_ref)>0)),
  UNIQUE(ticket_id,job_id,attempt_id)
);
CREATE INDEX IF NOT EXISTS idx_brain_provenance_job
  ON execution_provenance_registry(ticket_id,job_id,recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_provenance_repo
  ON execution_provenance_registry(repository,recorded_at DESC);
