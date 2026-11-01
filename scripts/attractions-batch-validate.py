#!/usr/bin/env python3
"""Fail-closed review gate for four Overture Colorado attraction source shards.

No database writes, sponsorship, inferred photos, or publishing.
"""
import argparse
import json
import math
import re
from pathlib import Path

RELEASE = re.compile(r"20\d{2}-\d{2}-\d{2}\.\d+\Z")
SHARDS = {"nw", "ne", "sw", "se"}


def validate(files, minimum=24):
    files = [Path(f) for f in files]
    names = [re.fullmatch(r"co-overture-(nw|ne|sw|se)\.json", f.name) for f in files]
    if len(files) != 4 or any(m is None for m in names) or {m.group(1) for m in names} != SHARDS:
        raise ValueError("Exactly four distinct Colorado region shards are required")
    release = None
    listed, closed = set(), set()
    total = 0
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        version = data.get("dataset_version")
        if not isinstance(version, str) or not RELEASE.fullmatch(version):
            raise ValueError(f"{path.name}: missing verified release")
        if release is None:
            release = version
        elif version != release:
            raise ValueError(f"{path.name}: mixed Overture releases")
        if data.get("state") != "CO" or data.get("source_name") != "Overture Maps" or data.get("license") != "CDLA-Permissive-2.0":
            raise ValueError(f"{path.name}: untrusted snapshot metadata")
        if data.get("truncated") is not False:
            raise ValueError(f"{path.name}: truncated snapshot cannot be approved")
        items = data.get("items")
        tombstones = data.get("closed_ids")
        if not isinstance(items, list) or not isinstance(tombstones, list) or data.get("eligible_count") != len(items):
            raise ValueError(f"{path.name}: invalid record counts")
        for row in items:
            if not isinstance(row, dict):
                raise ValueError(f"{path.name}: malformed record")
            identity = row.get("id")
            confidence = row.get("confidence")
            if (not isinstance(identity, str) or not identity.startswith("overture:")
                or identity in listed
                or row.get("state") != "CO"
                or row.get("source_name") != "Overture Maps"
                or row.get("source_url") != "https://overturemaps.org/"
                or row.get("license") != "CDLA-Permissive-2.0"
                or row.get("image_url") not in ("", None)
                or isinstance(confidence, bool)
                or not isinstance(confidence, (int, float))
                or not math.isfinite(confidence)
                or not 0.7 <= confidence <= 1):
                raise ValueError(f"{path.name}: duplicate or invalid source-backed record")
            listed.add(identity)
        for identity in tombstones:
            if not isinstance(identity, str) or not identity.startswith("overture:") or identity in closed:
                raise ValueError(f"{path.name}: duplicate or invalid closure")
            closed.add(identity)
        total += len(items)
    if listed & closed:
        raise ValueError("An attraction cannot be listed and permanently closed in the same batch")
    if total < minimum:
        raise ValueError(f"Too few source-backed attractions: {total} < {minimum}")
    return {"dataset_version": release, "listed": total, "closed": len(closed), "shards": len(files)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="+")
    args = parser.parse_args()
    print(json.dumps(validate(args.files), sort_keys=True))


if __name__ == "__main__":
    main()
