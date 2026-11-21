"""Massachusetts CCC active adult-use retailer snapshot: idempotent organic source import."""
from datetime import date
from pathlib import Path
import json
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
SQL = ROOT / "workers/cannabis-directory-ma-ccc-four.sql"
SNAP = ROOT / "data/cannabis/ma-ccc-four-2026-10-26.json"
SOURCE = "https://masscannabiscontrol.com/resource/l_licenses_commence_ops.json"


def database(with_ma=True):
    db = sqlite3.connect(":memory:")
    db.executescript("""
      CREATE TABLE state_policy (state TEXT PRIMARY KEY, adult_use TEXT NOT NULL,
        medical_program INTEGER, source_url TEXT DEFAULT '', reviewed_at TEXT DEFAULT '', notes TEXT DEFAULT '');
      CREATE TABLE store_sources (id TEXT PRIMARY KEY, name TEXT NOT NULL,
        store TEXT NOT NULL DEFAULT '', city TEXT NOT NULL, state TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '', source_url TEXT NOT NULL, source_domain TEXT NOT NULL,
        source_name TEXT NOT NULL, verified_at TEXT DEFAULT '', record_status TEXT DEFAULT 'review',
        paid_sponsor INTEGER DEFAULT 0, license_status TEXT DEFAULT 'unverified',
        official_source INTEGER DEFAULT 0, license_verified INTEGER DEFAULT 0,
        address_confirmed INTEGER DEFAULT 0, rights_cleared INTEGER DEFAULT 0,
        image_url TEXT DEFAULT '', image_rights TEXT DEFAULT '');
      CREATE TABLE import_receipts (receipt_id TEXT PRIMARY KEY, state TEXT NOT NULL,
        city TEXT NOT NULL, source_url TEXT NOT NULL, job_id TEXT NOT NULL DEFAULT '',
        inspected INTEGER NOT NULL, accepted INTEGER NOT NULL, rejected INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      CREATE TABLE regulator_source_catalog (state TEXT PRIMARY KEY, source_status TEXT NOT NULL);
      CREATE TABLE directory_jobs (job_id TEXT PRIMARY KEY, state TEXT NOT NULL,
        city TEXT DEFAULT '', status TEXT NOT NULL, phase TEXT NOT NULL,
        records_added INTEGER DEFAULT 0, updated_at TEXT DEFAULT '');
      INSERT INTO state_policy(state,adult_use) VALUES ('IA','not_authorized');
      INSERT INTO directory_jobs(job_id,state,status,phase)
        VALUES ('first-review-ma','MA','queued','source_discovery');
      INSERT INTO directory_jobs(job_id,state,status,phase)
        VALUES ('boston-discovery','MA','queued','source_discovery');
      INSERT INTO regulator_source_catalog(state,source_status)
        VALUES ('MA','verified_official_url');
    """)
    if with_ma:
        db.execute("INSERT INTO state_policy(state,adult_use) VALUES ('MA','unreviewed')")
    return db


class MassachusettsCCCImportTests(unittest.TestCase):
    def test_four_current_distinct_business_only_retailer_sources(self):
        data = json.loads(SNAP.read_text(encoding="utf-8"))
        self.assertEqual(data["source_url"], SOURCE)
        self.assertEqual(data["dataset_last_updated"], "2026-10-26")
        self.assertFalse(data["license_verified"])
        self.assertFalse(data["advertising_approved"])
        rows = data["records"]
        self.assertEqual(len(rows), 4)
        self.assertEqual(len({r["license_number"] for r in rows}), 4)
        for row in rows:
            self.assertRegex(row["license_number"], r"^MR[0-9]{6}$")
            self.assertEqual(row["license_type"], "Marijuana Retailer")
            self.assertEqual(row["license_status"], "Active")
            self.assertEqual(row["license_status_category"], "Active")
            self.assertEqual(row["approved_license_stage"], "FINAL LICENSE")
            self.assertEqual(row["commence_ops"], "Yes")
            self.assertGreater(date.fromisoformat(row["expiration_date"]), date(2026, 11, 1))
            self.assertIn(" MA ", row["address"])
            self.assertEqual(row["source_last_updated"], "2026-10-26")
            for forbidden in ("EIN_TIN", "BUSINESS_EMAIL", "BUSINESS_PHONE",
                              "owner", "contact", "phone", "email"):
                self.assertNotIn(forbidden, row)

    def test_idempotent_organic_import_and_receipt(self):
        db = database()
        sql = SQL.read_text(encoding="utf-8")
        self.assertNotIn("EIN_TIN", sql.split("UPDATE state_policy")[1])
        self.assertNotIn("customer_rating", sql)
        for _ in range(2):
            db.executescript(sql)
        rows = db.execute("SELECT id,state,source_url,record_status,paid_sponsor,"
            "official_source,license_verified,address_confirmed,rights_cleared,image_url "
            "FROM store_sources ORDER BY id").fetchall()
        self.assertEqual(len(rows), 4)
        for row in rows:
            self.assertTrue(row[0].startswith("ma-ccc:MR"))
            self.assertEqual(row[1:6], ("MA",SOURCE,"listed",0,1))
            self.assertEqual(row[6:10], (0,0,0,""))
        self.assertEqual(db.execute("SELECT job_id,inspected,accepted,rejected FROM import_receipts").fetchall(), [("first-review-ma",4,4,0)])
        self.assertEqual(db.execute("SELECT status,records_added FROM directory_jobs WHERE job_id='boston-discovery'").fetchone(),
                         ("queued",0))
        self.assertEqual(db.execute("SELECT status,phase,records_added FROM directory_jobs WHERE state='MA'").fetchone(),
                         ("review","license_and_local_review",4))
        self.assertEqual(db.execute("SELECT adult_use FROM state_policy WHERE state='IA'").fetchone()[0], "not_authorized")
        db.close()

    def test_revoked_policy_cannot_recreate_receipt_or_advance_job(self):
        db = database()
        sql = SQL.read_text(encoding="utf-8")
        db.executescript(sql)
        db.execute("DELETE FROM import_receipts")
        db.execute("UPDATE directory_jobs SET status='queued',records_added=0,updated_at='2026-11-02 01:00:00' WHERE job_id='first-review-ma'")
        db.execute("UPDATE state_policy SET adult_use='not_authorized' WHERE state='MA'")
        db.executescript(sql)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM import_receipts").fetchone()[0], 0)
        self.assertEqual(db.execute("SELECT status FROM directory_jobs WHERE job_id='first-review-ma'").fetchone()[0], "queued")
        db.close()

    def test_old_receipt_cannot_advance_requeued_job(self):
        db = database()
        sql = SQL.read_text(encoding="utf-8")
        db.executescript(sql)
        db.execute("UPDATE directory_jobs SET status='queued',records_added=0,updated_at='2099-01-01 00:00:00' WHERE job_id='first-review-ma'")
        db.executescript(sql)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM import_receipts").fetchone()[0], 1)
        self.assertEqual(db.execute("SELECT status,records_added FROM directory_jobs WHERE job_id='first-review-ma'").fetchone(), ("queued",0))
        db.close()

    def test_missing_policy_fails_closed(self):
        db = database(with_ma=False)
        db.executescript(SQL.read_text(encoding="utf-8"))
        self.assertEqual(db.execute("SELECT COUNT(*) FROM store_sources").fetchone()[0], 0)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM import_receipts").fetchone()[0], 0)
        self.assertEqual(db.execute("SELECT status FROM directory_jobs WHERE job_id='first-review-ma'").fetchone()[0], "queued")
        db.close()


if __name__ == "__main__":
    unittest.main()
