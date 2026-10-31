#!/usr/bin/env python3
"""Read-only Cloudflare OAuth registration contract audit. No credentials printed."""
import json,os,urllib.request,urllib.error,sys
ACCOUNT='ef25728c096c6ba92cf510caa2058003'
CLIENT='8f676e020d9ff91a2951e415d144c9b7'
CALLBACK='https://quantaphi.org/api/bubbles/connections/cloudflare/callback'
token=os.environ.get('CLOUDFLARE_API_TOKEN','')
if len(token)<20:
 print('BLOCKED: Cloudflare token not configured')
 sys.exit(1)
req=urllib.request.Request(
 f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/oauth_clients/{CLIENT}',
 headers={'Authorization':'Bearer '+token,'Accept':'application/json','User-Agent':'Bubbles-Read-Only-OAuth-Audit'})
try:
 with urllib.request.urlopen(req,timeout=20) as r: data=json.load(r)
except urllib.error.HTTPError as exc:
 print('BLOCKED: OAuth Client Read returned HTTP',exc.code)
 sys.exit(1)
except Exception:
 print('BLOCKED: OAuth client read unavailable')
 sys.exit(1)
if data.get('success') is not True or not isinstance(data.get('result'),dict):
 print('BLOCKED: OAuth client registration read not successful')
 sys.exit(1)
client=data['result']
scopes=client.get('scopes') or []
protocol={'openid','offline','offline_access'}
regular=[s for s in scopes if s not in protocol]
method=client.get('token_endpoint_auth_method')
responses=client.get('response_types') or []
grants=client.get('grant_types') or []
redirects=client.get('redirect_uris') or []
optional=client.get('optional_scopes') or []
print('OAuth client registration contract (no secrets):')
print('  client matches:',client.get('client_id',client.get('id'))==CLIENT)
print('  visibility:',client.get('visibility','unknown'))
print('  token endpoint auth method:',method)
print('  authorization code enabled:','authorization_code' in grants and 'code' in responses)
print('  refresh token enabled:','refresh_token' in grants)
print('  callback exactly registered:',CALLBACK in redirects)
print('  registered API scope count:',len(regular))
print('  protocol scope flags:',','.join(sorted(set(scopes)&protocol)) or 'none')
print('  optional API scope count:',len([s for s in optional if s not in protocol]))
print('  all required by client:',len(optional)==0)
print('  token exchange implementation uses client_secret_basic')
# Client config is not authorization; no sign-in, token exchange or approvals are asserted.
problems=[]
if client.get('client_id',client.get('id'))!=CLIENT:problems.append('client_id_mismatch')
if CALLBACK not in redirects:problems.append('callback_mismatch')
if 'authorization_code' not in grants or 'code' not in responses:problems.append('authorization_code_disabled')
if method!='client_secret_basic':problems.append('server_token_method_mismatch')
if len(regular)!=386:problems.append('scope_count_mismatch')
if len(set(regular))!=len(regular):problems.append('duplicate_scopes')
if 'user-details.read' not in regular:problems.append('verified_user_details_scope_missing')
print('  identity strategy: Cloudflare User Details API with user-details.read; OpenID not required')
print('contract:', 'PASS' if not problems else 'CHECK_REQUIRED: '+','.join(problems))
sys.exit(0 if not problems else 2)
