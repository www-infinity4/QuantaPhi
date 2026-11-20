"""Official CT/MA/MI/NJ cannabis regulator URL catalog is idempotent and organic-only."""
from pathlib import Path
import sqlite3
import unittest
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
SQL = ROOT / "workers" / "cannabis-directory-ct-ma-mi-nj-regulator-sources.sql"

class FourRegulatorSourceTests(unittest.TestCase):
    def test_idempotent_source_catalog_no_store_policy_or_ad_writes(self):
        db = sqlite3.connect(":memory:")
        db.executescript("""
            CREATE TABLE regulator_source_catalog (
                state TEXT PRIMARY KEY, agency TEXT NOT NULL, source_kind TEXT NOT NULL,
                source_url TEXT NOT NULL, verified_at TEXT NOT NULL,
                source_status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE regulator_source_ingest_runs (
                run_id TEXT PRIMARY KEY, source_kind TEXT NOT NULL,
                inspected INTEGER NOT NULL, accepted INTEGER NOT NULL, rejected INTEGER NOT NULL
            );
            CREATE TABLE store_sources (id TEXT PRIMARY KEY, paid_sponsor INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE state_policy (state TEXT PRIMARY KEY, adult_use TEXT NOT NULL);
        """)
        db.execute("INSERT INTO state_policy VALUES ('IA','not_authorized')")
        sql = SQL.read_text(encoding="utf-8")
        for _ in range(2):
            db.executescript(sql)
        rows = db.execute(
            "SELECT state,source_url,source_kind,source_status,notes "
            "FROM regulator_source_catalog ORDER BY state"
        ).fetchall()
        self.assertEqual([r[0] for r in rows], ["CT", "MA", "MI", "NJ"])
        domains = {
            "CT": "portal.ct.gov", "MA": "masscannabiscontrol.com",
            "MI": "www.michigan.gov", "NJ": "www.nj.gov"
        }
        for state, url, kind, status, notes in rows:
            parsed = urlparse(url)
            self.assertEqual(parsed.scheme, "https")
            self.assertEqual(parsed.hostname, domains[state])
            self.assertTrue(kind)
            self.assertEqual(status, "verified_official_url")
            self.assertIn("verify", notes.lower())
        self.assertEqual(
            db.execute("SELECT inspected,accepted,rejected FROM regulator_source_ingest_runs").fetchall(),
            [(4, 4, 0)]
        )
        self.assertEqual(db.execute("SELECT COUNT(*) FROM store_sources").fetchone()[0], 0)
        self.assertEqual(
            db.execute("SELECT state,adult_use FROM state_policy").fetchall(),
            [("IA", "not_authorized")]
        )
        db.close()

if __name__ == "__main__":
    unittest.main()
