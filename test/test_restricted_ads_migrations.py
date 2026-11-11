"""Forward-only restricted ad D1 migration contract: no live resource touched."""
from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "workers/restricted-ads/migrations/001-restricted-ads.sql"
FLIGHT = ROOT / "workers/restricted-ads/migrations/002-reviewed-creative-flight.sql"

class RestrictedAdMigrationTests(unittest.TestCase):
    def test_existing_creatives_remain_unapproved_for_reuse_without_fresh_evidence(self):
        db = sqlite3.connect(":memory:")
        try:
            db.executescript(BASE.read_text())
            db.execute("""INSERT INTO restricted_ad_creatives
                (id,category,advertiser,license_id,approved,rights_cleared,
                 publisher_domain,title,url,image)
                VALUES (?,?,?,?,?,?,?,?,?,?)""",
                ("old", "cannabis", "Fixture only", "TEST-ONLY", 1, 1,
                 "publisher.example.com", "Legacy approved", 
                 "https://publisher.example.com/info",
                 "https://publisher.example.com/creative.jpg"))
            db.executescript(FLIGHT.read_text())
            cols = {row[1] for row in db.execute(
                "PRAGMA table_info(restricted_ad_creatives)").fetchall()}
            required = {"rights_expires_at", "campaign_starts_at",
                        "campaign_ends_at", "sponsor_agreement_id"}
            self.assertTrue(required.issubset(cols))
            legacy = db.execute("""SELECT rights_expires_at,campaign_starts_at,
                campaign_ends_at,sponsor_agreement_id
                FROM restricted_ad_creatives WHERE id='old'""").fetchone()
            self.assertEqual(legacy, ("", "", "", ""))
            db.execute("""SELECT id,category,approved,rights_cleared,
                rights_expires_at,campaign_starts_at,campaign_ends_at,
                sponsor_agreement_id,license_id,advertiser,publisher_domain,
                image,url,reviewed_at,approved_jurisdictions,title,description
                FROM restricted_ad_creatives WHERE category=?""", ("cannabis",))
        finally:
            db.close()

if __name__ == "__main__":
    unittest.main()
