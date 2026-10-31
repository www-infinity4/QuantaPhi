-- Dedicated private Zeus history, separated from shared Coliseum room chat.
-- Apply to the Coliseum D1 database; no DROP, DELETE, or wallet-table changes.
CREATE TABLE IF NOT EXISTS zeus_threads (
 member_id TEXT NOT NULL,
 id TEXT NOT NULL,
 title TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(member_id,id)
);
CREATE INDEX IF NOT EXISTS idx_zeus_threads_owner ON zeus_threads(member_id,created_at,id);
CREATE TABLE IF NOT EXISTS zeus_turns (
 member_id TEXT NOT NULL,
 thread_id TEXT NOT NULL,
 id TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('user','assistant')),
 text TEXT NOT NULL,
 created_at TEXT NOT NULL,
 PRIMARY KEY(member_id,thread_id,id),
 FOREIGN KEY(member_id,thread_id) REFERENCES zeus_threads(member_id,id)
);
CREATE INDEX IF NOT EXISTS idx_zeus_turns_thread ON zeus_turns(member_id,thread_id,created_at,id);
