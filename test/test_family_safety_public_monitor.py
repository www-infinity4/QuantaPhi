import importlib.util
import unittest
from pathlib import Path

MODULE_PATH = Path(__file__).resolve().parent.parent / "scripts/family-safety-public-monitor.py"
spec = importlib.util.spec_from_file_location("family_safety_monitor", MODULE_PATH)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

def seed():
    return {"schema_version": 1,"monitor_kind":"official_civilian_safety_sources","last_run_utc":None,
            "sources":[{"id":key,"url":url,"status":"pending","last_success_utc":None,
                        "last_change_utc":None,"content_sha256":None}
                       for key,url in mod.SOURCES.items()]}

class FamilySafetyMonitorTests(unittest.TestCase):
    def test_initial_check_is_baseline_not_alert(self):
        data = mod.update_state(seed(), check=lambda url: 'a'*64, now='2026-11-13T07:00:00Z')
        self.assertEqual(len(data['sources']),len(mod.SOURCES))
        self.assertTrue(all(s['status']=='ok' and s['last_change_utc'] is None for s in data['sources']))

    def test_change_signals_only_after_successful_baseline(self):
        first = mod.update_state(seed(), check=lambda url:'a'*64,now='2026-11-13T07:00:00Z')
        changed = mod.update_state(first,check=lambda url:'b'*64,now='2026-11-13T13:00:00Z')
        self.assertTrue(all(s['status']=='review_required' for s in changed['sources']))
        self.assertTrue(all(s['last_change_utc']=='2026-11-13T13:00:00Z' for s in changed['sources']))
        steady = mod.update_state(changed,check=lambda url:'b'*64,now='2026-11-13T19:00:00Z')
        self.assertTrue(all(s['status']=='ok' for s in steady['sources']))

    def test_failed_checks_preserve_verified_previous_evidence(self):
        first = mod.update_state(seed(),check=lambda url:'a'*64,now='2026-11-13T07:00:00Z')
        def broken(url): raise OSError('offline')
        failed = mod.update_state(first,check=broken,now='2026-11-13T13:00:00Z')
        self.assertTrue(all(s['status']=='unavailable' and s['last_success_utc']=='2026-11-13T07:00:00Z' and s['content_sha256']=='a'*64 for s in failed['sources']))

    def test_only_fixed_public_government_pages_are_allowed(self):
        for url in mod.SOURCES.values():
            self.assertTrue(url.startswith('https://'))
        with self.assertRaises(ValueError):
            mod.public_digest('https://example.net/redirect')

    def test_normalizer_discards_script_and_style(self):
        output=mod.normalize_public_page('<html><body>Travel advice<script>fake alarm</script><style>.x{}</style> Read official notice</body></html>')
        self.assertIn('Travel advice',output)
        self.assertNotIn('fake alarm',output)

if __name__ == '__main__':
    unittest.main()
