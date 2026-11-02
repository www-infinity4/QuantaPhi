"""CT DCP source-backed business-only hybrid retailer importer acceptance."""
import json
import sqlite3
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'data/cannabis/ct-dcp-ten-hybrid-2026-11-02.json'
SQL = ROOT / 'workers/cannabis-directory-ct-dcp-ten.sql'

def db():
    c = sqlite3.connect(':memory:')
    c.executescript("""
    CREATE TABLE state_policy(state TEXT PRIMARY KEY,adult_use TEXT,source_url TEXT DEFAULT '',reviewed_at TEXT DEFAULT '',notes TEXT DEFAULT '');
    CREATE TABLE regulator_source_catalog(state TEXT PRIMARY KEY,agency TEXT,source_kind TEXT,source_url TEXT,verified_at TEXT,source_status TEXT,notes TEXT);
    CREATE TABLE store_sources(id TEXT PRIMARY KEY,name TEXT,store TEXT,city TEXT,state TEXT,address TEXT,source_url TEXT,source_domain TEXT,source_name TEXT,verified_at TEXT,record_status TEXT,paid_sponsor INTEGER,license_status TEXT,official_source INTEGER,license_verified INTEGER,address_confirmed INTEGER,rights_cleared INTEGER,image_url TEXT,image_rights TEXT);
    CREATE TABLE import_receipts(receipt_id TEXT PRIMARY KEY,state TEXT,city TEXT,source_url TEXT,inspected INTEGER,accepted INTEGER,rejected INTEGER);
    CREATE TABLE directory_jobs(job_id TEXT PRIMARY KEY,state TEXT,status TEXT,phase TEXT,records_added INTEGER DEFAULT 0,updated_at TEXT DEFAULT '');
    INSERT INTO state_policy(state,adult_use) VALUES('CT','unreviewed'),('IA','not_authorized');
    INSERT INTO directory_jobs(job_id,state,status,phase) VALUES('review-ct','CT','queued','source_discovery');
    """)
    return c

class TestConnecticutDCP(unittest.TestCase):
    def test_manifest_official_and_no_private_person_data(self):
        m = json.loads(MANIFEST.read_text())
        self.assertEqual(m['source_dataset_id'], '42yd-3x3d')
        self.assertEqual(m['source_url'], 'https://data.ct.gov/d/42yd-3x3d')
        self.assertEqual(m['official_dataset_updated'], '2026-10-27')
        for flag in ('license_verified','merchant_urls_verified','advertising_approved','media_rights'):
            self.assertFalse(m[flag])
        self.assertEqual(len(m['records']), 10)
        self.assertEqual(len({r['license_number'] for r in m['records']}), 10)
        for r in m['records']:
            self.assertRegex(r['license_number'], r'^AMHF\\.\\d{7}$')
            self.assertEqual(r['license_type'], 'Hybrid Retailer')
            self.assertEqual(r['state'], 'CT')
            self.assertIn(', CT 0', r['address'])
            self.assertEqual(r['source_url'], m['source_url'])
            self.assertEqual(set(r), {'license_number','license_type','name','city','state','address','official_source_url','source_url'})

    def test_idempotent_organic_and_unverified(self):
        c = db()
        for _ in range(2):
            c.executescript(SQL.read_text())
        rows = c.execute('SELECT id,record_status,paid_sponsor,official_source,license_verified,address_confirmed,rights_cleared,image_url,license_status,source_domain FROM store_sources').fetchall()
        self.assertEqual(len(rows), 10)
        for row in rows:
            self.assertTrue(row[0].startswith('ct-dcp:AMHF.'))
            self.assertEqual(row[1:8], ('listed',0,1,0,1,0,''))
            self.assertEqual(row[8], 'ct_dcp_hybrid_operating_status_unverified')
            self.assertEqual(row[9], 'data.ct.gov')
        self.assertEqual(c.execute('SELECT inspected,accepted,rejected FROM import_receipts').fetchall(), [(10,10,0)])
        self.assertEqual(c.execute("SELECT status,phase,records_added FROM directory_jobs WHERE state='CT'").fetchone(), ('review','license_and_local_review',10))
        self.assertEqual(c.execute("SELECT adult_use FROM state_policy WHERE state='IA'").fetchone()[0], 'not_authorized')

    def test_missing_policy_fails_closed(self):
        c = db()
        c.execute("DELETE FROM state_policy WHERE state='CT'")
        c.executescript(SQL.read_text())
        self.assertEqual(c.execute('SELECT COUNT(*) FROM store_sources').fetchone()[0], 0)
        self.assertEqual(c.execute('SELECT COUNT(*) FROM import_receipts').fetchone()[0], 0)

    def test_source_receipt_matches_manifest_exactly(self):
        c = db()
        c.executescript(SQL.read_text())
        m = json.loads(MANIFEST.read_text())
        expected = {'ct-dcp:'+r['license_number'] for r in m['records']}
        actual = {r[0] for r in c.execute('SELECT id FROM store_sources')}
        self.assertEqual(expected, actual)
        self.assertEqual(c.execute('SELECT COUNT(*) FROM regulator_source_catalog WHERE state="CT"').fetchone()[0], 1)

if __name__ == '__main__':
    unittest.main()
