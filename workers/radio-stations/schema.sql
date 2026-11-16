-- Separate QuantaPhi station catalogue; read-only public Worker may query this.
-- Every entry must refer to a real broadcaster source. Do not fabricate streams.
CREATE TABLE IF NOT EXISTS radio_stations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  state_code TEXT NOT NULL,
  frequency TEXT NOT NULL,
  genre TEXT NOT NULL,
  city TEXT NOT NULL,
  player TEXT NOT NULL CHECK (player IN ('mp3','iheart')),
  source_url TEXT NOT NULL,
  stream_url TEXT,
  low_stream_url TEXT,
  schedule_url TEXT,
  status TEXT NOT NULL DEFAULT 'listed' CHECK (status IN ('listed','verified','disabled')),
  source_checked_at TEXT,
  playback_checked_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_radio_stations_state ON radio_stations(state_code,status,name);
