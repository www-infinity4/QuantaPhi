#!/usr/bin/env python3
"""Import a vetted Overture snapshot into ONLY the isolated QuantaPhi restaurant D1.
This script runs in protected-main GitHub Actions using an existing scoped Cloudflare token.
No merchant payments, wallet data, private profiles, or API token output.
"""
import argparse
import json
import math
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlparse

# Fixed dedicated database: NEVER accept account/wallet/ledger database IDs as inputs.
DATABASE_ID = '68388bc6-4d4b-4ca0-923f-c386c780de27'
MIN_CONFIDENCE = 0.72
MAX_ROWS = 20000
SQL = '''INSERT INTO restaurants
(id,name,city,state,category,address,latitude,longitude,website,source_url,source_name,confidence,image_url,sponsored,last_seen)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)
ON CONFLICT(id) DO UPDATE SET
name=excluded.name,city=excluded.city,state=excluded.state,category=excluded.category,
address=excluded.address,latitude=excluded.latitude,longitude=excluded.longitude,
website=excluded.website,source_url=excluded.source_url,source_name=excluded.source_name,
confidence=excluded.confidence,last_seen=excluded.last_seen,updated_at=CURRENT_TIMESTAMP'''
RECEIPT_SQL = ('INSERT OR REPLACE INTO restaurant_ingest_runs'
               '(run_id,city,state,source_name,dataset_version,records) VALUES(?,?,?,?,?,?)')

def site(value):
    if not isinstance(value,str) or len(value)>350: return ''
    try:
        u=urlparse(value)
        return value if u.scheme=='https' and u.hostname and not u.username and not u.password else ''
    except ValueError:
        return ''

def validate_snapshot(snapshot, min_rows=100):
    if (not isinstance(snapshot,dict) or snapshot.get('schema_version')!=1 or
        snapshot.get('source_name')!='Overture Maps' or snapshot.get('city')!='Denver' or
        snapshot.get('state')!='CO' or not isinstance(snapshot.get('items'),list)):
        raise ValueError('Unexpected source, city, state, or snapshot schema')
    rows=snapshot['items']
    if not min_rows<=len(rows)<=MAX_ROWS: raise ValueError('Source row-count outside approved bounds')
    ids=set()
    for x in rows:
        if not isinstance(x,dict) or x.get('city')!='Denver' or x.get('state')!='CO':
            raise ValueError('Wrong city/state record')
        if not re.fullmatch(r'overture:[0-9a-fA-F-]{36}',str(x.get('id',''))):
            raise ValueError('Missing stable Overture GERS ID')
        if x['id'] in ids: raise ValueError('Duplicate Overture ID')
        ids.add(x['id'])
        if not str(x.get('name') or '').strip() or len(str(x['name']))>160:
            raise ValueError('Missing or oversized restaurant name')
        category=str(x.get('category') or '')
        if not re.fullmatch(r'[a-z_]{3,60}',category):
            raise ValueError('Invalid restaurant category')
        if (x.get('sponsored') is not False or x.get('source_name')!='Overture Maps' or
            x.get('source_url')!='https://overturemaps.org/' or x.get('image_url')!=''):
            raise ValueError('Unverified ad/photo/source provenance')
        try:
            lat=float(x['latitude']);lon=float(x['longitude']);confidence=float(x['confidence'])
        except (TypeError,ValueError,KeyError):
            raise ValueError('Invalid coordinate/confidence')
        if not (math.isfinite(lat) and math.isfinite(lon) and
                39.60<=lat<=39.92 and -105.12<=lon<=-104.69 and
                math.isfinite(confidence) and MIN_CONFIDENCE<=confidence<=1):
            raise ValueError('Outside Denver bounds or invalid confidence')
        raw=x.get('website') or ''
        if raw and not site(raw): raise ValueError('Unsafe restaurant website')
    return rows

def upsert_statement(x, generated_at):
    fields=(x['id'],x['name'],'Denver','CO',x['category'],str(x.get('address') or '')[:240],
        float(x['latitude']),float(x['longitude']),site(x.get('website','')),
        'https://overturemaps.org/','Overture Maps',float(x['confidence']),'',generated_at)
    return SQL, list(fields)

def batch(rows, size=20):
    if size<=0 or size>100: raise ValueError('Invalid batch size')
    for i in range(0,len(rows),size):yield rows[i:i+size]

def query(account_id,token,statements):
    body=json.dumps({'batch':statements},separators=(',',':')).encode()
    url=f'https://api.cloudflare.com/client/v4/accounts/{account_id}/d1/database/{DATABASE_ID}/query'
    request=urllib.request.Request(url,data=body,method='POST',
        headers={'Authorization':'Bearer '+token,'Content-Type':'application/json',
                 'User-Agent':'QuantaPhi-Restaurant-Directory/1.0'})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(request,timeout=45) as resp:
                data=json.load(resp)
            if data.get('success') is not True or any(not x.get('success') for x in data.get('result',[])):
                raise RuntimeError('D1 query rejected')
            return data
        except urllib.error.HTTPError as error:
            if error.code not in (429,500,502,503,504) or attempt==4:
                raise RuntimeError(f'D1 HTTP error {error.code}') from None
        except (urllib.error.URLError,TimeoutError):
            if attempt==4:raise RuntimeError('D1 API unreachable') from None
        time.sleep(min(10,2**attempt))
    raise RuntimeError('D1 upload exhausted retries')

def import_snapshot(path,account_id,token):
    doc=json.loads(Path(path).read_text(encoding='utf-8'))
    rows=validate_snapshot(doc)
    generated_at=doc.get('generated_at')
    if not isinstance(generated_at,str) or len(generated_at)>40 or not generated_at.endswith('Z'):
        raise ValueError('Snapshot generation timestamp missing')
    if not re.fullmatch(r'2026-\d\d-\d\d[.\w:T-]*Z',generated_at):
        raise ValueError('Invalid snapshot version timestamp')
    if not re.fullmatch(r'[a-f0-9]{32}',account_id):
        raise ValueError('Cloudflare account ID is required')
    if len(token)<20:
        raise ValueError('Scoped Cloudflare API token is missing')
    print(f'Validated {len(rows)} independently sourced Denver restaurants; starting isolated D1 upload.',flush=True)
    for index,group in enumerate(batch(rows),1):
        statements=[]
        for x in group:
            sql,values=upsert_statement(x,generated_at)
            statements.append({'sql':sql,'params':values})
        query(account_id,token,statements)
        if index%20==0 or index==math.ceil(len(rows)/20):
            print(f'D1 inserted/updated: {min(index*20,len(rows))} / {len(rows)}',flush=True)
    query(account_id,token,[{'sql':RECEIPT_SQL,
        'params':[generated_at,'Denver','CO','Overture Maps',str(doc.get('dataset_version') or '')[:60],len(rows)]}])
    print(f'Completed isolated D1 import: {len(rows)} Overture records. Source snapshot {generated_at}.',flush=True)
    return len(rows)

def main():
    p=argparse.ArgumentParser()
    p.add_argument('--input',default='data/restaurants/denver-co.json')
    args=p.parse_args()
    try:
        import_snapshot(args.input,os.getenv('CLOUDFLARE_ACCOUNT_ID',''),os.getenv('CLOUDFLARE_API_TOKEN',''))
    except Exception as exc:
        print(f'RESTAURANT_D1_SYNC_BLOCKED: {exc}',file=sys.stderr)
        return 1
    return 0

if __name__=='__main__':sys.exit(main())
