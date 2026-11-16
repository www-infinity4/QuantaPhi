"""Regression: Colorado MED source catalog is idempotent and not a license import."""
from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
SQL = ROOT / "workers" / "cannabis-directory-colorado-med-source.sql"

class ColoradoMedSourceTest(unittest.TestCase):
    def test_official_source_and_receipt_are_idempotent_without_stores(self):
        db = sqlite3.connect(":memory:")
        db.executescript("""
          CREATE TABLE regulator_source_catalog (
            state TEXT PRIMARY KEY, agency TEXT NOT NULL,
            source_kind TEXT NOT NULL, source_url TEXT NOT NULL,
            verified_at TEXT NOT NULL, source_status TEXT NOT NULL,
            notes TEXT NOT NULL DEFAULT ''
          );
          CREATE TABLE regulator_source_ingest_runs (
            run_id TEXT PRIMARY KEY, source_kind TEXT NOT NULL,
            inspected INTEGER NOT NULL, accepted INTEGER NOT NULL,
            rejected INTEGER NOT NULL
          );
          CREATE TABLE store_sources (id TEXT PRIMARY KEY);
        """)
        statement = SQL.read_text(encoding="utf-8")
        for _ in range(2):
            db.executescript(statement)
        source = db.execute(
            "SELECT source_url,source_kind,source_status,notes "
            "FROM regulator_source_catalog WHERE state='CO'"
        ).fetchone()
        self.assertEqual(source[0], "https://med.colorado.gov/licensee-information-and-lookup-tool/licensed-facilities")
        self.assertEqual(source[1], "retail_and_medical_facilities")
        self.assertEqual(source[2], "verified_official_url")
        self.assertIn("individual license type and status separately", source[3])
        self.assertEqual(db.execute("SELECT COUNT(*) FROM regulator_source_catalog").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM regulator_source_ingest_runs").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT inspected,accepted,rejected FROM regulator_source_ingest_runs").fetchone(), (1,1,0))
        self.assertEqual(db.execute("SELECT COUNT(*) FROM store_sources").fetchone()[0], 0)
        db.close()

if __name__ == "__main__":
    unittest.main()
