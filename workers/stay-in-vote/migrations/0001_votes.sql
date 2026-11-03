-- Separate public community voting DB. Never reuse wallet, identity vault, or official election tables.
-- All vote counts are independent site opinions; no table here stores certified government election results.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS vote_polls(
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL DEFAULT 'community' CHECK(kind='community'),
 title TEXT NOT NULL CHECK(length(title) BETWEEN 3 AND 180),
 details TEXT NOT NULL CHECK(length(details)<=1600),
 source_url TEXT NOT NULL CHECK(source_url LIKE 'https://%'),
 status TEXT NOT NULL CHECK(status IN ('draft','open','closed')),
 open_at TEXT NOT NULL, closes_at TEXT NOT NULL,
 CHECK(open_at < closes_at)
);
CREATE TABLE IF NOT EXISTS vote_choices(
 poll_id TEXT NOT NULL,
 id TEXT NOT NULL,
 label TEXT NOT NULL CHECK(length(label) BETWEEN 1 AND 180),
 position INTEGER NOT NULL CHECK(position BETWEEN 0 AND 30),
 PRIMARY KEY(poll_id,id),
 FOREIGN KEY(poll_id) REFERENCES vote_polls(id)
);
CREATE TABLE IF NOT EXISTS vote_ballots(
 poll_id TEXT NOT NULL,
 voter_hash TEXT NOT NULL CHECK(length(voter_hash)=64),
 choice_id TEXT NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(poll_id,voter_hash),
 FOREIGN KEY(poll_id,choice_id) REFERENCES vote_choices(poll_id,id)
);
CREATE INDEX IF NOT EXISTS idx_vote_ballots_choice ON vote_ballots(poll_id,choice_id);
CREATE TABLE IF NOT EXISTS vote_editorial(
 poll_id TEXT NOT NULL,
 voice TEXT NOT NULL CHECK(voice IN ('infinity','bubbles')),
 choice_id TEXT NOT NULL,
 summary TEXT NOT NULL CHECK(length(summary) BETWEEN 20 AND 1200),
 evidence_url TEXT NOT NULL CHECK(evidence_url LIKE 'https://%'),
 reviewed_at TEXT NOT NULL,
 published INTEGER NOT NULL DEFAULT 0 CHECK(published IN (0,1)),
 PRIMARY KEY(poll_id,voice),
 FOREIGN KEY(poll_id,choice_id) REFERENCES vote_choices(poll_id,id)
);
CREATE TABLE IF NOT EXISTS vote_rates(
 voter_hash TEXT NOT NULL CHECK(length(voter_hash)=64),
 minute INTEGER NOT NULL, count INTEGER NOT NULL CHECK(count BETWEEN 1 AND 6),
 PRIMARY KEY(voter_hash,minute)
);

-- A real, nonpartisan feature-priority ballot, not a fabricated government race.
-- No preloaded votes or editorial winners. Real race listings require verified officials/source links.
INSERT OR IGNORE INTO vote_polls(id,kind,title,details,source_url,status,open_at,closes_at) VALUES(
 'community-research-2026','community','What should Bubbles research for voters first?',
 'Choose the kind of neutral, source-backed election information you want on Stay In & Vote.',
 'https://www.eac.gov/election-officials/election-results-canvass-and-certification',
 'open','2026-11-03T00:00:00.000Z','2027-01-01T00:00:00.000Z'
);
INSERT OR IGNORE INTO vote_choices(poll_id,id,label,position) VALUES
 ('community-research-2026','candidate-records','Candidate backgrounds and verified public records',1),
 ('community-research-2026','issue-explainers','Issue-by-issue policy explanations',2),
 ('community-research-2026','official-results','Verified election results and certification links',3);
