"""NY OCM bounded organic retailer import: official source, fail-closed, idempotent."""
from pathlib import Path
import sqlite3
import unittest

SQL = Path(__file__).resolve().parents[1] / "workers/cannabis-directory-ny-ocm-eight.sql"

def database(with_ny=True):
    db = sqlite3.connect(":memory:")
    db.executescript("""
      CREATE TABLE state_policy (
        state TEXT PRIMARY KEY, adult_use TEXT NOT NULL, medical_program INTEGER,
        source_url TEXT NOT NULL DEFAULT '', reviewed_at TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE store_sources (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, store TEXT NOT NULL DEFAULT '',
        city TEXT NOT NULL, state TEXT NOT NULL, address TEXT NOT NULL DEFAULT '',
        source_url TEXT NOT NULL, source_domain TEXT NOT NULL, source_name TEXT NOT NULL,
        verified_at TEXT NOT NULL DEFAULT '', record_status TEXT NOT NULL DEFAULT 'review',
        paid_sponsor INTEGER NOT NULL DEFAULT 0, license_status TEXT NOT NULL DEFAULT 'unverified',
        official_source INTEGER NOT NULL DEFAULT 0, license_verified INTEGER NOT NULL DEFAULT 0,
        address_confirmed INTEGER NOT NULL DEFAULT 0, rights_cleared INTEGER NOT NULL DEFAULT 0,
        image_url TEXT NOT NULL DEFAULT '', image_rights TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE import_receipts (
        receipt_id TEXT PRIMARY KEY, state TEXT NOT NULL, city TEXT NOT NULL,
        source_url TEXT NOT NULL, inspected INTEGER NOT NULL, accepted INTEGER NOT NULL,
        rejected INTEGER NOT NULL
      );
      CREATE TABLE directory_jobs (
        job_id TEXT PRIMARY KEY, state TEXT NOT NULL, city TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL, phase TEXT NOT NULL, records_added INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT ''
      );
    """)
    db.execute("INSERT INTO state_policy(state,adult_use) VALUES ('IA','not_authorized')")
    if with_ny:
        db.execute("INSERT INTO state_policy(state,adult_use) VALUES ('NY','unreviewed')")
    db.execute("INSERT INTO directory_jobs(job_id,state,status,phase) VALUES ('ny-state','NY','queued','source_discovery')")
    return db

class NewYorkOfficialRetailerTests(unittest.TestCase):
    def test_eight_active_operational_source_rows_and_one_receipt_idempotent(self):
        db = database()
        sql = SQL.read_text(encoding="utf-8")
        self.assertNotIn("primary_contact", sql)
        self.assertNotIn("customer_rating", sql)
        for _ in range(2):
            db.executescript(sql)
        rows = db.execute(
            "SELECT id,state,source_url,record_status,paid_sponsor,official_source,"
            "license_verified,address_confirmed,rights_cleared,image_url,license_status "
            "FROM store_sources ORDER BY id"
        ).fetchall()
        self.assertEqual(len(rows), 8)
        self.assertEqual(len({r[0] for r in rows}), 8)
        for row in rows:
            self.assertTrue(row[0].startswith("ny-ocm:OCM-RETL-"))
            self.assertEqual(row[1:6], ("NY","https://data.ny.gov/d/jskf-tt3q","listed",0,1))
            self.assertEqual(row[6:10], (0,0,0,""))
            self.assertEqual(row[10], "ocm_active_operational_snapshot")
        self.assertEqual(db.execute("SELECT inspected,accepted,rejected FROM import_receipts").fetchall(),[(8,8,0)])
        self.assertEqual(db.execute("SELECT status,phase,records_added FROM directory_jobs WHERE state='NY'").fetchone(),("review","license_and_local_review",8))
        self.assertEqual(db.execute("SELECT adult_use FROM state_policy WHERE state='NY'").fetchone()[0],"legal_with_conditions")
        self.assertEqual(db.execute("SELECT adult_use FROM state_policy WHERE state='IA'").fetchone()[0],"not_authorized")
        db.close()

    def test_missing_ny_policy_cannot_publish_or_receipt(self):
        db = database(with_ny=False)
        db.executescript(SQL.read_text(encoding="utf-8"))
        self.assertEqual(db.execute("SELECT COUNT(*) FROM store_sources").fetchone()[0],0)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM import_receipts").fetchone()[0],0)
        self.assertEqual(db.execute("SELECT status FROM directory_jobs WHERE state='NY'").fetchone()[0],"queued")
        db.close()

if __name__ == "__main__":
    unittest.main()
