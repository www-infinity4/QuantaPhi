#!/usr/bin/env python3
"""Read-only, private SQLite/D1 shadow comparison. No network or data export.

Usage: python3 distributed-vault/d1-verify.py report <private.sqlite>
       python3 distributed-vault/d1-verify.py compare <source.sqlite> <shadow.sqlite>

This tool prints table names, row counts and cryptographic hashes, NEVER row
values. It is a staging parity check, not proof of a live D1 cutover.
"""
import hashlib
import json
from pathlib import Path
import sqlite3
import struct
import sys
from urllib.parse import quote

VERSION = "d1-parity/v1"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encode(value):
    if value is None:
        tag, payload = b"N", b""
    elif isinstance(value, bytes):
        tag, payload = b"B", value
    elif isinstance(value, int):
        tag, payload = b"I", str(value).encode("ascii")
    elif isinstance(value, float):
        tag, payload = b"F", struct.pack(">d", value)
    elif isinstance(value, str):
        tag, payload = b"T", value.encode("utf-8")
    else:
        raise ValueError("unsupported SQLite column type")
    return tag + len(payload).to_bytes(8, "big") + payload


def identifier(name):
    # SQLite identifiers are not parameterizable; quote them and escape quotes.
    return '"' + name.replace('"', '""') + '"'


def open_private(path):
    source = Path(path).resolve()
    if not source.is_file():
        raise ValueError("private SQLite source file not found")
    uri = "file:" + quote(source.as_posix(), safe="/") + "?mode=ro"
    connection = sqlite3.connect(uri, uri=True)
    connection.execute("PRAGMA query_only=ON")
    connection.execute("BEGIN")
    return connection


def snapshot_report(path):
    connection = open_private(path)
    try:
        check = connection.execute("PRAGMA integrity_check").fetchone()
        if check != ("ok",):
            raise ValueError("SQLite integrity check failed")
        names = [
            row[0] for row in connection.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
            )
        ]
        tables = []
        for name in names:
            cols = connection.execute(
                "PRAGMA table_xinfo(" + identifier(name) + ")"
            ).fetchall()
            visible = [col for col in cols if col[6] == 0]
            if not visible:
                raise ValueError("table contains no visible columns")
            # Full table metadata; does not expose row contents.
            schema = json.dumps(cols, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            h = hashlib.sha256()
            count = 0
            # Sorting by every visible column ensures row order is independent
            # of insertion history and rowid. SQLite may use private temp space
            # for large tables; do this on staged snapshots, not a busy D1 API.
            sort = ",".join(str(i) for i in range(1, len(visible) + 1))
            sql = "SELECT * FROM " + identifier(name) + " ORDER BY " + sort
            for row in connection.execute(sql):
                h.update(len(row).to_bytes(4, "big"))
                for cell in row:
                    h.update(encode(cell))
                count += 1
            tables.append({
                "name": name, "rowCount": count,
                "schemaSha256": sha(schema), "dataSha256": h.hexdigest()
            })
        return {"format": VERSION, "tableCount": len(tables), "tables": tables}
    finally:
        connection.rollback()
        connection.close()


def compare(a, b):
    left = snapshot_report(a)
    right = snapshot_report(b)
    l = {entry["name"]: entry for entry in left["tables"]}
    r = {entry["name"]: entry for entry in right["tables"]}
    differences = []
    for name in sorted(set(l) | set(r)):
        if name not in l:
            reason = "extra_table"
        elif name not in r:
            reason = "missing_table"
        elif l[name]["schemaSha256"] != r[name]["schemaSha256"]:
            reason = "schema_changed"
        elif l[name]["rowCount"] != r[name]["rowCount"]:
            reason = "row_count_changed"
        elif l[name]["dataSha256"] != r[name]["dataSha256"]:
            reason = "rows_changed"
        else:
            continue
        differences.append({"table": name, "reason": reason})
    return {
        "format": VERSION, "matches": not differences,
        "tablesCompared": len(set(l) | set(r)), "differences": differences,
        "note": "Read-only staged SQLite comparison. Live D1 consistency and wallet invariants require separate verification."
    }


def main(args):
    if len(args) == 2 and args[0] == "report":
        print(json.dumps(snapshot_report(args[1]), sort_keys=True))
        return 0
    if len(args) == 3 and args[0] == "compare":
        outcome = compare(args[1], args[2])
        print(json.dumps(outcome, sort_keys=True))
        return 0 if outcome["matches"] else 2
    raise ValueError("usage: d1-verify.py report <private.sqlite> | compare <source.sqlite> <shadow.sqlite>")


if __name__ == "__main__":
    try:
        sys.exit(main(sys.argv[1:]))
    except (sqlite3.Error, ValueError, OSError, UnicodeError) as error:
        print("Private D1 verification failed: " + str(error), file=sys.stderr)
        sys.exit(1)
