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
        executable = "\\n".join(line for line in script.splitlines()
                               if not line.lstrip().startswith("--")).lower()
        for forbidden in ("insert into", "drop table", "update store_sources",
                          "delete from store_sources", "wallet", "social_security",
                          "ssn", "age_verified"):
            self.assertNotIn(forbidden, executable)
        db.executescript(script)
        db.executescript(script)
        tables = ("store_quality_evidence", "store_quality_decisions",
                  "store_quality_merchant_domains", "store_quality_appeals",
                  "store_quality_events")
        for table in tables:
            self.assertEqual(db.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0], 0)
        db.execute("INSERT INTO store_sources(id) VALUES ('synthetic')")
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("""INSERT INTO store_quality_decisions
              (store_id,status,review_status,appeal_status,reviewer_ref)
              VALUES ('synthetic','automatically_starred','approved','none','test')""")
        db.execute("""INSERT INTO store_quality_events
          (event_id,store_id,event_kind,actor_ref)
          VALUES ('synthetic-event','synthetic','decision','test-reviewer')""")
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("UPDATE store_quality_events SET event_kind='appeal' WHERE event_id='synthetic-event'")
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("DELETE FROM store_quality_events WHERE event_id='synthetic-event'")
        self.assertEqual(db.execute("SELECT COUNT(*) FROM store_quality_events").fetchone()[0], 1)
        db.close()

if __name__ == "__main__":
    unittest.main()
