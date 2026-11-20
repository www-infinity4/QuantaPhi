-- New, dedicated D1 tables. Do not run blindly against existing users/events tables.
-- All persisted timestamps are INTEGER Unix epoch milliseconds (not SQLite seconds).

CREATE TABLE users (
  id           TEXT PRIMARY KEY NOT NULL,
  created_at   INTEGER NOT NULL CHECK (typeof(created_at) = 'integer' AND created_at > 0),
  state_code   TEXT CHECK (state_code IS NULL OR length(state_code) BETWEEN 1 AND 8),
  device_type  TEXT NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  -- Edge-only metadata. Optional because request.cf can be unavailable.
  edge_region  TEXT,
  postal_code  TEXT
);

CREATE TABLE events (
  id                TEXT PRIMARY KEY NOT NULL,
  user_id           TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type        VARCHAR(120) NOT NULL CHECK (length(trim(event_type)) BETWEEN 1 AND 120),
  target_entity     VARCHAR(240) NOT NULL CHECK (length(trim(target_entity)) BETWEEN 1 AND 240),
  numerical_value   REAL NOT NULL CHECK (typeof(numerical_value) IN ('real', 'integer')),
  created_at_ms     INTEGER NOT NULL CHECK (typeof(created_at_ms) = 'integer' AND created_at_ms > 0)
);

-- SQLite/D1 compound index; D1 has no conventional clustered-table index.
CREATE INDEX idx_events_user_type_created
  ON events (user_id, event_type, created_at_ms DESC);

-- Only needed for bounded time-based privacy/retention pruning and time-window scans.
-- At high volume, test its write/storage overhead with real telemetry.
CREATE INDEX idx_events_created_at_ms
  ON events (created_at_ms);