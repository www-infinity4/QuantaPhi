"""Validate public Cloudflare OAuth request configuration without claiming provider consent.

This endpoint only reports Bubbles Worker configuration. It does not prove
Cloudflare OAuth-client registration, granted permissions, or an owner login.
"""
EXPECTED_CLIENT_PREFIX = "8f676e020d9ff91a"
EXPECTED_SCOPES = 386

def validate_public_scope_inventory(data):
    if not isinstance(data, dict) or data.get("ok") is not True or data.get("configured") is not True:
        raise ValueError("live Bubbles OAuth configuration is unavailable")
    if data.get("clientIdPrefix") != EXPECTED_CLIENT_PREFIX:
        raise ValueError("live OAuth client identity does not match the verified client")
    inventory = data.get("scopeInventory")
    if not isinstance(inventory, dict):
        raise ValueError("live OAuth inventory is missing")
    for key in ("serverAllowlistCount", "signInRequestScopeCount"):
        value = inventory.get(key)
        if type(value) is not int or value != EXPECTED_SCOPES:
            raise ValueError("live OAuth " + key + " is not 386")
    return {
        "clientIdPrefix": EXPECTED_CLIENT_PREFIX,
        "serverAllowlistCount": EXPECTED_SCOPES,
        "signInRequestScopeCount": EXPECTED_SCOPES,
        "providerRegistrationVerified": False,
        "ownerConsentVerified": False,
        "authenticatedLoginVerified": False,
    }
