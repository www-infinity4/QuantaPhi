import importlib.util
import unittest
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "scripts/identity-shield-public-monitor.py"
spec = importlib.util.spec_from_file_location("identity_shield_public_monitor", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SourceMonitorTests(unittest.TestCase):
    def blank(self):
        return {"monitor_kind": "public_policy_sources_only", "sources": []}

    def test_initial_public_check_marks_only_verified_sources_ok(self):
        result = module.update_state(self.blank(), check=lambda url: "f" * 64, now="2026-11-06T19:00:00+00:00")
        self.assertEqual(len(result["sources"]), 4)
        self.assertTrue(all(row["status"] == "ok" for row in result["sources"]))
        self.assertEqual(result["sources"][0]["last_success_utc"], result["last_run_utc"])

    def test_changed_government_page_requires_review_not_fraud_claim(self):
        state = module.update_state(self.blank(), check=lambda _: "a"*64, now="2026-11-06T19:00:00+00:00")
        result = module.update_state(state, check=lambda _: "b"*64, now="2026-11-07T19:00:00+00:00")
        self.assertTrue(all(row["status"] == "review_required" for row in result["sources"]))
        self.assertEqual(result["sources"][0]["last_change_utc"], result["last_run_utc"])

    def test_failed_public_fetch_is_not_reported_successful(self):
        def broken(_):
            raise TimeoutError("network")
        result = module.update_state(self.blank(), check=broken, now="2026-11-06T19:00:00+00:00")
        self.assertTrue(all(row["status"] == "unavailable" for row in result["sources"]))
        self.assertTrue(all(row["last_success_utc"] is None for row in result["sources"]))

    def test_no_account_urls_are_permitted(self):
        self.assertTrue(all(url.startswith("https://www.") for url in module.SOURCES.values()))
        self.assertTrue(all(
            "ssa.gov" in url or "identitytheft.gov" in url
            for url in module.SOURCES.values()
        ))


    def test_redirect_handler_blocks_navigation_before_external_request(self):
        # A default urllib opener follows 302 responses before geturl() can reject them.
        handler = module.RejectPublicSourceRedirect()
        self.assertIsNone(handler.redirect_request(None, None, 302, None, {}, "https://evil.example/internal"))
        
    def test_public_digest_installs_reject_redirect_handler(self):
        from unittest.mock import MagicMock, patch
        fake_response = MagicMock()
        fake_response.geturl.return_value = module.SOURCES["ssa-account"]
        fake_response.status = 200
        fake_response.read.return_value = ("Agency official public page " * 30).encode("utf-8")
        opener = MagicMock()
        opener.open.return_value.__enter__.return_value = fake_response
        with patch.object(module, "build_opener", return_value=opener) as factory:
            digest = module.public_digest(module.SOURCES["ssa-account"])
        self.assertEqual(len(digest), 64)
        self.assertTrue(any(isinstance(arg, module.RejectPublicSourceRedirect) for arg in factory.call_args.args))


if __name__ == "__main__":
    unittest.main()
