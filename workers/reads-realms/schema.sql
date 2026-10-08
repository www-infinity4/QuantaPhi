-- Infinity Reads & Realms isolated content index; no wallet tables.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS rr_sectors (
  id INTEGER PRIMARY KEY CHECK(id BETWEEN 1 AND 30),
  name TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK(enabled IN (0,1))
);
CREATE TABLE IF NOT EXISTS rr_topics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sector_id INTEGER NOT NULL REFERENCES rr_sectors(id),
  term TEXT NOT NULL,
  normalized TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'editorial_seed',
  source_url TEXT,
  reviewed INTEGER NOT NULL DEFAULT 0 CHECK(reviewed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sector_id,normalized)
);
CREATE INDEX IF NOT EXISTS rr_topics_by_sector ON rr_topics(sector_id,reviewed,id);
CREATE TABLE IF NOT EXISTS rr_refinements (
  id INTEGER PRIMARY KEY CHECK(id BETWEEN 1 AND 30),
  label TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS rr_genres (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  directive TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rr_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain TEXT NOT NULL UNIQUE,
  homepage TEXT NOT NULL,
  source_class INTEGER NOT NULL CHECK(source_class BETWEEN 1 AND 10),
  enabled INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS rr_stories (
  id TEXT PRIMARY KEY,
  sector_id INTEGER NOT NULL REFERENCES rr_sectors(id),
  topic_id INTEGER NOT NULL REFERENCES rr_topics(id),
  refinement_id INTEGER NOT NULL REFERENCES rr_refinements(id),
  genre_id INTEGER NOT NULL REFERENCES rr_genres(id),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  canonical_event_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(canonical_event_key)
);
CREATE TABLE IF NOT EXISTS rr_story_seen (
  reader_key TEXT NOT NULL,
  story_id TEXT NOT NULL,
  seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(reader_key,story_id)
);
CREATE TABLE IF NOT EXISTS rr_generation_audit (
  id TEXT PRIMARY KEY,
  bracket_json TEXT NOT NULL,
  result_status TEXT NOT NULL,
  explanation TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
