import importlib.util,unittest
from pathlib import Path
p=Path(__file__).parents[1]/'scripts/attractions-import.py'
spec=importlib.util.spec_from_file_location('imp',p);imp=importlib.util.module_from_spec(spec);spec.loader.exec_module(imp)
def sample(kind='museum',name='Colorado Museum',identity='c397eed0-abb2-4575-97a5-32446bc81d14',confidence=.9):
 return {'id':identity,'geometry':{'coordinates':[-104.99,39.74]},'properties':{'id':identity,'names':{'primary':name},
  'taxonomy':{'primary':kind,'hierarchy':['arts_and_entertainment',kind]},'basic_category':kind,
  'confidence':confidence,'addresses':[{'locality':'Denver','region':'CO'}],'websites':['https://example.org/']}}
class TestAttractionImport(unittest.TestCase):
 def test_real_museum_provenance(self):
  row=imp.normalize(sample());self.assertEqual(row['category'],'museum')
  self.assertEqual(row['license'],'CDLA-Permissive-2.0');self.assertEqual(row['image_url'],'')
  self.assertEqual(row['city'],'Denver')
 def test_reject_nonattractions_closures_and_bad_coordinates(self):
  self.assertIsNone(imp.normalize(sample(kind='restaurant')))
  self.assertIsNone(imp.normalize(sample(confidence=.2)))
  x=sample();x['geometry']['coordinates']=[-113.2,39];self.assertIsNone(imp.normalize(x))
  x=sample();x['properties']['operating_status']='permanently_closed';self.assertIsNone(imp.normalize(x))
 def test_padded_download_must_not_infer_colorado_from_missing_region(self):
  x=sample();x['geometry']['coordinates']=[-105.0,41.005]
  x['properties']['addresses']=[{'locality':'Cheyenne'}]
  self.assertIsNone(imp.normalize(x))
  x=sample();x['properties']['addresses']=[{'locality':'Denver'}]
  self.assertIsNone(imp.normalize(x))
  x=sample();x['properties']['addresses']=[{'locality':'Denver','region':'WY'}]
  self.assertIsNone(imp.normalize(x))
 def test_no_unsafe_website(self):
  x=sample();x['properties']['websites']=['javascript:alert(1)']
  self.assertEqual(imp.normalize(x)['website'],'')
 def test_duplicate_and_truncation_explicit(self):
  rows=[sample(),sample(),sample(name='Other',identity='a397eed0-abb2-4575-97a5-32446bc81d14')]
  d=imp.build(rows,limit=1,generated_at='2026-11-01T00:00:00Z')
  self.assertEqual(d['eligible_count'],2);self.assertEqual(len(d['items']),1);self.assertTrue(d['truncated'])
if __name__=='__main__':unittest.main()
