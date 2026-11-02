"""Nevada CCB eight-business official-roster ingestion contract; no license endorsement."""
import json
import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'data/cannabis/nv-ccb-eight-adult-use-2026-11-02.json'
SQL = ROOT / 'workers/cannabis-directory-nv-ccb-eight.sql'
SOURCE = 'https://ccb.nv.gov/list-of-licensees/'
RECEIPT = '2026-11-02-nv-ccb-eight-adult-use-v1'

def database():
    db = sqlite3.connect(':memory:')
    db.executescript("""
    CREATE TABLE state_policy(state TEXT PRIMARY KEY,adult_use TEXT,source_url TEXT DEFAULT '',reviewed_at TEXT DEFAULT '',notes TEXT DEFAULT '');
    CREATE TABLE regulator_source_catalog(state TEXT PRIMARY KEY,agency TEXT,source_kind TEXT,source_url TEXT,verified_at TEXT,source_status TEXT,notes TEXT);
    CREATE TABLE store_sources(id TEXT PRIMARY KEY,name TEXT,store TEXT,city TEXT,state TEXT,address TEXT,source_url TEXT,source_domain TEXT,source_name TEXT,verified_at TEXT,record_status TEXT,paid_sponsor INTEGER,license_status TEXT,official_source INTEGER,license_verified INTEGER,address_confirmed INTEGER,rights_cleared INTEGER,image_url TEXT,image_rights TEXT,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE import_receipts(receipt_id TEXT PRIMARY KEY,state TEXT,city TEXT,source_url TEXT,inspected INTEGER,accepted INTEGER,rejected INTEGER);
    CREATE TABLE directory_jobs(job_id TEXT PRIMARY KEY,state TEXT,status TEXT,phase TEXT,records_added INTEGER DEFAULT 0,updated_at TEXT DEFAULT '');
    INSERT INTO state_policy(state,adult_use) VALUES('NV','unreviewed'),('IA','not_authorized');
    INSERT INTO directory_jobs(job_id,state,status,phase) VALUES('review-nv','NV','queued','source_discovery');
    """)
    return db

class NevadaCCB(unittest.TestCase):
    def test_manifest_has_exact_source_and_unique_public_license_ids(self):
        m = json.loads(MANIFEST.read_text())
        self.assertEqual(m['source_url'], SOURCE)
        self.assertEqual(m['official_roster_as_of'], '2026-10-02')
        self.assertEqual(len(m['records']), 8)
        self.assertEqual(len({r['license_number'] for r in m['records']}), 8)
        for flag in ('license_verified', 'merchant_urls_verified', 'advertising_approved', 'media_rights'):
            self.assertFalse(m[flag])
        for r in m['records']:
            self.assertRegex(r['license_number'], r'^\\d{20}$')
            self.assertEqual(r['source_url'], SOURCE)
            self.assertEqual(r['state'], 'NV')
            self.assertEqual(set(r), {'license_number','name','city','state','street_address','source_url'})

    def test_idempotent_sql_receipt_and_safe_flags(self):
        db = database()
        for _ in range(2):
            db.executescript(SQL.read_text())
        m = json.loads(MANIFEST.read_text())
        ids = {'nv-ccb:'+r['license_number'] for r in m['records']}
        rows = db.execute('SELECT id,record_status,paid_sponsor,official_source,license_verified,address_confirmed,rights_cleared,image_url,source_domain,license_status FROM store_sources').fetchall()
        self.assertEqual({r[0] for r in rows}, ids)
        self.assertEqual(len(rows), 8)
        for r in rows:
            self.assertEqual(r[1:9], ('listed',0,1,0,1,0,'','ccb.nv.gov'))
            self.assertEqual(r[9], 'nv_ccb_roster_2026_10_02_current_status_unverified')
        self.assertEqual(db.execute('SELECT receipt_id,accepted FROM import_receipts').fetchall(), [(RECEIPT,8)])
        self.assertEqual(db.execute("SELECT status,phase,records_added FROM directory_jobs WHERE state='NV'").fetchone(), ('review','license_and_local_review',8))
        self.assertEqual(db.execute("SELECT adult_use FROM state_policy WHERE state='IA'").fetchone()[0], 'not_authorized')

    def test_missing_state_policy_fails_closed(self):
        db = database()
        db.execute("DELETE FROM state_policy WHERE state='NV'")
        db.executescript(SQL.read_text())
        self.assertEqual(db.execute('SELECT COUNT(*) FROM store_sources').fetchone()[0], 0)
        self.assertEqual(db.execute('SELECT COUNT(*) FROM import_receipts').fetchone()[0], 0)
        self.assertEqual(db.execute("SELECT status FROM directory_jobs WHERE state='NV'").fetchone()[0], 'queued')

if __name__ == '__main__':
    unittest.main()
