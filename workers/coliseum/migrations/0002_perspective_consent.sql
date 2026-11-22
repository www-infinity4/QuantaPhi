-- Opt-in advisory use of a VOLUNTARILY PUBLISHED idea, separate from room
-- publication itself. Existing personal chats, messages and device history
-- are not copied. Beta stays disabled unless original gated settings allow it.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS coliseum_perspective_consents (
 idea_id TEXT NOT NULL,
 member_id TEXT NOT NULL,
 shared INTEGER NOT NULL DEFAULT 0 CHECK(shared IN (0,1)),
 purpose TEXT NOT NULL CHECK(purpose='bubbles-advisory-v1'),
 updated_at TEXT NOT NULL,
 PRIMARY KEY(idea_id,member_id),
 FOREIGN KEY(idea_id) REFERENCES coliseum_ideas(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_coliseum_perspective_active
 ON coliseum_perspective_consents(shared,purpose,updated_at);
