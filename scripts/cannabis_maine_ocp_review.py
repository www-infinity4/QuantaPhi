#!/usr/bin/env python3
"""Fail-closed Maine OCP active adult-use store review manifest (NO D1 writes).

Input is a separately retrieved official OCP adult-use CSV, normalized to
business-only column names documented in docs/CANNABIS-ME-OCP-REVIEW.md.
Owner/principal/contact columns are never copied. No synthetic test store is
an actual listing. Active license is not a live-operating-hours guarantee.
"""
import argparse
import csv
import hashlib
import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit

SOURCE='https://www1.maine.gov/dafs/ocp/open-data/adult-use/licensee-search'
COLUMNS=('license_number','license_status','license_type','expiration_date',
         'business_name','street_address','city','state','zip','website')
LICENSE=re.compile(r'^AMS\d{2,10}$',re.I)
ZIP=re.compile(r'^\d{5}(?:-\d{4})?$')

def safe_site(value):
    if not value:return ''
    try:
        u=urlsplit(value)
        host=(u.hostname or '').lower()
        if (u.scheme!='https' or not host or u.username or u.password or u.port
                or host=='localhost' or host.endswith('.local') or '.' not in host):
            return ''
        return u.geturl() if len(u.geturl())<=400 else ''
    except ValueError:return ''

def assess(row,today):
    """Allowlist only public business fields; return (candidate, rejection code)."""
    n={k:str(row.get(k) or '').strip() for k in COLUMNS}
    if n['license_type'].casefold() not in ('store','cannabis store','adult use store'):
        return None,'not_adult_use_store'
    if n['license_status'].casefold()!='active':
        return None,'license_not_active'
    lic=n['license_number'].upper()
    if not LICENSE.fullmatch(lic):return None,'invalid_store_license'
    try:expiry=date.fromisoformat(n['expiration_date'])
    except ValueError:return None,'missing_or_invalid_expiration'
    if expiry<=today:return None,'expired_license'
    if n['state'].upper()!='ME':return None,'wrong_state'
    if not n['business_name'] or not n['street_address'] or not n['city'] or not ZIP.fullmatch(n['zip']):
        return None,'missing_public_business_address'
    if any(len(n[k])>240 or any(ord(c)<32 for c in n[k]) for k in ('business_name','street_address','city')):
        return None,'invalid_public_business_field'
    if n['website'] and not safe_site(n['website']):return None,'unsafe_merchant_url'
    return {
        'id':'me-ocp:'+lic,'license_number':lic,'name':n['business_name'],
        'city':n['city'],'state':'ME',
        'address':f"{n['street_address']}, {n['city']}, ME {n['zip']}",
        'merchant_website':safe_site(n['website']),
        'license_status':'active','expiration_date':expiry.isoformat(),
        'source_url':SOURCE,'record_status':'review',
        'paid_sponsor':0,'quality_star':None,'image_url':''
    },None

def build(raw,retrieved_at,today=None):
    today=today or datetime.now(timezone.utc).date()
    checked=date.fromisoformat(retrieved_at)
    if checked>today or checked<today-timedelta(days=45):
        raise ValueError('Official source snapshot must be within 45 days and not future-dated')
    reader=csv.DictReader(raw.decode('utf-8-sig').splitlines())
    if not reader.fieldnames or any(c not in reader.fieldnames for c in COLUMNS):
        raise ValueError('Missing explicit normalized OCP business columns; never guess raw fields')
    accepted,rejected,seen=[],{},set()
    for row in reader:
        item,reason=assess(row,today)
        if item:
            if item['id'] in seen:raise ValueError('Duplicate license in source snapshot')
            seen.add(item['id']);accepted.append(item)
        else:rejected[reason]=rejected.get(reason,0)+1
    if not accepted:raise ValueError('No active unexpired Maine stores: refuse empty candidate manifest')
    return {'source':SOURCE,'retrieved_at':retrieved_at,'sha256':hashlib.sha256(raw).hexdigest(),
            'inspected':len(accepted)+sum(rejected.values()),
            'accepted_for_manual_review':len(accepted),'rejected':rejected,
            'import_ready':False,
            'review_required':'Recheck official OCP active license, expiry, physical store address and local rules before D1 import',
            'candidates':sorted(accepted,key=lambda x:x['id'])}

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input',required=True,type=Path)
    p.add_argument('--retrieved-at',required=True)
    p.add_argument('--output',required=True,type=Path)
    args=p.parse_args()
    data=build(args.input.read_bytes(),args.retrieved_at)
    if args.output.exists():raise SystemExit('Refusing to overwrite existing review manifest')
    args.output.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f"Manual-review candidates: {data['accepted_for_manual_review']} / {data['inspected']}; no D1 writes")
if __name__=='__main__':main()
