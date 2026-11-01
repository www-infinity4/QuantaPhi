#!/usr/bin/env python3
"""Normalize Overture Places GeoJSON into bounded public restaurant records.
No scraping, no purchased APIs, no fabricated imagery/reviews/advertisements.
Usage: python scripts/restaurant-directory-import.py --input /tmp/denver.geojson
"""
import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

BBOX = (-105.12, 39.60, -104.69, 39.92)  # Denver metro discovery area
MIN_CONFIDENCE = .72
FOOD_CATEGORIES = {'restaurant', 'cafe', 'coffee_shop', 'diner', 'casual_eatery', 'fast_food_restaurant',
                   'bakery', 'sandwich_shop', 'pizza_restaurant', 'food_truck', 'ice_cream_shop'}

def safe_site(raw):
    if isinstance(raw, list): raw = next((v for v in raw if isinstance(v, str)), '')
    if isinstance(raw, dict): raw = raw.get('url', '')
    if not isinstance(raw, str) or len(raw) > 300: return ''
    p = urlparse(raw)
    return raw if p.scheme == 'https' and p.hostname and not p.username and not p.password else ''

def address_text(value):
    row = value[0] if isinstance(value, list) and value else {}
    if not isinstance(row, dict): return ''
    text = row.get('freeform') or ' '.join(str(row.get(x) or '') for x in ('number', 'street')).strip()
    if not text: return ''
    return re.sub(r'\s+', ' ', str(text).strip())[:240]

def normalize(feature):
    p = feature.get('properties') or {}
    tax = p.get('taxonomy') or {}
    hierarchy = tax.get('hierarchy') or []
    primary = tax.get('primary') or p.get('basic_category') or ''
    # The hierarchy is authoritative when supplied. A contradictory basic_category
    # must never turn a school/clinic/retail store into a restaurant listing.
    if isinstance(hierarchy, list) and hierarchy:
        food = ('restaurant' in hierarchy or
                (hierarchy[0] == 'food_and_drink' and primary in FOOD_CATEGORIES))
    else:
        food = primary in FOOD_CATEGORIES
    if not food:
        return None
    if str(p.get('operating_status', '')).lower() in {'permanently_closed', 'closed_permanently'}:
        return None
    try:
        conf = float(p.get('confidence') or 0)
        lon, lat = (feature.get('geometry') or {}).get('coordinates')[:2]
        lat, lon = float(lat), float(lon)
    except (ValueError, TypeError, IndexError):
        return None
    if conf < MIN_CONFIDENCE or not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
        return None
    name_field = p.get('names') or {}
    name = name_field.get('primary', '') if isinstance(name_field, dict) else ''
    if isinstance(name, dict): name = name.get('value', '')
    name = re.sub(r'\s+', ' ', str(name).strip())[:160]
    identity = str(p.get('id') or feature.get('id') or '').strip()
    if not name or not re.fullmatch('[a-zA-Z0-9-]{10,}', identity): return None
    category = re.sub('[^a-z_]', '', str(primary).lower())[:60] or 'restaurant'
    return {
        'id': 'overture:' + identity, 'name': name, 'city': 'Denver', 'state': 'CO',
        'category': category, 'address': address_text(p.get('addresses')),
        'latitude': lat, 'longitude': lon, 'website': safe_site(p.get('websites')),
        'source_name': 'Overture Maps', 'source_url': 'https://overturemaps.org/',
        'confidence': conf, 'image_url': '', 'sponsored': False,
    }

def build(features, version='2026-10-21.0', clock=None):
    result, seen = [], set()
    for feature in features:
        row = normalize(feature)
        if row is None: continue
        fingerprint = (row['name'].lower(), round(row['latitude'], 4), round(row['longitude'], 4))
        if fingerprint in seen: continue
        seen.add(fingerprint)
        result.append(row)
    result.sort(key=lambda x: (x['name'].casefold(), x['id']))
    return {'schema_version': 1, 'source_name': 'Overture Maps', 'dataset_version': version,
            'city': 'Denver', 'state': 'CO',
            'generated_at': clock or datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            'items': result}

def read_geojson(path):
    raw = json.loads(Path(path).read_text(encoding='utf-8'))
    if raw.get('type') != 'FeatureCollection' or not isinstance(raw.get('features'), list):
        raise ValueError('Expected Overture GeoJSON FeatureCollection')
    return raw['features']

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', default='data/restaurants/denver-co.json')
    parser.add_argument('--release', default='2026-10-21.0')
    args = parser.parse_args()
    payload = build(read_geojson(args.input), args.release)
    if len(payload['items']) < 100:
        raise SystemExit('Refusing to publish fewer than 100 high-confidence Denver restaurants')
    dest = Path(args.output)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(f'Denver source-backed records: {len(payload["items"])}')

if __name__ == '__main__': main()
