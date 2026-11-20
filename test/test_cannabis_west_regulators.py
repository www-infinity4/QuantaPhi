"""Four official Western state regulator URLs: idempotent catalog-only SQL."""
from pathlib import Path
import sqlite3
import unittest
from urllib.parse import urlparse

SQL = Path(__file__).resolve().parents[1] / "workers" / "cannabis-directory-west-regulator-sources.sql"

class WestRegulatorCatalogTests(unittest.TestCase):
    def test_four_sources_one_append_only_receipt_and_zero_store_writes(self):
        db = sqlite3.connect(":memory:")
        db.executescript("""
          CREATE TABLE regulator_source_catalog (
            state TEXT PRIMARY KEY, agency TEXT NOT NULL, source_kind TEXT NOT NULL,
            source_url TEXT NOT NULL, verified_at TEXT NOT NULL,
            source_status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT ''
          );
          CREATE TABLE regulator_source_ingest_runs (
            run_id TEXT PRIMARY KEY, source_kind TEXT NOT NULL,
            inspected INTEGER NOT NULL, accepted INTEGER NOT NULL,
            rejected INTEGER NOT NULL
          );
          CREATE TABLE store_sources (id TEXT PRIMARY KEY);
        """)
        sql = SQL.read_text(encoding="utf-8")
        for _ in range(2):
            db.executescript(sql)
        rows = db.execute("SELECT state,source_url,source_status FROM regulator_source_catalog ORDER BY state").fetchall()
        self.assertEqual([r[0] for r in rows], ["CA","NV","OR","WA"])
        domains = {"CA":"www.cannabis.ca.gov","NV":"ccb.nv.gov",
                   "OR":"www.oregon.gov","WA":"lcb.wa.gov"}
        for state, source_url, status in rows:
            self.assertEqual(urlparse(source_url).scheme, "https")
            self.assertEqual(urlparse(source_url).hostname, domains[state])
            self.assertEqual(status, "verified_official_url")
        self.assertEqual(db.execute("SELECT COUNT(*) FROM regulator_source_ingest_runs").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT inspected,accepted,rejected FROM regulator_source_ingest_runs").fetchone(), (4,4,0))
        self.assertEqual(db.execute("SELECT COUNT(*) FROM store_sources").fetchone()[0], 0)
        db.close()

if __name__ == "__main__":
    unittest.main()
