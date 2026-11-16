import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('business_ingest', ROOT/'scripts/business_directory_ingest.py')
ingest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ingest)

def feature(**overrides):
    p = {'id':'a7c8-1234','names':{'primary':'Hammond Candies'},'basic_category':'food_and_drink',
         'websites':['https://candy.example/'],'addresses':[{'freeform':'1 Washington St, Denver, CO'}],
         'sources':[{'dataset':'Overture','license':'CDLA-Permissive-2.0'}]}
    p.update(overrides)
    return {'type':'Feature','properties':p,'geometry':{'type':'Point','coordinates':[-104.98,39.75]}}

class BusinessIngestTests(unittest.TestCase):
    def test_normalize_keeps_stable_dedupe(self):
        self.assertEqual(ingest.normalize('Hammond’s Candies!'), 'hammondscandies')
    def test_accepts_real_source_identity_not_sponsorship(self):
        b=ingest.business_from_feature(feature(),'Denver','CO')
        self.assertEqual(b['id'],'overture:a7c8-1234')
        self.assertEqual(b['name'],'Hammond Candies')
        self.assertEqual(b['city'],'Denver')
        self.assertEqual(b['category'],'Food And Drink')
        self.assertEqual(b['source_name'],'Overture Maps Places')
        self.assertNotIn('ad_status',b)
        self.assertNotIn('claimed',b)
    def test_rejects_closed_or_unsafe_unattributed_features(self):
        self.assertIsNone(ingest.business_from_feature(feature(operating_status='permanently_closed'),'Denver','CO'))
        self.assertIsNone(ingest.business_from_feature(feature(names={'primary':''}),'Denver','CO'))
        bad=feature(websites=['javascript:alert(1)','https://user:pass@evil.test/'])
        self.assertEqual(ingest.business_from_feature(bad,'Denver','CO')['website'],'')
    def test_rejects_restricted_categories_and_misclassified_rentals(self):
        self.assertIsNone(ingest.business_from_feature(
            feature(names={'primary':'Adult Vape Shop'},basic_category='vape_shop'),'Denver','CO'))
        self.assertIsNone(ingest.business_from_feature(
            feature(names={'primary':'Ace Rent To Own LLC'},basic_category='restaurant'),'Denver','CO'))

    def test_preserves_per_feature_license_and_rejects_unknown_license(self):
        row=ingest.business_from_feature(feature(sources=[
            {'dataset':'Foursquare','license':'Apache-2.0'},
            {'dataset':'Overture','license':'CDLA-Permissive-2.0'}]),'Denver','CO')
        self.assertEqual(row['source_license'],'Apache-2.0; CDLA-Permissive-2.0')
        self.assertIsNone(ingest.business_from_feature(
            feature(sources=[{'dataset':'unknown','license':'restricted-proprietary'}]),'Denver','CO'))
        self.assertIsNone(ingest.business_from_feature(feature(sources=[]),'Denver','CO'))
        self.assertIsNone(ingest.business_from_feature(feature(sources=[{'license': []}]),'Denver','CO'))

    def test_geojsonseq_may_contain_separator_and_feature_collection(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'places.geojsonseq'
            with p.open('w',encoding='utf-8') as f:
                f.write('\x1e'+json.dumps(feature())+'\n')
                f.write(json.dumps({'type':'FeatureCollection','features':[feature(id='another')]})+'\n')
            rows=list(ingest.parse_features(p))
            self.assertEqual(len(rows),2)
            self.assertEqual(rows[1]['properties']['id'],'another')
    def test_same_name_address_is_deduplicated_within_one_chunk(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'two.geojsonseq'
            path.write_text(json.dumps(feature(id='first-source-id'))+'\n'+
                            json.dumps(feature(id='second-source-id'))+'\n',encoding='utf-8')
            calls=[]
            def fake_query(sql, params=None, batch=None):
                calls.append({'sql':sql,'params':params,'batch':batch})
                return [{'success':True,'meta':{'changes':1}} for _ in batch] if batch is not None else [{'results':[]}]
            original=ingest.api_query
            try:
                ingest.api_query=fake_query
                accepted=ingest.ingest_file(path,{'job_id':'metro:CO:denver','city':'Denver',
                                                   'state':'CO','cursor':''},release='2026-10-21.0',max_items=10)
            finally:
                ingest.api_query=original
            self.assertEqual(accepted,1)
            batches=[x['batch'] for x in calls if x['batch'] is not None]
            self.assertEqual(len(batches),1)
            self.assertEqual(len(batches[0]),1)
            receipts=[x for x in calls if 'INSERT OR IGNORE INTO business_ingest_receipts' in x['sql']]
            self.assertEqual(receipts[0]['params'][2],'2026-10-21.0')

    def test_protected_conflict_never_records_a_false_import_receipt(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'one.geojsonseq'
            path.write_text(json.dumps(feature())+'\n',encoding='utf-8')
            calls=[]
            def fake_query(sql, params=None, batch=None):
                calls.append({'sql':sql,'params':params,'batch':batch})
                return [{'success':True,'meta':{'changes':0}} for _ in batch] if batch is not None else [{'results':[]}]
            original=ingest.api_query
            try:
                ingest.api_query=fake_query
                with self.assertRaisesRegex(RuntimeError,'write conflict'):
                    ingest.ingest_file(path,{'job_id':'metro:CO:denver','city':'Denver',
                                                 'state':'CO','cursor':''},release='2026-10-21.0')
            finally:
                ingest.api_query=original
            self.assertFalse(any('INSERT OR IGNORE INTO business_ingest_receipts' in x['sql'] for x in calls))
            self.assertFalse(any('UPDATE city_import_jobs SET cursor' in x['sql'] for x in calls))

    def test_stac_release_is_validated_before_ingestion(self):
        from unittest.mock import patch
        from io import BytesIO
        with patch.object(ingest.urllib.request,'urlopen',return_value=BytesIO(b'{"latest":"2026-10-21.0"}')):
            self.assertEqual(ingest.overture_release(),'2026-10-21.0')
        for invalid in ('latest','unknown','2026-10-21.0\\n'):
            with patch.object(ingest.urllib.request,'urlopen',return_value=BytesIO(json.dumps({'latest':invalid}).encode())):
                with self.assertRaisesRegex(RuntimeError,'Invalid Overture STAC release'):
                    ingest.overture_release()
        with self.assertRaisesRegex(RuntimeError,'Missing pinned Overture release'):
            ingest.ingest_file('/nonexistent',{'job_id':'x'},release='STAC latest')

    def test_d1_forbidden_reports_scoped_permission_blocker_without_token(self):
        from unittest.mock import patch
        from urllib.error import HTTPError
        old_acc,old_token=ingest.ACCOUNT,ingest.TOKEN
        fake_token='fake_token_for_test_only_123456789'
        try:
            ingest.ACCOUNT='0'*32
            ingest.TOKEN=fake_token
            forbidden=HTTPError('https://api.cloudflare.com/client/v4/',403,'Forbidden',{},None)
            with patch.object(ingest.urllib.request,'urlopen',side_effect=forbidden):
                with self.assertRaisesRegex(RuntimeError,'D1.*403.*permission') as caught:
                    ingest.api_query('SELECT 1')
            self.assertNotIn(fake_token,str(caught.exception))
        finally:
            ingest.ACCOUNT,ingest.TOKEN=old_acc,old_token

    def test_api_checks_credentials_before_any_network(self):
        old_acc,old_token=ingest.ACCOUNT,ingest.TOKEN
        try:
            ingest.ACCOUNT = ''
            ingest.TOKEN = ''
            with self.assertRaisesRegex(RuntimeError,'not configured'):
                ingest.api_query('SELECT 1')
        finally:
            ingest.ACCOUNT,ingest.TOKEN=old_acc,old_token


    def test_main_pins_download_and_ingest_to_same_stac_release(self):
        from unittest.mock import patch
        job={'job_id':'metro:CO:colorado-springs','city':'Colorado Springs','state':'CO',
             'bbox':'-104.9,38.7,-104.6,38.95','cursor':''}
        with patch.object(ingest,'api_query',return_value=[{'results':[job]}]) as query, \
             patch.object(ingest,'overture_release',side_effect=['2026-10-21.0','2026-10-21.0']) as resolver, \
             patch.object(ingest.subprocess,'run') as download, \
             patch.object(ingest,'ingest_file',return_value=12) as import_rows:
            ingest.main()
        self.assertEqual(resolver.call_count,2)
        download.assert_called_once()
        command=download.call_args.args[0]
        self.assertIn('--release=2026-10-21.0',command)
        self.assertIn('--bbox='+job['bbox'],command)
        self.assertEqual(command[0:2],['overturemaps','download'])
        self.assertTrue(download.call_args.kwargs['check'])
        import_rows.assert_called_once()
        self.assertEqual(import_rows.call_args.args[1],job)
        self.assertEqual(import_rows.call_args.args[2],'2026-10-21.0')
        self.assertEqual(query.call_count,1)

    def test_main_rejects_stac_release_change_before_ingest(self):
        from unittest.mock import patch
        job={'job_id':'metro:CO:colorado-springs','city':'Colorado Springs','state':'CO',
             'bbox':'-104.9,38.7,-104.6,38.95','cursor':''}
        with patch.object(ingest,'api_query',return_value=[{'results':[job]}]) as query, \
             patch.object(ingest,'overture_release',side_effect=['2026-10-21.0','2026-11-01.0']) as resolver, \
             patch.object(ingest.subprocess,'run') as download, \
             patch.object(ingest,'ingest_file') as import_rows:
            with self.assertRaisesRegex(RuntimeError,'release changed during download'):
                ingest.main()
        self.assertEqual(resolver.call_count,2)
        self.assertIn('--release=2026-10-21.0',download.call_args.args[0])
        import_rows.assert_not_called()
        self.assertEqual(query.call_count,1)

if __name__=='__main__':
    unittest.main()
