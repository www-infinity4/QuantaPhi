"""Official Oregon OLCC public retailer snapshot: fail-closed, idempotent, no ads."""
from datetime import date
from pathlib import Path
import json
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
SQL = ROOT / "workers/cannabis-directory-or-olcc-eight.sql"
SNAP = ROOT / "data/cannabis/or-olcc-eight-2026-10-05.json"


def database(with_or=True):
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
      INSERT INTO state_policy(state,adult_use) VALUES ('IA','not_authorized');
      INSERT INTO directory_jobs(job_id,state,status,phase) VALUES
        ('or-state','OR','queued','source_discovery');
    """)
    if with_or:
        db.execute("INSERT INTO state_policy(state,adult_use) VALUES ('OR','unreviewed')")
    return db


class OregonOLCCSnapshotTests(unittest.TestCase):
    def test_official_business_only_snapshot_is_bounded_and_historical(self):
        d = json.loads(SNAP.read_text(encoding="utf-8"))
        self.assertEqual(d["dataset_id"], "q32u-cmam")
        self.assertEqual(d["dataset_last_updated"], "2026-10-05")
        self.assertFalse(d["license_verified"])
        self.assertFalse(d["advertising_approved"])
        self.assertEqual(len(d["records"]), 8)
        self.assertEqual(len({r["license_number"] for r in d["records"]}), 8)
        for r in d["records"]:
            self.assertEqual(r["license_type"], "RECREATIONAL RETAILER")
            self.assertEqual(r["license_status"], "ACTIVE")
            self.assertEqual(r["license_expired"], "No")
            self.assertGreater(date.fromisoformat(r["expiration_date"]), date(2026, 11, 1))
            self.assertIn(" OR ", r["physical_address"])
            self.assertNotIn("Exempt", r["physical_address"])
            self.assertNotIn("business_licenses", r)
            self.assertNotIn("owner", r)
            self.assertNotIn("phone", r)

    def test_import_twice_creates_eight_non_sponsored_rows_and_one_receipt(self):
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
        for row in rows:
            self.assertTrue(row[0].startswith("or-olcc:050-"))
            self.assertEqual(row[1:6], ("OR","https://data.oregon.gov/d/q32u-cmam","listed",0,1))
            self.assertEqual(row[6:10], (0,0,0,""))
            self.assertEqual(row[10], "olcc_active_retailer_2026_10_05_snapshot")
        self.assertEqual(db.execute("SELECT inspected,accepted,rejected FROM import_receipts").fetchall(), [(8,8,0)])
        self.assertEqual(db.execute("SELECT status,phase,records_added FROM directory_jobs WHERE state='OR'").fetchone(),
                         ("review","license_and_local_review",8))
        self.assertEqual(db.execute("SELECT adult_use FROM state_policy WHERE state='OR'").fetchone()[0], "legal_with_conditions")
        self.assertEqual(db.execute("SELECT adult_use FROM state_policy WHERE state='IA'").fetchone()[0], "not_authorized")
        db.close()

    def test_missing_state_policy_fails_closed(self):
        db = database(with_or=False)
        db.executescript(SQL.read_text(encoding="utf-8"))
        self.assertEqual(db.execute("SELECT COUNT(*) FROM store_sources").fetchone()[0], 0)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM import_receipts").fetchone()[0], 0)
        self.assertEqual(db.execute("SELECT status FROM directory_jobs WHERE state='OR'").fetchone()[0], "queued")
        db.close()


if __name__ == "__main__":
    unittest.main()
