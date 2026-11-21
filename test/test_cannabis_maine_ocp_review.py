"""Synthetic Maine business fixtures only: no public directory writes."""
import csv
import importlib.util
import io
import unittest
from datetime import date
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / 'scripts/cannabis_maine_ocp_review.py'
spec = importlib.util.spec_from_file_location('maine_ocp', PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

BASE = dict(license_number='AMS1234', license_status='Active', license_type='Store',
            expiration_date='2027-07-01', business_name='Synthetic Retailer',
            street_address='12 Example Street', city='Portland', state='ME',
            zip='04101', website='https://example.org', owner_name='DO NOT EXPORT',
            owner_email='private@example.org', owner_phone='207-555-0100')

def csv_bytes(rows):
    s=io.StringIO()
    w=csv.DictWriter(s, fieldnames=list(BASE))
    w.writeheader(); w.writerows(rows)
    return s.getvalue().encode('utf-8')

class MaineOCPReviewTests(unittest.TestCase):
    def test_active_unexpired_store_only_and_no_personal_data(self):
        rows=[BASE,
              {**BASE,'license_number':'AMS1235','license_status':'Conditional'},
              {**BASE,'license_number':'AMS1236','license_status':'Pending Conditional'},
              {**BASE,'license_number':'AMS1237','license_type':'Cultivation'},
              {**BASE,'license_number':'AMS1238','expiration_date':'2026-10-01'},
              {**BASE,'license_number':'AMS1239','street_address':''},
              {**BASE,'license_number':'AMS1240','website':'http://unsafe.example'},
              {**BASE,'license_number':'AMS1241','state':'NH'}]
        r=module.build(csv_bytes(rows),'2026-11-01',today=date(2026,11,1))
        self.assertEqual((r['inspected'],r['accepted_for_manual_review']),(8,1))
        self.assertFalse(r['import_ready'])
        self.assertEqual(r['candidates'][0]['id'],'me-ocp:AMS1234')
        self.assertEqual(r['candidates'][0]['record_status'],'review')
        self.assertEqual(r['candidates'][0]['paid_sponsor'],0)
        self.assertIsNone(r['candidates'][0]['quality_star'])
        self.assertNotIn('owner',str(r))
        self.assertNotIn('private@example.org',str(r))
        self.assertNotIn('207-555',str(r))
    def test_unknown_and_expired_status_fail_closed(self):
        with self.assertRaisesRegex(ValueError,'No active'):
            module.build(csv_bytes([{**BASE,'license_status':'Conditional, Jurisdiction Approved'}]),'2026-11-01',today=date(2026,11,1))
    def test_duplicate_license_fatal(self):
        with self.assertRaisesRegex(ValueError,'Duplicate'):
            module.build(csv_bytes([BASE,BASE]),'2026-11-01',today=date(2026,11,1))
    def test_missing_columns_fatal(self):
        with self.assertRaisesRegex(ValueError,'Missing'):
            module.build(b'license_number,license_status\nAMS1234,Active\n','2026-11-01',today=date(2026,11,1))
    def test_stale_or_future_snapshot_fatal(self):
        for d in ('2026-09-01','2026-11-02'):
            with self.subTest(d=d),self.assertRaises(ValueError):
                module.build(csv_bytes([BASE]),d,today=date(2026,11,1))
    def test_rejects_unsafe_merchant_url(self):
        for url in ('javascript:alert(1)','http://example.org','https://user:pass@example.org','https://localhost'):
            with self.subTest(url=url):
                r,reason=module.assess({**BASE,'website':url},date(2026,11,1))
                self.assertIsNone(r)
                self.assertEqual(reason,'unsafe_merchant_url')
    def test_rejects_bad_expiration_and_license(self):
        for change in ({'expiration_date':'not-a-date'}, {'license_number':'ACB1002'}, {'license_number':'AMS1;DROP'}, {'expiration_date':'2026-11-01'}):
            r,_=module.assess({**BASE,**change},date(2026,11,1))
            self.assertIsNone(r)

if __name__=='__main__':unittest.main()
