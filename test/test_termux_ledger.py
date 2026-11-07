import importlib.util
import json
import sqlite3
import tempfile
import unittest
from hashlib import sha256
from pathlib import Path

MODULE = Path(__file__).parents[1] / 'gitcoin' / 'termux-ledger.py'
spec = importlib.util.spec_from_file_location('termux_ledger', MODULE)
ledger = importlib.util.module_from_spec(spec)
if MODULE.exists():
    spec.loader.exec_module(ledger)


def receipt(repo, commit, path, n, code, eligible=True, reason=None):
    h = sha256(code.encode()).hexdigest()
    material = json.dumps(['git-line-v1', repo, commit, path, n, h], separators=(',', ':'))
    return {'id': sha256(material.encode()).hexdigest(), 'path': path, 'line_number': n,
            'content_sha256': h, 'git_type': 'git:website', 'language': 'html',
            'eligible': eligible, 'reason': reason}


def manifest():
    r = 'www-infinity4/Moltnook'
    c = 'a' * 40
    entries = [receipt(r, c, 'guestbook/index.html', 13, '<a href="../index.html">'),
               receipt(r, c, 'guestbook/index.html', 15, '</a>', False, 'trivial_line')]
    return {'version': 1, 'currency': 'GIT', 'status': 'provisional_not_minted',
            'repo': r, 'commit': c, 'intent': 'website', 'builder_claim': 'human',
            'github_login_claim': 'test-user', 'summary': {'added': 2, 'eligible': 1, 'excluded': 1},
            'lines': entries}


class LocalLedgerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = Path(self.temp.name) / 'db' / 'gitcoin.sqlite3'

    def test_import_stores_only_receipt_metadata_and_never_issues_awards(self):
        m = manifest()
        self.assertEqual(ledger.save_manifest(self.db, m, 'github_commit_found'), (2, 0))
        summary = ledger.balance(self.db)
        self.assertEqual(summary['pending_candidates'], 1)
        self.assertEqual(summary['excluded_lines'], 1)
        self.assertEqual(summary['settled_gits'], 0)
        self.assertIsNone(summary['verified_wallet_balance'])
        raw = self.db.read_bytes()
        self.assertNotIn(b'<a href=', raw)
        self.assertNotIn(b'</a>', raw)

    def test_duplicate_scans_do_not_increase_record_count(self):
        m = manifest()
        self.assertEqual(ledger.save_manifest(self.db, m, 'github_commit_found'), (2, 0))
        self.assertEqual(ledger.save_manifest(self.db, m, 'github_commit_found'), (0, 2))
        self.assertEqual(ledger.balance(self.db)['total_records'], 2)

    def test_tampered_receipt_is_rejected_without_writes(self):
        m = manifest()
        m['lines'][0]['id'] = 'f' * 64
        with self.assertRaises(ValueError):
            ledger.save_manifest(self.db, m, 'github_commit_found')
        self.assertFalse(self.db.exists())

    def test_rejects_mixed_repo_invalid_status_and_embedded_source(self):
        m = manifest()
        m['status'] = 'verified'
        with self.assertRaises(ValueError):
            ledger.save_manifest(self.db, m, 'github_commit_found')
        m = manifest()
        m['lines'][0]['content'] = 'secret code'
        with self.assertRaises(ValueError):
            ledger.save_manifest(self.db, m, 'github_commit_found')
        m = manifest()
        m['lines'][0]['path'] = '../secret.js'
        with self.assertRaises(ValueError):
            ledger.save_manifest(self.db, m, 'github_commit_found')

    def test_imported_manifest_cannot_claim_verified_remote_proof(self):
        m = manifest()
        self.assertEqual(ledger.save_manifest(self.db, m, 'not_checked'), (2, 0))
        with sqlite3.connect(self.db) as con:
            proof = con.execute('select distinct remote_check from gitcoin_receipts').fetchall()
        self.assertEqual(proof, [('not_checked',)])

    def test_local_serial_reference_and_authenticated_collector_are_bound_to_receipt(self):
        m = manifest()
        self.assertEqual(ledger.save_manifest(self.db, m, 'github_commit_found', authenticated_collector='test-user'), (2, 0))
        found = ledger.list_receipts(self.db)
        self.assertEqual(len(found), 2)
        self.assertEqual({x['receipt_reference'] for x in found}, {'GIT-P-' + x['id'] for x in m['lines']})
        self.assertEqual(found[0]['verified_collector'], 'test-user')
        self.assertEqual(found[0]['coin_status'], 'provisional_not_minted')
        self.assertEqual(ledger.save_manifest(self.db, m, 'github_commit_found', authenticated_collector='test-user'), (0, 2))
        with self.assertRaisesRegex(ValueError, 'collector_identity_conflict'):
            ledger.save_manifest(self.db, m, 'github_commit_found', authenticated_collector='different-user')
        self.assertEqual(ledger.balance(self.db)['total_records'], 2)

    def test_receipts_without_authenticated_github_identity_remain_unverified(self):
        m = manifest()
        ledger.save_manifest(self.db, m)
        self.assertIsNone(ledger.list_receipts(self.db)[0]['verified_collector'])
        self.assertEqual(ledger.balance(self.db)['settled_gits'], 0)

    def test_repo_urls_are_not_arbitrarily_trusted(self):
        self.assertTrue(ledger.remote_matches('git@github.com:www-infinity4/Moltnook.git', 'www-infinity4/Moltnook'))
        self.assertTrue(ledger.remote_matches('https://github.com/www-infinity4/Moltnook.git', 'www-infinity4/Moltnook'))
        self.assertFalse(ledger.remote_matches('https://evil.example/www-infinity4/Moltnook', 'www-infinity4/Moltnook'))
        self.assertFalse(ledger.remote_matches('https://github.com/another/Moltnook.git', 'www-infinity4/Moltnook'))

if __name__ == '__main__':
    unittest.main()