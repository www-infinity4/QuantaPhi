-- Extends the existing U.S.-jurisdiction identity-vault. This is an
-- encrypted document register, not a public upload endpoint.
-- Never put the user's name, SSN, DOB, benefit amount, card number,
-- full bank coordinates, document filename, or extracted document text
-- into plaintext metadata. No upload route is enabled.
CREATE TABLE IF NOT EXISTS identity_document_vault (
 document_id TEXT PRIMARY KEY,
 subject_key TEXT NOT NULL REFERENCES identity_subjects(subject_key) ON DELETE CASCADE,
 document_type TEXT NOT NULL CHECK(document_type IN (
  'government_id','social_security_card','proof_of_address',
  'ssi_award','ssdi_award','income_letter','bank_statement',
  'financial_statement','business_document','credit_card',
  'tax_return','lease_mortgage','disability_document','other')),
 encrypted_metadata_b64 TEXT NOT NULL,
 metadata_iv_b64 TEXT NOT NULL,
 encrypted_blob_ref TEXT NOT NULL DEFAULT '',
 key_version TEXT NOT NULL DEFAULT 'v1',
 algorithm TEXT NOT NULL DEFAULT 'AES-256-GCM',
 verification_status TEXT NOT NULL DEFAULT 'unreviewed'
  CHECK(verification_status IN ('unreviewed','pending','verified','rejected')),
 user_visibility TEXT NOT NULL DEFAULT 'private' CHECK(user_visibility='private'),
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 purge_after TEXT NOT NULL,
 UNIQUE(subject_key,document_id)
);
CREATE INDEX IF NOT EXISTS idx_identity_documents_subject ON identity_document_vault(subject_key,document_type);
CREATE INDEX IF NOT EXISTS idx_identity_documents_purge ON identity_document_vault(purge_after);
