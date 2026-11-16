-- Public attractions only; never apply to restaurant or wallet D1 databases.
CREATE TABLE IF NOT EXISTS attractions(
 id TEXT PRIMARY KEY,name TEXT NOT NULL,city TEXT NOT NULL DEFAULT '',state TEXT NOT NULL CHECK(length(state)=2),
 category TEXT NOT NULL,address TEXT NOT NULL DEFAULT '',latitude REAL NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude REAL NOT NULL CHECK(longitude BETWEEN -180 AND 180),website TEXT NOT NULL DEFAULT '',
 source_name TEXT NOT NULL,source_url TEXT NOT NULL,license TEXT NOT NULL,confidence REAL NOT NULL DEFAULT 0,
 image_url TEXT NOT NULL DEFAULT '',image_attribution TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'listed' CHECK(status IN ('listed','needs_review','closed')),
 last_seen TEXT NOT NULL,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_attractions_state_city_name ON attractions(state,city,name);
CREATE INDEX IF NOT EXISTS idx_attractions_category_state ON attractions(state,category);
CREATE TABLE IF NOT EXISTS attraction_ingest_runs(
 run_id TEXT PRIMARY KEY,state TEXT NOT NULL,source_name TEXT NOT NULL,records INTEGER NOT NULL DEFAULT 0,
 imported_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS attraction_states(
 state TEXT PRIMARY KEY,display_name TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'queued',
 last_snapshot TEXT NOT NULL DEFAULT '',notes TEXT NOT NULL DEFAULT ''
);
