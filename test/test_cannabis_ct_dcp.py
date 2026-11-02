"""Connecticut DCP public-domain operating hybrid retailer source batch."""
from datetime import datetime, timezone
from pathlib import Path
import json
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
SNAP = ROOT / "data/cannabis/ct-dcp-eight-hybrid-2026-11-02.json"
SQL = ROOT / "workers/cannabis-directory-ct-dcp-eight.sql"


def database(with_ct=True):
    db = sqlite3.connect(":memory:")
    db.executescript("""
      CREATE TABLE state_policy(
        state TEXT PRIMARY KEY, adult_use TEXT NOT NULL,
        medical_program INTEGER, source_url TEXT DEFAULT '',
        reviewed_at TEXT DEFAULT '', notes TEXT DEFAULT ''
      );
      CREATE TABLE store_sources(
        id TEXT PRIMARY KEY, name TEXT NOT NULL, store TEXT DEFAULT '',
        city TEXT NOT NULL, state TEXT NOT NULL, address TEXT DEFAULT '',
        source_url TEXT NOT NULL, source_domain TEXT NOT NULL,
        source_name TEXT NOT NULL, verified_at TEXT DEFAULT '',
        record_status TEXT DEFAULT 'review', paid_sponsor INTEGER DEFAULT 0,
        license_status TEXT DEFAULT 'unverified', official_source INTEGER DEFAULT 0,
        license_verified INTEGER DEFAULT 0, address_confirmed INTEGER DEFAULT 0,
        rights_cleared INTEGER DEFAULT 0, image_url TEXT DEFAULT '',
        image_rights TEXT DEFAULT ''
      );
      CREATE TABLE import_receipts(
        receipt_id TEXT PRIMARY KEY, state TEXT, city TEXT, source_url TEXT,
        job_id TEXT DEFAULT '', inspected INTEGER, accepted INTEGER, rejected INTEGER
      );
      CREATE TABLE directory_jobs(
        job_id TEXT PRIMARY KEY, state TEXT, city TEXT DEFAULT '',
        status TEXT, phase TEXT, records_added INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT ''
      );
      INSERT INTO state_policy(state,adult_use) VALUES ('IA','not_authorized');
      INSERT INTO directory_jobs(job_id,state,status,phase)
        VALUES ('first-review-ct','CT','queued','source_discovery');
    """)
    if with_ct:
        db.execute("INSERT INTO state_policy(state,adult_use) VALUES ('CT','unreviewed')")
    return db


class ConnecticutDCPTests(unittest.TestCase):
    def test_official_recent_public_domain_operating_hybrid_snapshot(self):
        snap = json.loads(SNAP.read_text(encoding="utf-8"))
        self.assertEqual(snap["source"], "Connecticut Department of Consumer Protection")
        self.assertEqual(snap["license"], "PUBLIC_DOMAIN")
        self.assertFalse(snap["advertising_approved"])
        self.assertFalse(snap["license_verified"])
        self.assertEqual(len(snap["records"]), 8)
        self.assertEqual(len({r["license_number"] for r in snap["records"]}), 8)
        checked = datetime.fromisoformat(snap["rows_updated_at"].replace("Z", "+00:00"))
        self.assertLessEqual(checked, datetime(2026, 11, 2, tzinfo=timezone.utc))
        self.assertGreaterEqual(checked, datetime(2026, 10, 20, tzinfo=timezone.utc))
        for row in snap["records"]:
            self.assertRegex(row["license_number"], r"^AMHF\.[0-9]{7}$")
            self.assertEqual(row["type"], "Hybrid Retailer")
            self.assertTrue(row["street"] and row["city"] and row["zipcode"])
            self.assertTrue(row["source_url"].startswith(
                "https://data.ct.gov/resource/42yd-3x3d.json?license=AMHF."))
            self.assertNotIn("owner", row)
            self.assertNotIn("phone", row)

    def test_idempotent_eight_source_rows_and_one_receipt(self):
        db = database()
        sql = SQL.read_text(encoding="utf-8")
        self.assertNotIn("customer_rating", sql)
        self.assertNotIn("paid_sponsor=1", sql)
        db.executescript(sql)
        db.executescript(sql)
        rows = db.execute(
            "SELECT id,state,source_domain,record_status,paid_sponsor,"
            "license_verified,rights_cleared,image_url,license_status "
            "FROM store_sources ORDER BY id"
        ).fetchall()
        self.assertEqual(len(rows), 8)
        for row in rows:
            self.assertTrue(row[0].startswith("ct-dcp:AMHF."))
            self.assertEqual(row[1:5], ("CT","data.ct.gov","listed",0))
            self.assertEqual(row[5:8], (0,0,""))
            self.assertEqual(row[8], "ct_dcp_operating_list_status_unverified")
            self.assertLessEqual(len(row[8]), 45)
        self.assertEqual(
            db.execute("SELECT inspected,accepted,rejected FROM import_receipts").fetchall(),
            [(8,8,0)]
        )
        self.assertEqual(
            db.execute("SELECT status,phase,records_added FROM directory_jobs WHERE state='CT'").fetchone(),
            ("review","license_and_local_review",8)
        )
        self.assertEqual(db.execute("SELECT adult_use FROM state_policy WHERE state='IA'").fetchone()[0],
                         "not_authorized")
        db.close()

    def test_missing_state_policy_fails_closed(self):
        db = database(with_ct=False)
        db.executescript(SQL.read_text(encoding="utf-8"))
        self.assertEqual(db.execute("SELECT COUNT(*) FROM store_sources").fetchone()[0],0)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM import_receipts").fetchone()[0],0)
        self.assertEqual(db.execute("SELECT status FROM directory_jobs WHERE state='CT'").fetchone()[0],"queued")
        db.close()


if __name__ == "__main__":
    unittest.main()
