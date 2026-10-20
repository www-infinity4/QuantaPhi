-- Dedicated audit queue for an owner-approved five-day ChatGPT-to-Bubbles bridge.
-- Apply once to WORK_DB / rogers-consensus; no tokens or session credentials here.
CREATE TABLE IF NOT EXISTS bubbles_chatgpt_bridge (
 id TEXT PRIMARY KEY,
 action TEXT NOT NULL,
 payload TEXT NOT NULL DEFAULT '{}',
 status TEXT NOT NULL DEFAULT 'queued',
 result TEXT,
 created_ms INTEGER NOT NULL,
 updated_ms INTEGER NOT NULL,
 expires_ms INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bubbles_chatgpt_bridge_next
 ON bubbles_chatgpt_bridge(status, created_ms);
