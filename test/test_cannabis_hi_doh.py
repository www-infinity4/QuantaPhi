"""Hawaii DOH medical-only directory: 24 official locations, never adult-use ads."""
from pathlib import Path
import sqlite3
import unittest

ROOT = Path(__file__).resolve().parents[1]
SQL = ROOT / "workers/cannabis-directory-hi-doh-24.sql"

def database():
    db=sqlite3.connect(":memory:")
    db.executescript("""
    CREATE TABLE state_policy (state TEXT PRIMARY KEY, adult_use TEXT NOT NULL,
      medical_program INTEGER, source_url TEXT NOT NULL DEFAULT '',
      reviewed_at TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT '');
    CREATE TABLE directory_jobs (job_id TEXT PRIMARY KEY, state TEXT NOT NULL,
      city TEXT NOT NULL DEFAULT '', status TEXT NOT NULL, phase TEXT NOT NULL,
      records_added INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT '');
    CREATE TABLE store_sources (id TEXT PRIMARY KEY, name TEXT NOT NULL,
      store TEXT NOT NULL DEFAULT '', city TEXT NOT NULL, state TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '', source_url TEXT NOT NULL,
      source_domain TEXT NOT NULL, source_name TEXT NOT NULL,
      verified_at TEXT NOT NULL DEFAULT '', record_status TEXT NOT NULL DEFAULT 'review',
      paid_sponsor INTEGER NOT NULL DEFAULT 0, license_status TEXT NOT NULL DEFAULT 'unverified',
      official_source INTEGER NOT NULL DEFAULT 0, license_verified INTEGER NOT NULL DEFAULT 0,
      address_confirmed INTEGER NOT NULL DEFAULT 0, rights_cleared INTEGER NOT NULL DEFAULT 0,
      image_url TEXT NOT NULL DEFAULT '', image_rights TEXT NOT NULL DEFAULT '');
    CREATE TABLE import_receipts (receipt_id TEXT PRIMARY KEY, state TEXT NOT NULL,
      city TEXT NOT NULL, source_url TEXT NOT NULL, job_id TEXT NOT NULL DEFAULT '',
      inspected INTEGER NOT NULL, accepted INTEGER NOT NULL, rejected INTEGER NOT NULL);
    CREATE TABLE regulator_source_catalog (state TEXT PRIMARY KEY, agency TEXT NOT NULL,
      source_kind TEXT NOT NULL, source_url TEXT NOT NULL, verified_at TEXT NOT NULL,
      source_status TEXT NOT NULL DEFAULT 'verified_official_url',
      notes TEXT NOT NULL DEFAULT '');
    CREATE TABLE store_inventory_connections (store_id TEXT NOT NULL, provider TEXT NOT NULL,
      connection_state TEXT NOT NULL DEFAULT 'not_connected',
      license_review_state TEXT NOT NULL DEFAULT 'unreviewed',
      permission_evidence_url TEXT NOT NULL DEFAULT '',
      source_menu_url TEXT NOT NULL DEFAULT '',
      PRIMARY KEY(store_id,provider));
    INSERT INTO state_policy(state,adult_use) VALUES('HI','unreviewed');
    INSERT INTO directory_jobs(job_id,state,status,phase)
      VALUES('first-review-hi','HI','queued','source_discovery');
    """)
    return db

class HawaiiMedicalDirectoryTests(unittest.TestCase):
    def test_medical_only_idempotent_24_official_locations(self):
        db=database()
        sql=SQL.read_text(encoding="utf-8")
        for _ in range(2):
            db.executescript(sql)
        rows=db.execute("""SELECT id,name,address,source_url,source_domain,
            paid_sponsor,official_source,license_verified,address_confirmed,
            rights_cleared,image_url,license_status FROM store_sources ORDER BY id""").fetchall()
        self.assertEqual(len(rows),24)
        self.assertEqual(len({r[0] for r in rows}),24)
        self.assertEqual(len({r[2] for r in rows}),24)
        for r in rows:
            self.assertTrue(r[0].startswith('hi-doh:'))
            self.assertTrue(r[2].endswith('HI '+r[2][-5:]))
            self.assertTrue(r[3].startswith('https://health.hawaii.gov/medicalcannabisregistry/'))
            self.assertEqual(r[4],'health.hawaii.gov')
            self.assertEqual(r[5:11],(0,1,0,1,0,''))
            self.assertIn('medical',r[11])
            self.assertIn('unverified',r[11])
        self.assertEqual(db.execute("SELECT adult_use,medical_program FROM state_policy WHERE state='HI'").fetchone(),('not_authorized',1))
        self.assertEqual(db.execute("SELECT status,phase,records_added FROM directory_jobs WHERE state='HI'").fetchone(),('review','medical_license_review',24))
        self.assertEqual(db.execute("SELECT inspected,accepted,rejected FROM import_receipts").fetchall(),[(24,24,0)])
        self.assertEqual(db.execute("SELECT COUNT(*) FROM store_inventory_connections WHERE connection_state='not_connected'").fetchone()[0],24)
        self.assertNotIn('1087 Limahana',sql)
        self.assertNotIn('415 Dairy',sql)
        self.assertNotIn('115 N Market',sql)
        self.assertNotIn('149 Hana',sql)
        db.close()

    def test_missing_policy_fails_closed(self):
        db=database()
        db.execute("DELETE FROM state_policy WHERE state='HI'")
        db.executescript(SQL.read_text(encoding="utf-8"))
        self.assertEqual(db.execute("SELECT COUNT(*) FROM store_sources").fetchone()[0],0)
        self.assertEqual(db.execute("SELECT COUNT(*) FROM import_receipts").fetchone()[0],0)
        db.close()

if __name__=="__main__":
    unittest.main()
