"""Official Montana October 2026 source-only, idempotent, fail-closed directory import."""
import json
import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'data/cannabis/mt-dor-ten-adult-use-2026-11-02.json'
SQL = ROOT / 'workers/cannabis-directory-mt-dor-ten.sql'
SOURCE = 'https://revenue.mt.gov/card/cannabis/cannabis-licenses/lists/dispensary-locations'
RECEIPT = '2026-11-02-mt-dor-ten-adult-use-v1'

def database(policy='unreviewed', with_job=True):
    db=sqlite3.connect(':memory:')
    db.executescript("""
    CREATE TABLE state_policy(state TEXT PRIMARY KEY,adult_use TEXT,source_url TEXT DEFAULT '',reviewed_at TEXT DEFAULT '',notes TEXT DEFAULT '');
    CREATE TABLE regulator_source_catalog(state TEXT PRIMARY KEY,agency TEXT,source_kind TEXT,source_url TEXT,verified_at TEXT,source_status TEXT,notes TEXT);
    CREATE TABLE store_sources(id TEXT PRIMARY KEY,name TEXT,store TEXT,city TEXT,state TEXT,address TEXT,source_url TEXT,source_domain TEXT,source_name TEXT,verified_at TEXT,record_status TEXT,paid_sponsor INTEGER,license_status TEXT,official_source INTEGER,license_verified INTEGER,address_confirmed INTEGER,rights_cleared INTEGER,image_url TEXT,image_rights TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE import_receipts(receipt_id TEXT PRIMARY KEY,state TEXT,city TEXT,source_url TEXT,inspected INTEGER,accepted INTEGER,rejected INTEGER,job_id TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE directory_jobs(job_id TEXT PRIMARY KEY,state TEXT,status TEXT,phase TEXT,records_added INTEGER DEFAULT 0,updated_at TEXT DEFAULT '');
    """)
    db.execute('INSERT INTO state_policy(state,adult_use) VALUES(?,?)',('MT',policy))
    if with_job: db.execute("INSERT INTO directory_jobs(job_id,state,status,phase) VALUES('first-review-mt','MT','queued','source_discovery')")
    return db

class MontanaDOR(unittest.TestCase):
    def test_manifest_has_ten_unique_real_official_adult_use_business_rows(self):
        m=json.loads(MANIFEST.read_text())
        self.assertEqual(m['source_url'],SOURCE)
        self.assertEqual(m['official_roster_as_of'],'2026-10')
        self.assertEqual(len(m['records']),10)
        self.assertEqual(len({r['id'] for r in m['records']}),10)
        for flag in ('license_verified','address_confirmed','merchant_urls_verified','advertising_approved','media_rights'):
            self.assertFalse(m[flag])
        for r in m['records']:
            self.assertEqual(r['source_url'],SOURCE)
            self.assertEqual(r['state'],'MT')
            self.assertEqual(r['sales_type'],'Adult Use')
            self.assertEqual(r['street_address'],'')
            self.assertRegex(r['id'],r'^[A-Za-z0-9][A-Za-z0-9:._-]{2,31}$')

    def test_idempotent_sql_receipt_and_unverified_flags(self):
        db=database()
        for _ in range(2): db.executescript(SQL.read_text())
        m=json.loads(MANIFEST.read_text())
        rows=db.execute('SELECT id,record_status,paid_sponsor,official_source,license_verified,address_confirmed,rights_cleared,image_url,source_domain,license_status,address FROM store_sources').fetchall()
        self.assertEqual({r[0] for r in rows},{r['id'] for r in m['records']})
        self.assertEqual(len(rows),10)
        for r in rows:
            self.assertEqual(r[1:9],('listed',0,1,0,0,0,'','revenue.mt.gov'))
            self.assertEqual(r[9],'mt_dor_2026_10_adult_use_roster')
            self.assertEqual(r[10],'')
        self.assertEqual(db.execute('SELECT receipt_id,inspected,accepted,rejected FROM import_receipts').fetchall(),[(RECEIPT,10,10,0)])
        self.assertEqual(db.execute("SELECT status,phase,records_added FROM directory_jobs WHERE state='MT'").fetchone(),('review','license_address_and_local_review',10))

    def test_policy_not_authorized_fails_closed(self):
        db=database('not_authorized')
        db.executescript(SQL.read_text())
        self.assertEqual(db.execute('SELECT COUNT(*) FROM store_sources').fetchone()[0],0)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM import_receipts').fetchone()[0],0)
        self.assertEqual(db.execute("SELECT status FROM directory_jobs WHERE state='MT'").fetchone()[0],'queued')

    def test_missing_job_no_receipt_or_fake_completion(self):
        db=database(with_job=False)
        db.executescript(SQL.read_text())
        self.assertEqual(db.execute('SELECT COUNT(*) FROM store_sources').fetchone()[0],10)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM import_receipts').fetchone()[0],0)

    def test_stale_receipt_does_not_readvance_job(self):
        db=database()
        db.executescript(SQL.read_text())
        db.execute("UPDATE directory_jobs SET status='queued',phase='source_discovery',records_added=0,updated_at='9999-01-01 00:00:00' WHERE state='MT'")
        db.executescript(SQL.read_text())
        self.assertEqual(db.execute("SELECT status,records_added FROM directory_jobs WHERE state='MT'").fetchone(),('queued',0))

if __name__=='__main__': unittest.main()
