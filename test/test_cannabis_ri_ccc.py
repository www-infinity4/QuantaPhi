"""Source-backed Rhode Island CCC hybrid retail directory tests."""
from pathlib import Path
import json,sqlite3,unittest
R=Path(__file__).resolve().parents[1]
S=R/'workers/cannabis-directory-ri-ccc-nine.sql'
M=R/'data/cannabis/ri-ccc-nine-hybrid-2026-11-02.json'
def db():
 c=sqlite3.connect(':memory:')
 c.executescript("""
 CREATE TABLE state_policy(state TEXT PRIMARY KEY,adult_use TEXT,source_url TEXT DEFAULT '',reviewed_at TEXT DEFAULT '',notes TEXT DEFAULT '');
 CREATE TABLE regulator_source_catalog(state TEXT PRIMARY KEY,agency TEXT,source_kind TEXT,source_url TEXT,verified_at TEXT,source_status TEXT,notes TEXT);
 CREATE TABLE store_sources(id TEXT PRIMARY KEY,name TEXT,store TEXT,city TEXT,state TEXT,address TEXT,source_url TEXT,source_domain TEXT,source_name TEXT,verified_at TEXT,record_status TEXT,paid_sponsor INTEGER,license_status TEXT,official_source INTEGER,license_verified INTEGER,address_confirmed INTEGER,rights_cleared INTEGER,image_url TEXT,image_rights TEXT);
 CREATE TABLE import_receipts(receipt_id TEXT PRIMARY KEY,state TEXT,city TEXT,source_url TEXT,inspected INTEGER,accepted INTEGER,rejected INTEGER);
 CREATE TABLE directory_jobs(job_id TEXT PRIMARY KEY,state TEXT,status TEXT,phase TEXT,records_added INTEGER DEFAULT 0,updated_at TEXT DEFAULT '');
 INSERT INTO state_policy(state,adult_use) VALUES('RI','unreviewed'),('IA','not_authorized');
 INSERT INTO directory_jobs(job_id,state,status,phase) VALUES('first-review-ri','RI','queued','source_discovery');
 """)
 return c
class TestRhodeIsland(unittest.TestCase):
 def test_official_nine_distinct(self):
  m=json.loads(M.read_text())
  self.assertEqual(m['source'],'Rhode Island Cannabis Control Commission')
  self.assertFalse(m['license_verified']);self.assertFalse(m['advertising_approved']);self.assertFalse(m['media_rights'])
  self.assertEqual(len(m['records']),9)
  self.assertEqual(len({r['license_number'] for r in m['records']}),9)
  for r in m['records']:
   self.assertRegex(r['license_number'],r'^MMP CC 00[1-9]$')
   self.assertIn(', RI 0',r['address'])
   self.assertEqual(r['official_source_url'],m['source_url'])
   self.assertTrue(r['website'].startswith('https://'))
   self.assertNotIn('owner',r)
 def test_idempotent_and_no_wallet_ads(self):
  c=db()
  for _ in range(2):c.executescript(S.read_text())
  a=c.execute('SELECT id,record_status,paid_sponsor,official_source,license_verified,address_confirmed,rights_cleared,image_url,license_status FROM store_sources').fetchall()
  self.assertEqual(len(a),9)
  for r in a:
   self.assertTrue(r[0].startswith('ri-ccc:MMPCC'))
   self.assertEqual(r[1:8],('listed',0,1,0,1,0,''))
   self.assertEqual(r[8],'ri_ccc_hybrid_retail_status_unverified')
  self.assertEqual(c.execute('SELECT inspected,accepted,rejected FROM import_receipts').fetchall(),[(9,9,0)])
  self.assertEqual(c.execute("SELECT status,phase,records_added FROM directory_jobs WHERE state='RI'").fetchone(),('review','license_and_local_review',9))
  self.assertEqual(c.execute("SELECT adult_use FROM state_policy WHERE state='IA'").fetchone()[0],'not_authorized')
  c.close()
 def test_missing_policy_fails_closed(self):
  c=db();c.execute("DELETE FROM state_policy WHERE state='RI'");c.executescript(S.read_text())
  self.assertEqual(c.execute('SELECT count(*) FROM store_sources').fetchone()[0],0)
  self.assertEqual(c.execute('SELECT count(*) FROM import_receipts').fetchone()[0],0)
 def test_no_sensitive_fields_or_fabricated_claims(self):
  s=S.read_text().lower()
  for word in ('customer_rating','star_rating','ssn','private_key','credit_card','image_url,https'):
   self.assertNotIn(word,s)
if __name__=='__main__':unittest.main()
