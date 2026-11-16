"""Offline regression tests for Overture source release provenance."""
import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('overture_guard', Path(__file__).parents[1] / 'scripts/overture-release-guard.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ReleaseGuardTests(unittest.TestCase):
    def test_matching_pinned_release(self):
        self.assertEqual(module.verify_release({'latest': '2026-10-21.0'}, '2026-10-21.0'), '2026-10-21.0')

    def test_reject_newer_release_instead_of_mislabeling(self):
        with self.assertRaisesRegex(ValueError, 'release changed'):
            module.verify_release({'latest': '2026-11-18.0'}, '2026-10-21.0')

    def test_reject_missing_or_untrusted_release(self):
        for catalog in ({}, {'latest': 'latest'}, {'latest': '../2026-10-21.0'}, None):
            with self.subTest(catalog=catalog), self.assertRaises(ValueError):
                module.verify_release(catalog, '2026-10-21.0')

    def test_reject_invalid_expected_release(self):
        with self.assertRaises(ValueError):
            module.verify_release({'latest': '2026-10-21.0'}, 'latest')


if __name__ == '__main__':
    unittest.main()
