#!/usr/bin/env python3
"""C13b0 read-only Bubbles Cloudflare sign-in live-route audit for Termux.

No owner tokens. No wallet changes. Never interprets public configuration
or source code as proof of a successful browser OAuth login.
"""
import datetime
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request

BASE = "https://quantaphi.org"
STAMP = str(int(time.time()))
RECEIPT = Path.home() / "c13b0-cloudflare" / "signin-live-receipt.json"
HEADERS = {"User-Agent": "C13b0-Bubbles-Owner-LiveCheck/1.0",
           "Accept": "*/*",
           "Cache-Control": "no-cache"}
checks = []
def check(name, fn):
    try:
        detail = fn()
        print("PASS:", name)
        checks.append({"check": name, "status": "pass", "detail": detail})
        return detail
    except Exception as exc:
        reason = str(exc)[:180]
        print("BLOCKED:", name, "-", reason)
        checks.append({"check": name, "status": "blocked", "detail": reason})
        return None

def get(path, origin=False):
    url=BASE+path
    headers=dict(HEADERS)
    if origin:
        headers["Origin"]=BASE
    req=urllib.request.Request(url,headers=headers)
    try:
        with urllib.request.urlopen(req,timeout=20) as r:
            raw=r.read(350000)
            return r.status,dict(r.headers),raw.decode('utf-8','replace'),r.geturl()
    except urllib.error.HTTPError as exc:
        return exc.code,dict(exc.headers),exc.read(350000).decode('utf-8','replace'),url

def scope():
    code,headers,body,url=get('/api/bubbles/connections/scope-inventory?c13b0='+STAMP)
    if code!=200:raise Exception('scope inventory HTTP '+str(code))
    data=json.loads(body)
    item=data.get('scopeInventory') or {}
    if data.get('configured') is not True or item.get('serverAllowlistCount')!=386 or item.get('signInRequestScopeCount')!=386:
        raise Exception('live scope inventory not 386/386')
    return {"allowed":386,"requested":386}

def frontend():
    code,headers,body,url=get('/bubbles.html?c13b0='+STAMP)
    if code!=200:raise Exception('Bubbles page HTTP '+str(code))
    if not re.search(r'id="bubblesCloudflareSignIn"',body):
        raise Exception('Cloudflare button not in served Bubbles HTML')
    if re.search(r'<button[^>]*id="bubblesCloudflareSignIn"[^>]*\bdisabled\b',body):
        raise Exception('Cloudflare button is disabled in delivered HTML')
    match=re.search(r"import\('(/bubbles-signin-gate\.mjs[^']*)'\)",body)
    if not match:raise Exception('Sign-in gate import not in delivered HTML')
    return {"module":match.group(1),"button":"present_and_not_disabled"}

def javascript():
    html=next((e.get('detail') for e in checks if e['check']=='live Bubbles button' and e['status']=='pass'),None)
    if not html:raise Exception('Bubbles page unavailable')
    module=html['module']
    code,headers,body,url=get(module+'&c13b0='+STAMP if '?' in module else module+'?c13b0='+STAMP)
    if code!=200:raise Exception('Sign-in JS HTTP '+str(code))
    if "fullCloudflare?['owner.full']" not in body:
        raise Exception('Expected registered 386-scope sign-in code is not live')
    if 'Sign in and authorize 386 Cloudflare permissions' not in body:
        raise Exception('Explicit 386-scope Cloudflare sign-in label is not live')
    if 'client.resumePending(' not in body:
        raise Exception('Android/Chrome OAuth return recovery not present')
    return {"fullRequiredScopeConsent":True,"scopeCountDisclosed":386,"returnHandler":True}

def callback():
    code,headers,body,url=get('/api/bubbles/connections/cloudflare/callback?result=failed&c13b0='+STAMP)
    if code!=200:raise Exception('Callback landing page HTTP '+str(code))
    if 'Return to Bubbles' not in body or 'authorization could not be received' not in body:
        raise Exception('Callback did not preserve the failure explanation')
    if 'bubbles-auth-return.mjs' not in body:
        raise Exception('OAuth return handler is missing')
    return {"status":code,"failedReturn":"visible","tokensVisible":False}

def api():
    code,headers,body,url=get('/api/bubbles/connections/health?c13b0='+STAMP)
    if code!=200:raise Exception('Bubbles Worker health HTTP '+str(code))
    data=json.loads(body)
    if data.get('ok') is not True or data.get('service')!='bubbles-connections':
        raise Exception('Site not routing to Bubbles connections worker')
    return {"service":data['service']}

def protected():
    code,headers,body,url=get('/api/bubbles/connections/gate/status?c13b0='+STAMP,True)
    if code!=401:raise Exception('Unauthenticated gate status HTTP '+str(code)+' instead of 401')
    data=json.loads(body)
    if data.get('error')!='verified_wallet_required':
        raise Exception('Unexpected unauthenticated account gate response')
    return {"requiresWallet":True,"noBypass":True}

check('Bubbles routed to Cloudflare service',api)
check('registered 386 OAuth scopes',scope)
check('live Bubbles button',frontend)
check('live registered-scope JavaScript',javascript)
check('Cloudflare callback failure visibility',callback)
check('wallet-bound gate enforcement',protected)
RECEIPT.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
receipt={"timestamp":datetime.datetime.now(datetime.timezone.utc).isoformat(),
         "status":"public_path_verified_not_user_signed_in" if all(c['status']=='pass' for c in checks) else "public_path_blocked",
         "checks":checks,
         "note":"Public routes cannot prove owner Chrome OAuth callback or account connection."}
old=os.umask(0o077)
try:RECEIPT.write_text(json.dumps(receipt,indent=2)+"\n",encoding='utf-8')
finally:os.umask(old)
os.chmod(RECEIPT,0o600)
print("\nReceipt:",RECEIPT)
print("Outcome:",receipt['status'])
if receipt["status"]=="public_path_verified_not_user_signed_in":
    print("These checks passed; actual browser OAuth still requires confirmation.")
    url=BASE+'/bubbles.html?signin=required386-1134'
    try:
        opener=subprocess.run(['am','start','-a','android.intent.action.VIEW',
            '-d',url,'-p','com.android.chrome'],capture_output=True,timeout=10)
        if opener.returncode!=0:
            print("Open in Chrome:",url)
    except (OSError,subprocess.TimeoutExpired):
        print("Open in Chrome:",url)
else:
    print("STOP: Frontend or server did not pass live readback. Do not repeat OAuth yet.")
sys.exit(0 if receipt['status']=='public_path_verified_not_user_signed_in' else 1)
