#!/usr/bin/env python3
"""Guarded one-time OAuth client repair, retaining all 386 registered scopes."""
import json
import os
import sys
import urllib.error
import urllib.request

ACCOUNT = "ef25728c096c6ba92cf510caa2058003"
CLIENT = "8f676e020d9ff91a2951e415d144c9b7"
CALLBACK = "https://quantaphi.org/api/bubbles/connections/cloudflare/callback"
PROTOCOL = {"openid", "offline", "offline_access"}
IDENTITY = {"user-details.read", "memberships.read"}
API = "https://api.cloudflare.com/client/v4/accounts/" + ACCOUNT + "/oauth_clients/" + CLIENT
TOKEN = os.getenv("CLOUDFLARE_API_TOKEN", "")
if len(TOKEN) < 20:
    print("BLOCKED: No saved Cloudflare API token; OAuth client unchanged.")
    sys.exit(2)

def request(method, payload=None):
    data = json.dumps(payload,separators=(",",":")).encode() if payload is not None else None
    headers = {"Authorization":"Bearer "+TOKEN,"Accept":"application/json"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    req=urllib.request.Request(API,data=data,headers=headers,method=method)
    try:
        with urllib.request.urlopen(req,timeout=25) as response:
            obj=json.load(response)
        if obj.get("success") is not True:
            raise RuntimeError("Cloudflare "+method+" unsuccessful")
        return obj.get("result",{})
    except urllib.error.HTTPError as exc:
        if exc.code in (401,403):
            print("BLOCKED: Cloudflare "+method+" HTTP "+str(exc.code)+
                ". Existing token needs Account > OAuth Client > "+
                ("Edit" if method=="PATCH" else "Read")+".")
            sys.exit(3)
        print("BLOCKED: Cloudflare "+method+" HTTP "+str(exc.code)+".")
        sys.exit(4)

before = request("GET")
all_scopes = before.get("scopes") or []
allowed = [s for s in all_scopes if s not in PROTOCOL]
current_optional = before.get("optional_scopes") or []
if (before.get("client_id",before.get("id")) != CLIENT or
    len(allowed) != 386 or len(set(allowed)) != 386 or
    not IDENTITY.issubset(set(allowed)) or
    CALLBACK not in (before.get("redirect_uris") or []) or
    before.get("token_endpoint_auth_method") != "client_secret_basic" or
    "authorization_code" not in (before.get("grant_types") or []) or
    "refresh_token" not in (before.get("grant_types") or [])):
    print("BLOCKED: Existing OAuth client differs from the verified Bubbles contract.")
    sys.exit(5)
desired = [s for s in allowed if s not in IDENTITY]
print("OAuth preflight: 386 registered; identity scopes user-details.read and memberships.read.")
print("Optional scopes before:",len(current_optional))
print("Optional scopes intended:",len(desired))
if set(current_optional)==set(desired):
    print("NO CHANGE: 386 registered, two identity scopes required, 384 optional.")
else:
    # PATCH only optional_scopes. Never change IDs, scopes, callbacks, grants,
    # client secrets, visibility, or owner settings.
    request("PATCH",{"optional_scopes":desired})
    print("Cloudflare accepted the optional-scope-only update.")
after=request("GET")
after_scopes = [s for s in (after.get("scopes") or []) if s not in PROTOCOL]
after_optional = after.get("optional_scopes") or []
if (after_scopes != allowed or set(after_optional)!=set(desired) or
    after.get("redirect_uris")!=before.get("redirect_uris") or
    after.get("grant_types")!=before.get("grant_types") or
    after.get("token_endpoint_auth_method")!=before.get("token_endpoint_auth_method") or
    after.get("client_id",after.get("id"))!=CLIENT):
    print("BLOCKED: Post-write OAuth registration preservation check failed.")
    sys.exit(6)
print("VERIFIED: All 386 Cloudflare scopes registered; identity required 2; toolkit optional 384.")
print("VERIFIED: OAuth client ID, redirect URLs, grants and token method preserved.")
print("NOTE: Configuration verified, not owner sign-in.")
