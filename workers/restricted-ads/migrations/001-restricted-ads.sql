-- Only verified and legally reviewed campaigns may be displayed.
-- No PII, ID photos, date of birth, raw cookies or wallet records.
CREATE TABLE IF NOT EXISTS restricted_ad_consent (
 user_key TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category='cannabis'),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(user_key, category)
);
CREATE TABLE IF NOT EXISTS restricted_ad_jurisdictions (
 jurisdiction TEXT NOT NULL,
 category TEXT NOT NULL CHECK(category='cannabis'),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 reviewed_at TEXT NOT NULL DEFAULT '',
 reviewer TEXT NOT NULL DEFAULT '',
 audience_evidence TEXT NOT NULL DEFAULT '',
 legal_evidence TEXT NOT NULL DEFAULT '',
 PRIMARY KEY(jurisdiction,category)
);
CREATE TABLE IF NOT EXISTS restricted_ad_creatives (
 id TEXT PRIMARY KEY,
 category TEXT NOT NULL CHECK(category='cannabis'),
 advertiser TEXT NOT NULL,
 license_id TEXT NOT NULL,
 approved INTEGER NOT NULL DEFAULT 0 CHECK(approved IN (0,1)),
 rights_cleared INTEGER NOT NULL DEFAULT 0 CHECK(rights_cleared IN (0,1)),
 reviewed_at TEXT NOT NULL DEFAULT '',
 approved_jurisdictions TEXT NOT NULL DEFAULT '[]',
 publisher_domain TEXT NOT NULL,
 title TEXT NOT NULL,
 description TEXT NOT NULL DEFAULT '',
 url TEXT NOT NULL,
 image TEXT NOT NULL,
 source_evidence TEXT NOT NULL DEFAULT '',
 rights_evidence TEXT NOT NULL DEFAULT '',
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_restricted_creatives_review ON restricted_ad_creatives(category,approved,rights_cleared,reviewed_at);
