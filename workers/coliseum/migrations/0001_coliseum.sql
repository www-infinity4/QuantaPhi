-- Apply once to a dedicated Cloudflare D1 database before enabling the beta.
-- All memberships are pseudonymized server-side; no wallet balances or secrets.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS coliseum_members (
 model_id TEXT NOT NULL, member_id TEXT NOT NULL, joined_at TEXT NOT NULL,
 PRIMARY KEY(model_id, member_id)
);
CREATE TABLE IF NOT EXISTS coliseum_ideas (
 id TEXT PRIMARY KEY, model_id TEXT NOT NULL, sector TEXT NOT NULL,
 member_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL,
 parent_id TEXT, created_at TEXT NOT NULL,
 FOREIGN KEY(model_id,member_id) REFERENCES coliseum_members(model_id,member_id),
 FOREIGN KEY(parent_id) REFERENCES coliseum_ideas(id)
);
CREATE INDEX IF NOT EXISTS idx_coliseum_ideas_room ON coliseum_ideas(model_id,sector,created_at);
CREATE TABLE IF NOT EXISTS coliseum_votes (
 idea_id TEXT NOT NULL, member_id TEXT NOT NULL, position TEXT NOT NULL CHECK(position IN ('support','question')),
 created_at TEXT NOT NULL, PRIMARY KEY(idea_id,member_id),
 FOREIGN KEY(idea_id) REFERENCES coliseum_ideas(id)
);
CREATE TABLE IF NOT EXISTS coliseum_messages (
 id TEXT PRIMARY KEY, model_id TEXT NOT NULL, sector TEXT NOT NULL,
 member_id TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL,
 FOREIGN KEY(model_id,member_id) REFERENCES coliseum_members(model_id,member_id)
);
CREATE INDEX IF NOT EXISTS idx_coliseum_messages_room ON coliseum_messages(model_id,sector,created_at);
CREATE TABLE IF NOT EXISTS coliseum_rates (
 member_id TEXT NOT NULL, action TEXT NOT NULL, minute INTEGER NOT NULL,
 count INTEGER NOT NULL, PRIMARY KEY(member_id,action,minute)
);
CREATE INDEX IF NOT EXISTS idx_coliseum_rates_minute ON coliseum_rates(minute);
