-- Bind a separate Cloudflare D1 database as SPONSOR_EVENTS_DB after deployment review.
-- No IP address, cookie identifier, wallet address, geographic fingerprint, or PII.
CREATE TABLE IF NOT EXISTS sponsor_events (
  event_id TEXT PRIMARY KEY,
  campaign TEXT NOT NULL CHECK(campaign IN ('lazercat-2026','illicit-smokos-bruce-banner-2026')),
  event_type TEXT NOT NULL CHECK(event_type IN ('view','click')),
  placement TEXT NOT NULL CHECK(placement IN ('green-left-arm','green-right-arm','infinity-viewer')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS sponsor_events_campaign_type_idx ON sponsor_events(campaign,event_type,created_at);
