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
            path.write_text(json.dumps(feature(id='first-source-id'))+'\\n'+
                            json.dumps(feature(id='second-source-id'))+'\\n',encoding='utf-8')
            calls=[]
            def fake_query(sql, params=None, batch=None):
                calls.append({'sql':sql,'params':params,'batch':batch})
                return [{'results':[]}]
            original=ingest.api_query
            try:
                ingest.api_query=fake_query
                accepted=ingest.ingest_file(path,{'job_id':'metro:CO:denver','city':'Denver',
                                                   'state':'CO','cursor':''},max_items=10)
            finally:
                ingest.api_query=original
            self.assertEqual(accepted,1)
            batches=[x['batch'] for x in calls if x['batch'] is not None]
            self.assertEqual(len(batches),1)
            self.assertEqual(len(batches[0]),1)

    def test_api_checks_credentials_before_any_network(self):
        old_acc,old_token=ingest.ACCOUNT,ingest.TOKEN
        try:
            ingest.ACCOUNT = ''
            ingest.TOKEN = ''
            with self.assertRaisesRegex(RuntimeError,'not configured'):
                ingest.api_query('SELECT 1')
        finally:
            ingest.ACCOUNT,ingest.TOKEN=old_acc,old_token

if __name__=='__main__':
    unittest.main()
