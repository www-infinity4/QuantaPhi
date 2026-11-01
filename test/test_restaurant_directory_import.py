"""Regression cases for the licensed Overture restaurant directory import."""
import importlib.util
import unittest
from pathlib import Path

path = Path(__file__).parents[1] / 'scripts/restaurant-directory-import.py'
spec = importlib.util.spec_from_file_location('restaurant_import', path)
directory = importlib.util.module_from_spec(spec)
spec.loader.exec_module(directory)

def example(name='Example Diner', category='diner', hierarchy=None, confidence=.95, identity='c397eed0-abb2-4575-97a5-32446bc81d14'):
    return {'type':'Feature','id': identity,
        'geometry':{'type':'Point','coordinates':[-104.992,39.748]},
        'properties':{'id':identity, 'names':{'primary':name},
        'taxonomy':{'hierarchy':hierarchy or ['food_and_drink','restaurant',category],'primary':category},
        'basic_category':'restaurant','confidence':confidence,
        'websites':['https://example.com/menu'],
        'addresses':[{'freeform':'101 Test Street'}]}}

class RestaurantDirectoryTests(unittest.TestCase):
    def test_real_restaurant_becomes_source_backed_organic_listing(self):
        row=directory.normalize(example())
        self.assertEqual(row['name'],'Example Diner')
        self.assertEqual(row['source_name'],'Overture Maps')
        self.assertFalse(row['sponsored'])
        self.assertEqual(row['image_url'],'')
        self.assertEqual(row['website'],'https://example.com/menu')
    def test_nonrestaurants_closed_and_low_confidence_are_rejected(self):
        self.assertIsNone(directory.normalize(example(category='school',hierarchy=['education','school'])))
        self.assertIsNone(directory.normalize(example(confidence=.2)))
        x=example();x['properties']['operating_status']='permanently_closed'
        self.assertIsNone(directory.normalize(x))
    def test_bad_website_coordinates_and_duplicate_places(self):
        a=example();a['properties']['websites']=['javascript:alert(1)']
        self.assertEqual(directory.normalize(a)['website'],'')
        b=example();b['geometry']['coordinates']=[-115,41]
        self.assertIsNone(directory.normalize(b))
        c=example(identity='d397eed0-abb2-4575-97a5-32446bc81d14')
        self.assertEqual(len(directory.build([a,c],clock='2026-11-01T00:00:00Z')['items']),1)
    def test_deterministic_name_order_and_provenance(self):
        a=example(name='Z Cafe');b=example(name='A Restaurant',identity='a397eed0-abb2-4575-97a5-32446bc81d14')
        result=directory.build([a,b],clock='2026-11-01T00:00:00Z')
        self.assertEqual([p['name'] for p in result['items']],['A Restaurant','Z Cafe'])
        self.assertTrue(all(p['source_url'].startswith('https://overturemaps.org/') for p in result['items']))

if __name__=='__main__': unittest.main()
