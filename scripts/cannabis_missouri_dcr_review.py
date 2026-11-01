#!/usr/bin/env python3
"""Fail-closed Missouri DCR public *business* license review candidate builder.

Input must be a separately obtained, current, official DCR dashboard CSV export,
normalized to the documented column names. This does NOT scrape, import to D1,
verify a consumer, or authorize publication. No person/contact columns are read.
"""
import argparse
import csv
import hashlib
import json
import re
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlsplit

SOURCE = 'https://health.mo.gov/business-professionals/cannabis-regulation/licensee-compliance-guidance/licensed-facilities'
COLUMNS = ('license_number','license_status','ato_status','facility_type','trade_name',
           'legal_name','street_address','city','state','zip','website')
LICENSE = re.compile(r'^(?:DIS|MBD)[-A-Z0-9]{3,40}$', re.I)
ZIP = re.compile(r'^\d{5}(?:-\d{4})?$')


def valid_website(value):
    if not value:
        return ''
    try:
        u = urlsplit(value)
        if u.scheme != 'https' or not u.hostname or u.username or u.password or u.port:
            return ''
        if u.hostname.lower() in ('localhost',) or u.hostname.endswith('.local'):
            return ''
        return u.geturl()
    except ValueError:
        return ''


def assess(row):
    """Return public business fields only, or a non-personal rejection reason."""
    norm = {key: str(row.get(key) or '').strip() for key in COLUMNS}
    if norm['facility_type'].casefold() != 'dispensary':
        return None, 'not_dispensary'
    if norm['license_status'].casefold() != 'active':
        return None, 'license_not_active_or_unknown'
    if norm['ato_status'].casefold() != 'approved to operate':
        return None, 'ato_not_approved_or_unknown'
    license_number = norm['license_number'].upper()
    if not LICENSE.fullmatch(license_number):
        return None, 'invalid_license_number'
    if norm['state'].upper() != 'MO':
        return None, 'wrong_state'
    if not norm['trade_name'] and not norm['legal_name']:
        return None, 'missing_business_name'
    if not norm['street_address'] or not norm['city'] or not ZIP.fullmatch(norm['zip']):
        return None, 'missing_public_facility_address'
    if any(any(ord(c)<32 for c in norm[k]) for k in ('trade_name','legal_name','street_address','city')):
        return None, 'invalid_control_character'
    if any(len(norm[k])>240 for k in ('trade_name','legal_name','street_address','city')):
        return None, 'field_too_long'
    if norm['website'] and not valid_website(norm['website']):
        return None, 'unsafe_merchant_url'
    return {
        'id': f'mo-dcr:{license_number}',
        'license_number': license_number,
        'name': norm['trade_name'] or norm['legal_name'],
        'legal_name': norm['legal_name'],
        'city': norm['city'], 'state': 'MO',
        'address': f"{norm['street_address']}, {norm['city']}, MO {norm['zip']}",
        'merchant_website': valid_website(norm['website']),
        'license_status': 'active', 'ato_status': 'approved_to_operate',
        'source_url': SOURCE,
        'record_status': 'review', 'paid_sponsor': 0,
        'quality_star': None, 'image_url': '',
    }, None


def build(raw, retrieved_at, today=None):
    today = today or datetime.now(timezone.utc).date()
    checked = date.fromisoformat(retrieved_at)
    if checked > today or checked < today - timedelta(days=45):
        raise ValueError('Official source snapshot must be no older than 45 days and not future-dated')
    text = raw.decode('utf-8-sig')
    reader = csv.DictReader(text.splitlines())
    if not reader.fieldnames or any(col not in reader.fieldnames for col in COLUMNS):
        raise ValueError('Missing explicit normalized DCR columns; never guess license/ATO fields')
    accepted, rejected, seen = [], {}, set()
    for row in reader:
        candidate, reason = assess(row)
        if candidate:
            key = candidate['id']
            if key in seen:
                raise ValueError('Duplicate license number in source snapshot; review before import')
            seen.add(key)
            accepted.append(candidate)
        else:
            rejected[reason] = rejected.get(reason, 0) + 1
    if not accepted:
        raise ValueError('No active approved-to-operate dispensaries: refuse empty publish candidate')
    return {
        'source': SOURCE, 'retrieved_at': retrieved_at,
        'sha256': hashlib.sha256(raw).hexdigest(),
        'inspected': len(accepted) + sum(rejected.values()),
        'accepted_for_manual_review': len(accepted), 'rejected': rejected,
        'import_ready': False,
        'review_required': 'Independently verify official source, address, current ATO and license status before any D1 import',
        'candidates': sorted(accepted, key=lambda x:x['id'])
    }


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input',required=True,type=Path)
    p.add_argument('--retrieved-at',required=True,help='YYYY-MM-DD official source retrieval date')
    p.add_argument('--output',required=True,type=Path)
    a=p.parse_args()
    data=build(a.input.read_bytes(),a.retrieved_at)
    if a.output.exists():
        raise SystemExit('Refusing to overwrite an existing review snapshot')
    a.output.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f"Review candidates {data['accepted_for_manual_review']} / {data['inspected']}; no D1 writes or public listing changes")

if __name__=='__main__':
    main()
