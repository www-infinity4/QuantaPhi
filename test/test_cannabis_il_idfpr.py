"""Illinois IDFPR bounded organic-source import is fail-closed and idempotent."""
from pathlib import Path
import sqlite3
import unittest

SQL = Path(__file__).resolve().parents[1] / "workers/cannabis-directory-il-idfpr-eight.sql"
OFFICIAL_PDF = "https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/cannabis/all-cannabis-licenses.pdf"

def database(*, policy=True, catalog=True):
    db = sqlite3.connect(":memory:")
    db.executescript("""
      CREATE TABLE state_policy (
        state TEXT PRIMARY KEY, adult_use TEXT NOT NULL, medical_program INTEGER,
        source_url TEXT NOT NULL DEFAULT '', reviewed_at TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT ''
      );
      CREATE TABLE regulator_source_catalog (
        state TEXT PRIMARY KEY, agency TEXT NOT NULL, source_kind TEXT NOT NULL,
        source_url TEXT NOT NULL, verified_at TEXT NOT NULL,
        source_status TEXT NOT NULL, notes TEXT NOT NULL DEFAULT ''
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
        source_url TEXT NOT NULL, job_id TEXT NOT NULL DEFAULT '',
        inspected INTEGER NOT NULL, accepted INTEGER NOT NULL, rejected INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE directory_jobs (
        job_id TEXT PRIMARY KEY, state TEXT NOT NULL, city TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL, phase TEXT NOT NULL, records_added INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL DEFAULT ''
      );
      INSERT INTO state_policy(state,adult_use) VALUES ('IA','not_authorized');
      INSERT INTO directory_jobs(job_id,state,status,phase)
        VALUES ('first-review-il','IL','queued','source_discovery');
    """)
    if policy:
        db.execute("INSERT INTO state_policy(state,adult_use) VALUES ('IL','legal_with_conditions')")
    if catalog:
        db.execute("""INSERT INTO regulator_source_catalog
            (state,agency,source_kind,source_url,verified_at,source_status,notes)
            VALUES ('IL','IDFPR','dispensary_map',
            'https://cannabis.illinois.gov/about/locations.html',
            '2026-11-01','verified_official_url','Official')""")
    return db

class IllinoisIDFPRTests(unittest.TestCase):
    def test_eight_official_active_license_rows_one_receipt_and_no_ads(self):
        db = database()
        sql = SQL.read_text(encoding="utf-8")
        for forbidden in ("primary_contact", "customer_rating", "age_verified", "ssn"):
            self.assertNotIn(forbidden, sql.lower())
        db.execute("""INSERT INTO directory_jobs(job_id,state,status,phase)
            VALUES ('il-chicago-next','IL','queued','source_discovery')""")
        for _ in range(2):
            db.executescript(sql)
        self.assertEqual(
            db.execute("SELECT status,records_added FROM directory_jobs WHERE job_id='il-chicago-next'").fetchone(),
            ("queued", 0)
        )
        rows = db.execute("""SELECT id,name,store,city,state,address,source_url,source_domain,
            record_status,paid_sponsor,license_status,official_source,license_verified,
            address_confirmed,rights_cleared,image_url,image_rights
            FROM store_sources ORDER BY id""").fetchall()
        self.assertEqual(len(rows), 8)
        self.assertEqual(len({r[0] for r in rows}), 8)
        for r in rows:
            self.assertTrue(r[0].startswith("il-idfpr:284."))
            self.assertTrue(r[1] and r[2] and r[3] and r[5])
            self.assertEqual(r[4], "IL")
            self.assertEqual(r[6], OFFICIAL_PDF)
            self.assertEqual(r[7], "idfpr.illinois.gov")
            self.assertEqual(r[8:13], ("listed", 0, "idfpr_active_adult_use_2026_10_30", 1, 0))
            self.assertEqual(r[13:], (0, 0, "", ""))
        self.assertEqual(
            db.execute("SELECT inspected,accepted,rejected FROM import_receipts").fetchall(),
            [(8, 8, 0)]
        )
        self.assertEqual(
            db.execute("SELECT status,phase,records_added FROM directory_jobs WHERE job_id='first-review-il'").fetchone(),
            ("review", "license_and_site_review", 8)
        )
        self.assertEqual(db.execute("SELECT adult_use FROM state_policy WHERE state='IA'").fetchone()[0], "not_authorized")
        db.close()

    def test_no_policy_or_no_catalog_means_no_store_or_receipt(self):
        for policy, catalog in ((False, True), (True, False)):
            with self.subTest(policy=policy, catalog=catalog):
                db = database(policy=policy, catalog=catalog)
                db.executescript(SQL.read_text(encoding="utf-8"))
                self.assertEqual(db.execute("SELECT COUNT(*) FROM store_sources").fetchone()[0], 0)
                self.assertEqual(db.execute("SELECT COUNT(*) FROM import_receipts").fetchone()[0], 0)
                self.assertEqual(db.execute("SELECT status FROM directory_jobs").fetchone()[0], "queued")
                db.close()


    def test_preexisting_stores_cannot_create_receipt_after_approval_revocation(self):
        sql = SQL.read_text(encoding="utf-8")
        for removed in ("policy", "catalog"):
            with self.subTest(removed=removed):
                db = database()
                db.executescript(sql)
                db.execute("DELETE FROM import_receipts")
                db.execute("""UPDATE directory_jobs SET status='queued',
                    phase='source_discovery', records_added=0, updated_at='2099-01-01 00:00:00'
                    WHERE job_id='first-review-il'""")
                if removed == "policy":
                    db.execute("DELETE FROM state_policy WHERE state='IL'")
                else:
                    db.execute("DELETE FROM regulator_source_catalog WHERE state='IL'")
                db.executescript(sql)
                self.assertEqual(db.execute("SELECT COUNT(*) FROM store_sources").fetchone()[0], 8)
                self.assertEqual(db.execute("SELECT COUNT(*) FROM import_receipts").fetchone()[0], 0)
                self.assertEqual(db.execute("SELECT status FROM directory_jobs WHERE job_id='first-review-il'").fetchone()[0], "queued")
                db.close()

    def test_old_receipt_cannot_advance_requeued_job(self):
        sql = SQL.read_text(encoding="utf-8")
        for removed in ("none", "policy", "catalog"):
            with self.subTest(removed=removed):
                db = database()
                db.executescript(sql)
                db.execute("""UPDATE directory_jobs SET status='queued',
                    phase='source_discovery', records_added=0, updated_at='2099-01-01 00:00:00'
                    WHERE job_id='first-review-il'""")
                if removed == "policy":
                    db.execute("DELETE FROM state_policy WHERE state='IL'")
                elif removed == "catalog":
                    db.execute("DELETE FROM regulator_source_catalog WHERE state='IL'")
                db.executescript(sql)
                self.assertEqual(db.execute("SELECT COUNT(*) FROM import_receipts").fetchone()[0], 1)
                self.assertEqual(db.execute("SELECT status FROM directory_jobs WHERE job_id='first-review-il'").fetchone()[0], "queued")
                db.close()

if __name__ == "__main__":
    unittest.main()
