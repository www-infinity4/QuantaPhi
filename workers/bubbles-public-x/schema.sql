CREATE TABLE IF NOT EXISTS owner_x_posts (
 id TEXT PRIMARY KEY,url TEXT NOT NULL UNIQUE,body TEXT NOT NULL,kind TEXT NOT NULL,
 observed_at TEXT NOT NULL,pinned INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS owner_x_posts_kind ON owner_x_posts(kind,id DESC);
CREATE TABLE IF NOT EXISTS owner_x_scans (
 k TEXT PRIMARY KEY,last_checked TEXT NOT NULL,last_success TEXT,status TEXT NOT NULL,
 visible_count INTEGER NOT NULL,new_count INTEGER NOT NULL,candidate_count INTEGER NOT NULL,error TEXT NOT NULL DEFAULT ''
);
