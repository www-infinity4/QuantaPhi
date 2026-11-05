-- Proposed isolated D1 work-packet metadata schema for Bubbles Bits.
-- There is NO mint, debit, credit, cash value, or automatic transfer in this migration.
-- An authenticated server-side settlement service requires a separate approval.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS bubble_bit_candidates (
  packet_id TEXT PRIMARY KEY CHECK(length(packet_id)=64),
  customer_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  operation_id TEXT NOT NULL,
  criteria_key TEXT NOT NULL,
  capability TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence_stage TEXT NOT NULL,
  files_tested INTEGER NOT NULL CHECK(files_tested>=0),
  files_changed INTEGER NOT NULL CHECK(files_changed>=0),
  share_policy TEXT NOT NULL DEFAULT 'private' CHECK(share_policy IN ('private','public_blueprint')),
  state TEXT NOT NULL DEFAULT 'pending_review' CHECK(state IN ('pending_review','reviewed','rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(customer_id,task_id,operation_id)
);
CREATE TABLE IF NOT EXISTS bubble_bit_evidence (
  receipt_id TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL REFERENCES bubble_bit_candidates(packet_id),
  tool_name TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  CHECK(length(receipt_id)>=8)
);
CREATE TABLE IF NOT EXISTS bubble_bit_share_grants (
  grant_id TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL REFERENCES bubble_bit_candidates(packet_id),
  owner_customer_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('blueprint_read','private_share')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
-- Transfer INTENTS are not settlement transactions. No wallet account is mutated.
CREATE TABLE IF NOT EXISTS bubble_bit_transfer_intents (
  transfer_id TEXT PRIMARY KEY,
  packet_id TEXT NOT NULL REFERENCES bubble_bit_candidates(packet_id),
  from_wallet_id TEXT NOT NULL,
  to_wallet_id TEXT NOT NULL,
  authorization_grant_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1 CHECK(amount=1),
  state TEXT NOT NULL DEFAULT 'proposed' CHECK(state IN ('proposed','denied')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK(from_wallet_id<>to_wallet_id)
);
CREATE INDEX IF NOT EXISTS idx_bubble_bit_customer ON bubble_bit_candidates(customer_id,state);
CREATE INDEX IF NOT EXISTS idx_bubble_bit_share_packet ON bubble_bit_share_grants(packet_id,recipient_id);
