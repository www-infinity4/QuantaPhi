-- Isolated US-jurisdiction D1 for QuantaPhi first-party Bubbles verification.
-- NEVER store plaintext SSNs, full birth dates, government ID numbers/photos,
-- auth credentials, cookies or unredacted audit events in this database.
-- identity_evidence.*ciphertext* MUST be AES-256-GCM encrypted by private Worker
-- with per-record random IV and AAD before any future collection is enabled.
-- D1 EAR is additional protection, not a substitute for application encryption.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS identity_subjects (
 subject_key TEXT PRIMARY KEY CHECK(length(subject_key)=64),
 verification_status TEXT NOT NULL DEFAULT 'unverified'
  CHECK(verification_status IN ('unverified','pending','verified_21','denied','expired','revoked')),
 proof_kind TEXT NOT NULL DEFAULT 'none'
  CHECK(proof_kind IN ('none','infinity_verified')),
 verified_at TEXT NOT NULL DEFAULT '',
 expires_at TEXT NOT NULL DEFAULT '',
 last_case_id TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS identity_evidence (
 evidence_id TEXT PRIMARY KEY,
 subject_key TEXT NOT NULL REFERENCES identity_subjects(subject_key) ON DELETE CASCADE,
 evidence_type TEXT NOT NULL CHECK(evidence_type IN ('government_id','ssn_optional','address','other')),
 ciphertext_b64 TEXT NOT NULL,
 iv_b64 TEXT NOT NULL,
 key_version TEXT NOT NULL DEFAULT 'v1',
 algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM' CHECK(algorithm='AES-256-GCM'),
 evidence_status TEXT NOT NULL DEFAULT 'pending' CHECK(evidence_status IN ('pending','validated','rejected')),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 purge_after TEXT NOT NULL,
 UNIQUE(subject_key,evidence_id)
);
CREATE TABLE IF NOT EXISTS identity_review_cases (
 case_id TEXT PRIMARY KEY,
 subject_key TEXT NOT NULL REFERENCES identity_subjects(subject_key) ON DELETE CASCADE,
 state TEXT NOT NULL DEFAULT 'pending'
  CHECK(state IN ('pending','reviewing','approved','rejected','revoked')),
 proof_method TEXT NOT NULL DEFAULT '',
 evidence_validated INTEGER NOT NULL DEFAULT 0 CHECK(evidence_validated IN (0,1)),
 holder_bound INTEGER NOT NULL DEFAULT 0 CHECK(holder_bound IN (0,1)),
 birthdate_validated INTEGER NOT NULL DEFAULT 0 CHECK(birthdate_validated IN (0,1)),
 reviewer_approved INTEGER NOT NULL DEFAULT 0 CHECK(reviewer_approved IN (0,1)),
 reviewer_key TEXT NOT NULL DEFAULT '',
 reviewed_at TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_identity_review_subject ON identity_review_cases(subject_key,state);
CREATE INDEX IF NOT EXISTS idx_identity_evidence_purge ON identity_evidence(purge_after);
CREATE TABLE IF NOT EXISTS identity_consents (
 subject_key TEXT NOT NULL REFERENCES identity_subjects(subject_key) ON DELETE CASCADE,
 purpose TEXT NOT NULL CHECK(purpose IN ('age_verification','ssn_identity_resolution')),
 consent_version TEXT NOT NULL,
 accepted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 withdrawn_at TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(subject_key,purpose)
);
CREATE TABLE IF NOT EXISTS identity_access_audit (
 event_id TEXT PRIMARY KEY,
 actor_key TEXT NOT NULL,
 event_type TEXT NOT NULL CHECK(event_type IN
  ('case_opened','evidence_checked','review_approved','review_rejected','eligibility_read','access_denied','revoke','purge')),
 subject_key TEXT NOT NULL,
 case_id TEXT NOT NULL DEFAULT '',
 recorded_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 result TEXT NOT NULL CHECK(result IN ('allowed','denied','pending'))
);
CREATE INDEX IF NOT EXISTS idx_identity_access_time ON identity_access_audit(recorded_at);
