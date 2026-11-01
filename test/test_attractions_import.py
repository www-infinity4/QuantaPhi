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
 def test_only_explicit_colorado_closures_become_tombstones(self):
  x=sample()
  x['properties']['operating_status']='permanently_closed'
  self.assertEqual(imp.closure_id(x),'overture:'+x['id'])
  self.assertIsNone(imp.normalize(x))
  d=imp.build([x],generated_at='2026-11-01T00:00:00Z')
  self.assertEqual(d['items'],[])
  self.assertEqual(d['closed_ids'],['overture:'+x['id']])
  y=sample();y['properties']['operating_status']='permanently_closed'
  y['properties']['addresses']=[{'locality':'Cheyenne','region':'WY'}]
  self.assertIsNone(imp.closure_id(y))
  z=sample();z['properties']['operating_status']='permanently_closed'
  z['properties']['addresses']=[{'locality':'Unknown'}]
  self.assertIsNone(imp.closure_id(z))
  self.assertIsNone(imp.closure_id(sample()))
 def test_residential_false_positives_are_not_historic_attractions(self):
  for name in ('23rd Street East Apartments','1304 Apartments',
               '25 Broadmoor Apartments','Aspen Shadows Condominium',
               'Buffalo Ridge II Apartments','Vail Condo Association',
               'Mountain View Townhomes','Main Street Leasing Office',
               'Residences at Market Station','A Pomeranz Realty'):
   with self.subTest(name=name):
    self.assertIsNone(imp.normalize(sample(kind='historic_site',name=name,confidence=.99)))
  for name in ('Cambray Park Apartments','Heritage Park Apartments'):
   with self.subTest(name=name):
    self.assertIsNone(imp.normalize(sample(kind='park',name=name,confidence=.99)))
  self.assertEqual(imp.normalize(sample(kind='park',name='City Park'))['category'],'park')
  # A genuine-looking historic site is not rejected solely for its category.
  self.assertEqual(imp.normalize(sample(kind='historic_site',name='Historic Railroad Depot'))['category'],'historic_site')
  # The same words in a legitimate museum title should not cause a broad category ban.
  self.assertEqual(imp.normalize(sample(kind='museum',name='Apartment Living History Museum'))['category'],'museum')
 def test_no_unsafe_website(self):
  x=sample();x['properties']['websites']=['javascript:alert(1)']
  self.assertEqual(imp.normalize(x)['website'],'')
 def test_duplicate_and_truncation_explicit(self):
  rows=[sample(),sample(),sample(name='Other',identity='a397eed0-abb2-4575-97a5-32446bc81d14')]
  d=imp.build(rows,limit=1,generated_at='2026-11-01T00:00:00Z')
  self.assertEqual(d['eligible_count'],2);self.assertEqual(len(d['items']),1);self.assertTrue(d['truncated'])
 def test_workflow_pins_all_four_overture_downloads_to_one_release(self):
  workflow=(Path(__file__).parents[1]/'.github/workflows/attractions-directory-import.yml').read_text()
  self.assertIn('overturemaps download --stac --release="${RELEASE}"',workflow)
  self.assertIn('--release "${RELEASE}"',workflow)
  self.assertIn('test "$(release_from_stac)" = "${RELEASE}"',workflow)
if __name__=='__main__':unittest.main()
