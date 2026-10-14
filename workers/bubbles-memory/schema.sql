-- Append-only until explicit owner deletion. Each event ID is idempotent.
CREATE TABLE IF NOT EXISTS bubbles_messages (
 seq INTEGER PRIMARY KEY AUTOINCREMENT,
 owner TEXT NOT NULL,
 id TEXT NOT NULL,
 role TEXT NOT NULL CHECK (role IN ('user','assistant','note')),
 text TEXT NOT NULL,
 at INTEGER NOT NULL,
 UNIQUE(owner,id)
);
CREATE INDEX IF NOT EXISTS bubbles_owner_seq ON bubbles_messages(owner,seq);
