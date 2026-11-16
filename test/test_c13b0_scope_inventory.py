"""Regression tests for public OAuth scope proof (no credentials or live requests)."""
import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "scripts"))
from c13b0_scope_inventory import validate_public_scope_inventory

PREFIX = "8f676e020d9ff91a"

def inventory(allowed=386, requested=386, prefix=PREFIX):
    return {"ok": True, "configured": True, "clientIdPrefix": prefix,
            "scopeInventory": {"serverAllowlistCount": allowed,
                               "signInRequestScopeCount": requested}}

class PublicScopeInventoryTests(unittest.TestCase):
    def test_configured_386_does_not_claim_provider_registration_or_consent(self):
        result = validate_public_scope_inventory(inventory())
        self.assertEqual(result["serverAllowlistCount"], 386)
        self.assertEqual(result["signInRequestScopeCount"], 386)
        self.assertEqual(result["clientIdPrefix"], PREFIX)
        self.assertIs(result["providerRegistrationVerified"], False)
        self.assertIs(result["ownerConsentVerified"], False)
        self.assertIs(result["authenticatedLoginVerified"], False)

    def test_rejects_wrong_client_even_with_matching_counts(self):
        with self.assertRaisesRegex(ValueError, "identity"):
            validate_public_scope_inventory(inventory(prefix="0123456789abcdef"))

    def test_rejects_partial_and_false_positive_counts(self):
        for a, b in [(386, 6), (6, 386), (385, 386), (386, 387),
                     (True, 386), (386, "386")]:
            with self.subTest(allowed=a, requested=b):
                with self.assertRaises(ValueError):
                    validate_public_scope_inventory(inventory(a, b))

    def test_rejects_unconfigured_and_malformed(self):
        for bad in [None, {}, {"ok": True}, {**inventory(), "configured": False},
                    {**inventory(), "scopeInventory": []},
                    {**inventory(), "ok": False}]:
            with self.subTest(bad=bad):
                with self.assertRaises(ValueError):
                    validate_public_scope_inventory(bad)

if __name__ == "__main__":
    unittest.main()
