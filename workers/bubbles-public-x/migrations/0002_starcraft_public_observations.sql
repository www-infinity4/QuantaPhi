-- #1210 · Reviewed StarCraftCo public-browser references.
-- This is NOT an X post scraper or credential store.
-- Kept apart from owner_x_posts and owner_x_scans so that a TinyFish
-- browser observation never masquerades as a successful Cloudflare scan.
CREATE TABLE IF NOT EXISTS starcraft_public_observations (
  account TEXT NOT NULL DEFAULT 'StarCraftCo' CHECK(account = 'StarCraftCo'),
  post_id TEXT PRIMARY KEY NOT NULL,
  url TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  audience TEXT NOT NULL CHECK(audience IN ('general','restricted')),
  source_method TEXT NOT NULL CHECK(source_method = 'tinyfish_public_browser'),
  source_run_url TEXT NOT NULL,
  observed_at TEXT NOT NULL,
  inserted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_starcraft_public_observations_audience_id
 ON starcraft_public_observations (audience, post_id);
