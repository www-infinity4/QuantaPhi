-- First-party metadata cache for the federated Radio Browser index.
-- Does not store, reproduce, proxy, or archive broadcaster audio.
CREATE TABLE IF NOT EXISTS radio_stations (
  id TEXT PRIMARY KEY,
  state_code TEXT NOT NULL CHECK(length(state_code)=2),
  name TEXT NOT NULL,
  website TEXT,
  favicon TEXT,
  stream_url TEXT,
  codec TEXT NOT NULL DEFAULT '',
  genre TEXT NOT NULL DEFAULT '',
  checked_at TEXT,
  updated_at INTEGER NOT NULL,
  can_play_inline INTEGER NOT NULL DEFAULT 0 CHECK(can_play_inline IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_radio_stations_state ON radio_stations(state_code, name);
CREATE TABLE IF NOT EXISTS radio_station_pages (
  state_code TEXT NOT NULL CHECK(length(state_code)=2),
  query TEXT NOT NULL,
  page INTEGER NOT NULL CHECK(page>=0),
  payload TEXT NOT NULL,
  fetched_at INTEGER NOT NULL,
  PRIMARY KEY (state_code,query,page)
);
CREATE INDEX IF NOT EXISTS idx_radio_station_pages_age ON radio_station_pages(fetched_at);
