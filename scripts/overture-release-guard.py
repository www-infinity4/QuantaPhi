#!/usr/bin/env python3
"""Fail closed when Overture STAC latest differs from the reviewed metro manifest.

The official CLI downloads the current STAC release rather than accepting a
release pin. Check immediately before and after downloading to avoid silently
labeling a new dataset with an older manifest version.
"""
import argparse
import json
import re
from urllib.request import Request, urlopen

CATALOG = 'https://stac.overturemaps.org/catalog.json'
RELEASE_RE = re.compile(r'20\d{2}-\d{2}-\d{2}\.\d+\Z')


def verify_release(catalog, expected):
    if not isinstance(expected, str) or not RELEASE_RE.fullmatch(expected):
        raise ValueError('Invalid pinned Overture release')
    actual = catalog.get('latest') if isinstance(catalog, dict) else None
    if not isinstance(actual, str) or not RELEASE_RE.fullmatch(actual):
        raise ValueError('Missing or invalid Overture STAC latest release')
    if actual != expected:
        raise ValueError(f'Overture release changed: expected {expected}, latest {actual}; refusing mislabeled source snapshot')
    return actual


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--expected', required=True)
    args = parser.parse_args()
    request = Request(CATALOG, headers={'Accept': 'application/json', 'User-Agent': 'QuantaPhi-source-release-guard/1'})
    with urlopen(request, timeout=20) as response:
        catalog = json.load(response)
    actual = verify_release(catalog, args.expected)
    print(f'Verified Overture STAC latest release: {actual}')


if __name__ == '__main__':
    main()
