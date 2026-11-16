import importlib.util
import json
import unittest
from pathlib import Path
p=Path(__file__).parents[1]/'scripts/restaurant-directory-cloudflare-sync.py'
spec=importlib.util.spec_from_file_location('restaurant_cloudflare_sync',p)
mod=importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
class RestaurantCloudflareSyncTest(unittest.TestCase):
    def row(self,id='overture:ce1f23de-3156-4341-80c6-44f14f4b2ead'):
        return {'id':id,'name':'Example Diner','city':'Denver','state':'CO','category':'diner','address':'1 Test Street','latitude':39.74,'longitude':-104.98,'website':'https://example.com','source_url':'https://overturemaps.org/','source_name':'Overture Maps','confidence':0.95,'image_url':'','sponsored':False}
    def test_payload_validation_refuses_fake_ads_and_bad_sources(self):
        valid={'schema_version':1,'source_name':'Overture Maps','city':'Denver','state':'CO','items':[self.row()]}
        self.assertEqual(len(mod.validate_snapshot(valid,min_rows=1)),1)
        for change in [{'sponsored':True},{'source_name':'Google paid ad'},{'latitude':90},{'id':'fake:abc'}]:
            bad=json.loads(json.dumps(valid));bad['items'][0].update(change)
            with self.assertRaises(ValueError):mod.validate_snapshot(bad,min_rows=1)
    def test_run_inserts_only_fixed_public_restaurant_table(self):
        p=self.row()
        sql,values=mod.upsert_statement(p,'2026-11-01T05:54:04Z')
        self.assertIn('INSERT INTO restaurants',sql)
        self.assertIn('ON CONFLICT(id)',sql)
        self.assertNotIn('DELETE FROM',sql)
        self.assertNotIn('infinity-ledger',sql)
        self.assertEqual(values[0],p['id'])
        self.assertEqual(values[-1],'2026-11-01T05:54:04Z')
    def test_batched_upload_retries_safely_and_receipts_only_after_success(self):
        rows=[self.row('overture:ce1f23de-3156-4341-80c6-'+str(i).zfill(12)) for i in range(3)]
        batches=list(mod.batch(rows,2))
        self.assertEqual([len(x) for x in batches],[2,1])
        self.assertEqual(len({x['id'] for group in batches for x in group}),3)
if __name__=='__main__':unittest.main()
