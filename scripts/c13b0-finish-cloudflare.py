#!/usr/bin/env python3
"""Finish the existing 386-scope Bubbles Cloudflare connection from Termux.

Owner-run only. Uses existing verified API token locally; no token is sent
to GitHub, ChatGPT, quantaphi.org, or recorded in a receipt.
"""
import datetime
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import urllib.error
import urllib.request

ACCOUNT = "ef25728c096c6ba92cf510caa2058003"
CLIENT = "8f676e020d9ff91a2951e415d144c9b7"
CALLBACK = "https://quantaphi.org/api/bubbles/connections/cloudflare/callback"
WORKER = f"/accounts/{ACCOUNT}/workers/scripts/bubbles-connections"
BASE = "https://api.cloudflare.com/client/v4"
INVENTORY = "https://quantaphi.org/api/bubbles/connections/scope-inventory"
PROTOCOL = {"openid", "offline", "offline_access"}
LEGACY = {
    "BOT_WALLET": "service",
    "STARQUEST_LEDGER": "service",
    "CONNECTIONS": "durable_object_namespace",
    "CONNECTIONS_READY": "plain_text",
    "CLOUDFLARE_CLIENT_ID": "secret_text",
    "CLOUDFLARE_CLIENT_SECRET": "secret_text",
    "CLOUDFLARE_OAUTH_ALLOWED_SCOPES": "secret_text",
    "CONNECTION_KEYRING": "secret_text",
    "CONNECTION_ACTIVE_KEY": "secret_text",
    "GITHUB_CLIENT_ID": "secret_text",
    "GITHUB_CLIENT_SECRET": "secret_text",
}

class Blocked(Exception):
    pass

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None

def request_json(url, token="", body=None):
    if token and not url.startswith(BASE + "/"):
        raise Blocked("Token was not sent: target is outside Cloudflare API.")
    headers = {"Accept": "application/json", "User-Agent": "C13b0-Bubbles-Scopes/3"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, headers=headers,
                                 method="PUT" if body is not None else "GET",
                                 data=json.dumps(body).encode() if body is not None else None)
    try:
        with urllib.request.build_opener(NoRedirect()).open(req, timeout=25) as response:
            raw = response.read(1048577)
    except urllib.error.HTTPError as exc:
        raw = exc.read(32768)
        try:
            failure = json.loads(raw)
            codes = [str(e.get("code")) for e in failure.get("errors", [])
                     if isinstance(e, dict) and isinstance(e.get("code"), int)]
        except (ValueError, TypeError, AttributeError):
            codes = []
        raise Blocked(f"Provider HTTP {exc.code}; error codes: {','.join(codes) or 'none'}") from None
    except (TimeoutError, urllib.error.URLError, OSError):
        raise Blocked("Network failure; a write may need independent verification.") from None
    if len(raw) > 1048576:
        raise Blocked("Provider response larger than safety limit.")
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeError):
        raise Blocked("Provider returned non-JSON.") from None
    if not isinstance(data, dict) or data.get("success") is False:
        raise Blocked("Provider did not report success.")
    if url.startswith(BASE) and data.get("success") is not True:
        raise Blocked("Cloudflare did not confirm API success.")
    return data.get("result", data) if url.startswith(BASE) else data

def bindings():
    settings = request_json(BASE + WORKER + "/settings", token)
    found = {b.get("name"): b for b in settings.get("bindings", [])
             if isinstance(b, dict) and isinstance(b.get("name"), str)}
    for name, kind in LEGACY.items():
        if found.get(name, {}).get("type") != kind:
            raise Blocked("Production binding mismatch: " + name)
    if found["CONNECTIONS_READY"].get("text") != "true":
        raise Blocked("Bubbles CONNECTIONS_READY is not true; no write attempted.")
    if found["BOT_WALLET"].get("service") != "unified-wallet":
        raise Blocked("Wallet service changed; no write attempted.")
    if found["STARQUEST_LEDGER"].get("service") != "starquest-ledger":
        raise Blocked("Ledger service changed; no write attempted.")
    return found

def public_inventory():
    return request_json(INVENTORY + "?c13b0=" + str(time.time_ns()))

def validated_inventory():
    status = public_inventory()
    counts = status.get("scopeInventory", {})
    if not status.get("ok") or status.get("configured") is not True:
        raise Blocked("Live Bubbles inventory is not configured.")
    if status.get("clientIdPrefix") != CLIENT[:16]:
        raise Blocked("Live Bubbles OAuth client differs from registered client.")
    if counts.get("supportsChunkedAllowlist") is not True:
        raise Blocked("New three-part Worker code is NOT deployed. Deploy PR #1126 first.")
    return counts

def verify_unchanged(old, new):
    for name, entry in old.items():
        actual = new.get(name)
        if not actual or actual.get("type") != entry.get("type"):
            raise Blocked("Production binding preservation failed: " + name)
        for field in ("text", "service", "environment", "namespace_id", "class_name"):
            if field in entry and entry.get(field) != actual.get(field):
                raise Blocked("Production binding changed: " + name + "/" + field)

def finish(receipt):
    global token
    token = (os.environ.get("CLOUDFLARE_API_TOKEN") or
             os.environ.get("CF_API_TOKEN") or "").strip()
    if not token:
        token = getpass.getpass("Existing Cloudflare API token (hidden): ").strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    if not re.fullmatch(r"[A-Za-z0-9._~-]{20,2048}", token):
        raise Blocked("Invalid token format. Never paste token into chat.")
    verify = request_json(BASE + "/user/tokens/verify", token)
    if verify.get("status") != "active":
        raise Blocked("The supplied token is not active.")

    before = bindings()
    live = validated_inventory()
    registration = request_json(BASE + f"/accounts/{ACCOUNT}/oauth_clients/{CLIENT}", token)
    if registration.get("client_id", registration.get("id")) != CLIENT:
        raise Blocked("Registered client ID differs.")
    if CALLBACK not in registration.get("redirect_uris", []):
        raise Blocked("Registered callback differs.")
    if "refresh_token" not in registration.get("grant_types", []):
        raise Blocked("Refresh-token grant missing; do not replace the client.")
    original = registration.get("scopes")
    if not isinstance(original, list):
        raise Blocked("Registered OAuth scope list is missing.")
    scopes = [scope for scope in original if scope not in PROTOCOL]
    if len(scopes) != 386 or len(set(scopes)) != 386 or not all(
        isinstance(s, str) and re.fullmatch(r"[a-zA-Z][a-zA-Z0-9_.-]{1,100}", s)
        for s in scopes
    ):
        raise Blocked("Registration does not contain exactly 386 unique API scopes.")

    size = (len(scopes) + 2) // 3
    chunks = [" ".join(scopes[i * size:(i + 1) * size]) for i in range(3)]
    if not all(0 < len(c.encode()) < 4800 for c in chunks):
        raise Blocked("Chunk size check failed; no write attempted.")

    receipt.update(registeredPermissions=len(scopes),
                   protocolScopes=sorted(set(original) & PROTOCOL),
                   scopeSha256=hashlib.sha256(" ".join(sorted(scopes)).encode()).hexdigest(),
                   before={k: live.get(k) for k in ("serverAllowlistCount", "signInRequestScopeCount")})
    if live.get("serverAllowlistCount") == 386 and live.get("signInRequestScopeCount") == 386:
        print("ALREADY VERIFIED: Bubbles reports 386 allowed and 386 requested scopes.")
        receipt["status"] = "already_verified"
        return True
    for i, chunk in enumerate(chunks, 1):
        receipt["writeAttempted"] = True
        name = f"CLOUDFLARE_OAUTH_ALLOWED_SCOPES_PART_{i}"
        request_json(BASE + WORKER + "/secrets", token,
                     {"name": name, "type": "secret_text", "text": chunk})
        print(f"Cloudflare accepted scope part {i}/3.")
    after = bindings()
    verify_unchanged(before, after)
    for i in range(1, 4):
        name = f"CLOUDFLARE_OAUTH_ALLOWED_SCOPES_PART_{i}"
        if after.get(name, {}).get("type") != "secret_text":
            raise Blocked(f"Part {i} missing from Worker settings readback.")
    receipt["writeConfirmed"] = True
    for attempt in range(5):
        now = validated_inventory()
        receipt["after"] = {k: now.get(k) for k in ("serverAllowlistCount", "signInRequestScopeCount")}
        if now.get("serverAllowlistCount") == 386 and now.get("signInRequestScopeCount") == 386:
            receipt["status"] = "scope_configuration_verified"
            print("VERIFIED: 386 allowed and 386 requested scopes; existing Worker bindings preserved.")
            print("Open Bubbles in Chrome and complete Cloudflare consent.")
            return True
        if attempt < 4:
            time.sleep(2)
    receipt["status"] = "installed_awaiting_live_verification"
    print("Three parts installed; live sign-in scope counts not yet verified.")
    return False

def main():
    os.umask(0o077)
    d = Path.home() / "c13b0-cloudflare"
    d.mkdir(mode=0o700, exist_ok=True)
    receipt = {"time": datetime.datetime.now(datetime.timezone.utc).isoformat(),
               "status": "blocked", "writeAttempted": False, "writeConfirmed": False}
    completed = False
    try:
        completed = finish(receipt)
    except (Blocked, KeyboardInterrupt, EOFError) as exc:
        receipt["error"] = str(exc) if isinstance(exc, Blocked) else "Stopped by owner."
        receipt["status"] = ("write_requires_verification"
                             if receipt["writeAttempted"] else "blocked_without_write")
        print("BLOCKED:", receipt["error"])
    finally:
        globals()["token"] = ""
        out = d / "finish-receipt.json"
        out.write_text(json.dumps(receipt, indent=2) + "\n")
        os.chmod(out, 0o600)
        print("Receipt:", out)
    if completed:
        opener = shutil.which("termux-open-url")
        if opener:
            subprocess.run([opener, "https://quantaphi.org/bubbles.html"],
                           check=False, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return 0 if completed else 1

if __name__ == "__main__":
    sys.exit(main())
