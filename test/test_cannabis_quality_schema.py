"""Empty, idempotent cannabis quality schema: no auto-stars or wallet/auth writes."""
from pathlib import Path
import sqlite3
import unittest

SQL = Path(__file__).resolve().parents[1] / "workers/cannabis-directory-quality-evidence.sql"

class CannabisQualitySchemaTests(unittest.TestCase):
    def test_empty_idempotent_schema_and_private_appeal_records(self):
        db = sqlite3.connect(":memory:")
        db.execute("CREATE TABLE store_sources (id TEXT PRIMARY KEY)")
        script = SQL.read_text(encoding="utf-8")
        for forbidden in ("INSERT INTO store_quality", "wallet", "social_security", "ssn", "age_verified"):
            self.assertNotIn(forbidden.lower(), script.lower())
        db.executescript(script)
        db.executescript(script)
        tables = ("store_quality_evidence", "store_quality_decisions",
                  "store_quality_appeals", "store_quality_events")
        for table in tables:
            self.assertEqual(db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0], 0)
        db.execute("INSERT INTO store_sources(id) VALUES ('synthetic')")
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("""INSERT INTO store_quality_decisions
              (store_id,status,review_status,appeal_status,reviewer_ref)
              VALUES ('synthetic','automatically_starred','approved','none','test')""")
        db.close()

if __name__ == "__main__":
    unittest.main()
