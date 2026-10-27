#!/usr/bin/env python3
"""C13b0 native-Termux Cloudflare device login (no Wrangler or workerd).

Implements the public OAuth device grant used by Cloudflare's Wrangler CLI.
Uses Wrangler's published public OAuth client ID and documented scope catalog.
Never displays the access token or refresh token.
"""
import json
import os
import pathlib
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

CLIENT_ID = "54d11594-84e4-41aa-b438-e81b8fa78ee7"
ACCOUNT_ID = "ef25728c096c6ba92cf510caa2058003"
OAUTH_CLIENT_ID = "8f676e020d9ff91a2951e415d144c9b7"
AUTH_ROOT = "https://dash.cloudflare.com"
API_ROOT = "https://api.cloudflare.com/client/v4"
DEVICE_ENDPOINT = AUTH_ROOT + "/oauth2/device/auth"
TOKEN_ENDPOINT = AUTH_ROOT + "/oauth2/token"
APPROVAL_ENDPOINT = AUTH_ROOT + "/oauth2/device"
TOKEN_PATH = pathlib.Path.home() / "c13b0-cloudflare" / "wrangler-device-session.json"

# Exact public Wrangler default scope keys from cloudflare/workers-sdk's
# packages/workers-auth/src/core/scopes.ts. These are NOT Bubbles' 386 scopes.
SCOPES = (
    "k2.read", "k2.write", "account:read", "user:read",
    "workers:write", "workers_kv:write", "workers_routes:write",
    "workers_scripts:write", "workers_tail:read", "d1:write",
    "pages:write", "zone:read", "ssl_certs:write", "ai:write",
    "ai-search:write", "ai-search:run", "agent-memory:write",
    "queues:write", "pipelines:write", "secrets_store:write",
    "artifacts:write", "flagship:write", "containers:write",
    "cloudchamber:write", "connectivity:admin",
    "email_routing:write", "email_sending:write",
    "browser:write", "challenge-widgets.write",
)


def request_json(url, payload=None, token=None):
    """Return (status, JSON data), including HTTP 4xx without leaking secrets."""
    if not (url.startswith(AUTH_ROOT + "/oauth2/") or
            url.startswith(API_ROOT + "/")):
        raise RuntimeError("Refusing an untrusted URL")
    headers = {"Accept": "application/json", "User-Agent": "c13b0-termux-cloudflare-oauth/1"}
    body = None
    if payload is not None:
        body = urllib.parse.urlencode(payload).encode("ascii")
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(url, data=body, headers=headers,
                                 method="POST" if body is not None else "GET")
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            status, raw = resp.status, resp.read(200000)
    except urllib.error.HTTPError as exc:
        status, raw = exc.code, exc.read(200000)
    try:
        data = json.loads(raw)
    except (ValueError, UnicodeError):
        data = {}
    return status, data if isinstance(data, dict) else {}


def save(data):
    TOKEN_PATH.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    os.chmod(TOKEN_PATH.parent, 0o700)
    temp = TOKEN_PATH.with_name(TOKEN_PATH.name + ".tmp")
    fd = os.open(temp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as writer:
            json.dump(data, writer, separators=(",", ":"))
        os.replace(temp, TOKEN_PATH)
        os.chmod(TOKEN_PATH, 0o600)
    finally:
        if temp.exists():
            temp.unlink()


def valid_token(data):
    return (isinstance(data.get("access_token"), str) and
            len(data["access_token"]) > 20 and
            isinstance(data.get("expires_in"), (int, float)) and
            data["expires_in"] > 0)


def stored():
    if not TOKEN_PATH.is_file():
        raise RuntimeError("No Termux Cloudflare session. Run the login command first.")
    data = json.loads(TOKEN_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise RuntimeError("Invalid stored credential data")
    if time.time() < float(data.get("expires_at", 0)) - 60:
        return data
    if not data.get("refresh_token"):
        raise RuntimeError("Cloudflare session expired and cannot refresh. Sign in again.")
    status, next_data = request_json(TOKEN_ENDPOINT, {
        "grant_type": "refresh_token",
        "client_id": CLIENT_ID,
        "refresh_token": data["refresh_token"],
    })
    if status != 200 or not valid_token(next_data):
        raise RuntimeError("Cloudflare refresh failed (HTTP " + str(status) + "). Sign in again.")
    next_data["refresh_token"] = next_data.get("refresh_token") or data["refresh_token"]
    next_data["expires_at"] = time.time() + next_data["expires_in"]
    save(next_data)
    return next_data


def check(token):
    code, data = request_json(API_ROOT + "/user", token=token)
    if code != 200 or data.get("success") is not True:
        raise RuntimeError("Cloudflare identity verification failed (HTTP " + str(code) + ")")
    print("CLOUDFLARE USER AUTHENTICATED: YES", flush=True)
    probes = (
        ("Bubbles Worker settings",
         API_ROOT + "/accounts/" + ACCOUNT_ID + "/workers/scripts/bubbles-connections/settings"),
        ("OAuth Client Read",
         API_ROOT + "/accounts/" + ACCOUNT_ID + "/oauth_clients/" + OAUTH_CLIENT_ID),
    )
    for name, url in probes:
        http, result = request_json(url, token=token)
        print(name + ": HTTP " + str(http), flush=True)
        if name == "OAuth Client Read" and http == 200:
            reg = result.get("result") or {}
            print("Registered scopes:", len(reg.get("scopes") or []))
            print("Optional scopes:", len(reg.get("optional_scopes") or []))
    print("TOKEN KEPT PRIVATE: YES", flush=True)


def login():
    print("=== CLOUDFLARE DEVICE SIGN-IN (NATIVE TERMUX) ===", flush=True)
    print("Uses Cloudflare's public Wrangler OAuth app, not Bubbles' OAuth client.", flush=True)
    code, data = request_json(DEVICE_ENDPOINT, {
        "client_id": CLIENT_ID,
        "scope": " ".join(SCOPES + ("offline_access",)),
    })
    if code != 200:
        print("Cloudflare device authorization HTTP:", code, flush=True)
        print("Cloudflare error:", str(data.get("error") or "unspecified")[:70], flush=True)
        return 2
    user_code, device_code = data.get("user_code"), data.get("device_code")
    verify = data.get("verification_uri") or APPROVAL_ENDPOINT
    target = urllib.parse.urlparse(verify)
    if (not isinstance(user_code, str) or not user_code or
        not isinstance(device_code, str) or not device_code or
        target.scheme != "https" or target.hostname != "dash.cloudflare.com" or
        target.path != "/oauth2/device"):
        print("Cloudflare returned an invalid verification URL or code. Aborted.")
        return 3
    maximum = min(max(float(data.get("expires_in") or 300), 1), 300)
    interval = max(float(data.get("interval") or 5), 1)
    approval_url = APPROVAL_ENDPOINT + "?" + urllib.parse.urlencode({"user_code": user_code})
    print("", flush=True)
    print("=== YOUR CLOUDFLARE APPROVAL CODE ===", flush=True)
    print(user_code, flush=True)
    print("Open in Chrome:", approval_url, flush=True)
    print("Approve the requested Wrangler access on Cloudflare.", flush=True)
    print("Keep Termux running until authorization completes.", flush=True)
    print("", flush=True)
    if "--open" in sys.argv:
        import shutil
        opener = shutil.which("termux-open-url")
        if opener:
            subprocess.Popen([opener, approval_url],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    deadline = time.monotonic() + maximum
    while time.monotonic() < deadline:
        time.sleep(min(interval, max(0, deadline - time.monotonic())))
        try:
            status, result = request_json(TOKEN_ENDPOINT, {
                "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
                "device_code": device_code,
                "client_id": CLIENT_ID,
            })
        except (urllib.error.URLError, TimeoutError):
            print("Temporary network error; retrying.", flush=True)
            continue
        failure = result.get("error")
        if failure == "authorization_pending":
            continue
        if failure == "slow_down":
            interval += 5
            continue
        if failure:
            print("Cloudflare device login error:", str(failure)[:70], flush=True)
            return 4
        if status == 200 and valid_token(result):
            result["expires_at"] = time.time() + result["expires_in"]
            check(result["access_token"])
            save(result)
            print("SUCCESS: Termux Cloudflare credential saved in its private directory.", flush=True)
            print("For future verification run: python ~/c13b0-cloudflare/device-login.py --check", flush=True)
            return 0
        if status < 500 and status != 429:
            print("Cloudflare device login HTTP:", status, flush=True)
            return 5
    print("The approval code expired. Run the command again to obtain a new code.", flush=True)
    return 6


def main():
    os.umask(0o077)
    if "--check" in sys.argv:
        check(stored()["access_token"])
    elif "--logout" in sys.argv:
        TOKEN_PATH.unlink(missing_ok=True)
        print("Local Termux session file deleted. Cloudflare authorization was not revoked.")
    else:
        return login()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, urllib.error.URLError, OSError, ValueError) as exc:
        print("C13B0 ERROR:", str(exc).replace("\n", " ")[:240], file=sys.stderr)
        sys.exit(1)
