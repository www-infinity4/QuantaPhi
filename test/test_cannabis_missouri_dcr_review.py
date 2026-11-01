"""Synthetic records only. No invented Missouri stores published."""
import importlib.util
import io
import csv
from datetime import date
from pathlib import Path
import unittest

P=Path(__file__).resolve().parents[1]/'scripts/cannabis_missouri_dcr_review.py'
spec=importlib.util.spec_from_file_location('mo_review',P)
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)

BASE=dict(license_number='DIS123456',license_status='Active',ato_status='Approved to Operate',
          facility_type='Dispensary',trade_name='Synthetic Test Dispensary',legal_name='Synthetic LLC',
          street_address='123 Test Street',city='Example City',state='MO',zip='63101',website='https://example.org/')

def csv_bytes(rows):
    stream=io.StringIO();writer=csv.DictWriter(stream,fieldnames=mod.COLUMNS)
    writer.writeheader();writer.writerows(rows)
    return stream.getvalue().encode()

class MissouriDCRReviewTests(unittest.TestCase):
    def test_only_explicit_active_approved_and_addressed_dispensaries(self):
        rows=[BASE,
              {**BASE,'license_number':'DIS222222','ato_status':'Not Approved to Operate'},
              {**BASE,'license_number':'DIS333333','ato_status':''},
              {**BASE,'license_number':'DIS444444','license_status':'Suspended'},
              {**BASE,'license_number':'DIS555555','facility_type':'Cultivation'},
              {**BASE,'license_number':'DIS666666','street_address':''},
              {**BASE,'license_number':'DIS777777','website':'http://unsafe.example'},
              {**BASE,'license_number':'DIS888888','state':'KS'}]
        result=mod.build(csv_bytes(rows),'2026-11-01',today=date(2026,11,1))
        self.assertEqual((result['inspected'],result['accepted_for_manual_review']),(8,1))
        self.assertEqual(result['import_ready'],False)
        self.assertEqual(len(result['candidates']),1)
        item=result['candidates'][0]
        self.assertEqual(item['id'],'mo-dcr:DIS123456')
        self.assertEqual(item['record_status'],'review')
        self.assertEqual(item['paid_sponsor'],0)
        self.assertIsNone(item['quality_star'])
        self.assertNotIn('phone',item)
        self.assertNotIn('email',item)
    def test_unknown_ato_or_no_valid_records_fails_closed(self):
        with self.assertRaisesRegex(ValueError,'No active approved'):
            mod.build(csv_bytes([{**BASE,'ato_status':'Approved'}]),'2026-11-01',today=date(2026,11,1))
    def test_duplicate_license_is_fatal(self):
        with self.assertRaisesRegex(ValueError,'Duplicate license'):
            mod.build(csv_bytes([BASE,BASE]),'2026-11-01',today=date(2026,11,1))
    def test_missing_required_columns_fatal(self):
        with self.assertRaisesRegex(ValueError,'Missing explicit'):
            mod.build(b'license_number,ato_status\nDIS1,Approved to Operate\n','2026-11-01',today=date(2026,11,1))
    def test_stale_or_future_snapshot_fails_closed(self):
        for d in ('2026-09-01','2026-11-02'):
            with self.subTest(d=d),self.assertRaises(ValueError):
                mod.build(csv_bytes([BASE]),d,today=date(2026,11,1))
    def test_injection_or_non_https_website_rejected(self):
        for url in ('javascript:alert(1)','http://example.org','https://user:pass@example.org','https://localhost'):
            with self.subTest(url=url):
                record,reason=mod.assess({**BASE,'website':url})
                self.assertIsNone(record);self.assertEqual(reason,'unsafe_merchant_url')

if __name__=='__main__':unittest.main()
