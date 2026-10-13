CREATE TABLE IF NOT EXISTS presence(session TEXT PRIMARY KEY,seen INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS presence_seen ON presence(seen);
CREATE TABLE IF NOT EXISTS events(session TEXT NOT NULL,minute INTEGER NOT NULL,card TEXT NOT NULL,action TEXT NOT NULL,PRIMARY KEY(session,minute,card,action));
CREATE INDEX IF NOT EXISTS events_minute ON events(minute);

CREATE TABLE IF NOT EXISTS daily_reviews(day TEXT PRIMARY KEY,report TEXT NOT NULL,created INTEGER NOT NULL);
