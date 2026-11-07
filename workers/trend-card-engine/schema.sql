-- Isolated Trend-to-Card source DB. Never share with Quanta/StarCoin wallets or identity records.
CREATE TABLE IF NOT EXISTS trend_signals (
  query TEXT PRIMARY KEY,
  source_url TEXT NOT NULL,
  approx_searches TEXT,
  checked_at TEXT NOT NULL,
  source TEXT NOT NULL CHECK(source='google-trends-rss')
);
CREATE INDEX IF NOT EXISTS trend_signals_checked ON trend_signals(checked_at);
CREATE TABLE IF NOT EXISTS continuity_jobs (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('gpt','yellow','orange','blue','green','red','purple','silver')),
  objective TEXT NOT NULL,
  depends_on TEXT,
  state TEXT NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','blocked','review','complete')),
  lease_owner TEXT,
  lease_until INTEGER,
  attempts INTEGER NOT NULL DEFAULT 0,
  evidence_receipt TEXT,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(batch_id,role)
);
CREATE INDEX IF NOT EXISTS continuity_jobs_status ON continuity_jobs(state,updated_at);
CREATE TABLE IF NOT EXISTS source_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  category TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  source_url TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  source_authority TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'organic',
  rights TEXT NOT NULL DEFAULT 'unknown',
  state TEXT NOT NULL DEFAULT 'pending',
  media_rights_verified INTEGER NOT NULL DEFAULT 0,
  card_tests_passed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orange_decisions (
  source_id TEXT PRIMARY KEY REFERENCES source_items(id),
  role TEXT NOT NULL DEFAULT 'orange',
  status TEXT NOT NULL DEFAULT 'proposed' CHECK(status IN ('proposed','approved','declined','revoked')),
  quant_ai_receipt TEXT,
  authorized_review_receipt TEXT,
  explanation TEXT,
  approved_at TEXT
);
