#!/usr/bin/env python3
"""Stage owner-exported Cloudflare D1 SQL into private SQLite, or verify/restore
private binary SQLite chunks. No remote API access, no npm, no repo writes.
Every operation creates a *new* target and checks SQLite integrity. Python 3.9+.
"""
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import sys
import uuid

def fail(message):
    raise ValueError(message)

def check_file(path):
    path = Path(path).resolve()
    if not path.is_file():
        fail("source file does not exist")
    return path

def private_open(path):
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    return os.fdopen(fd, "wb")

def digest(path):
    h = hashlib.sha256()
    with open(path, "rb") as source:
        while True:
            part = source.read(1024 * 1024)
            if not part:
                break
            h.update(part)
    return h.hexdigest()

def verify_sqlite(path):
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    try:
        row = conn.execute("PRAGMA integrity_check").fetchone()
        if row != ("ok",):
            fail("SQLite integrity check failed")
        tables = [r[0] for r in conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        ) if not r[0].startswith("sqlite_")]
    finally:
        conn.close()
    return tables

def import_sql(sql_path, destination):
    source = check_file(sql_path)
    target = Path(destination).resolve()
    if target.exists():
        fail("destination already exists")
    if source == target:
        fail("source and destination cannot match")
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = target.parent / (".d1-" + uuid.uuid4().hex + ".tmp")
    conn = None
    try:
        with private_open(temporary):
            pass
        conn = sqlite3.connect(temporary)
        # D1's SQLite-compatible SQL dump may contain semicolons in quoted data.
        # complete_statement respects SQL strings and multiline triggers.
        buffer = []
        count = 0
        with source.open("r", encoding="utf-8-sig") as stream:
            for line in stream:
                buffer.append(line)
                if len(buffer) > 10_000 or sum(map(len, buffer)) > 16 * 1024 * 1024:
                    fail("oversized SQL statement: export must be batched")
                if sqlite3.complete_statement("".join(buffer)):
                    conn.executescript("".join(buffer))
                    buffer.clear()
                    count += 1
            if "".join(buffer).strip():
                fail("incomplete SQL export")
        conn.commit()
        conn.close()
        conn = None
        tables = verify_sqlite(temporary)
        if target.exists():
            fail("destination appeared during staging")
        os.link(temporary, target)  # atomic create-only publication
        temporary.unlink()
        result = {"status": "sqlite_import_verified", "sourceBytes": source.stat().st_size,
                  "sqliteBytes": target.stat().st_size, "sha256": digest(target),
                  "tableCount": len(tables), "statements": count,
                  "note": "Private staging only. No production D1 or GitHub data was modified."}
        print(json.dumps(result, sort_keys=True))
    finally:
        if conn is not None:
            conn.close()
        try:
            temporary.unlink(missing_ok=True)
        except OSError:
            pass

def snapshot(db_path, destination):
    """Create a consistent private SQLite backup even with journal/WAL writers."""
    source = check_file(db_path)
    target = Path(destination).resolve()
    if target.exists():
        fail("destination already exists")
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = target.parent / (".snapshot-" + uuid.uuid4().hex + ".tmp")
    source_db = None
    target_db = None
    try:
        with private_open(temporary):
            pass
        source_db = sqlite3.connect(f"file:{source}?mode=ro", uri=True)
        target_db = sqlite3.connect(temporary)
        source_db.backup(target_db)
        target_db.close()
        target_db = None
        source_db.close()
        source_db = None
        tables = verify_sqlite(temporary)
        if target.exists():
            fail("destination appeared during snapshot")
        os.link(temporary, target)
        temporary.unlink()
        print(json.dumps({"status":"consistent_sqlite_snapshot", "bytes":target.stat().st_size,
                          "sha256":digest(target),"tableCount":len(tables)}))
    finally:
        if target_db is not None:
            target_db.close()
        if source_db is not None:
            source_db.close()
        temporary.unlink(missing_ok=True)

def chunk(db_path, directory, requested_bytes):
    source = check_file(db_path)
    verify_sqlite(source)
    chunk_size = int(requested_bytes)
    if not 4096 <= chunk_size <= 32 * 1024 * 1024:
        fail("chunk bytes must be between 4 KiB and 32 MiB")
    target = Path(directory).resolve()
    target.mkdir(parents=True, exist_ok=False, mode=0o700)
    pieces = []
    with source.open("rb") as db:
        index = 0
        while True:
            content = db.read(chunk_size)
            if not content:
                break
            name = f"chunk-{index:06d}.bin"
            with private_open(target / name) as dest:
                dest.write(content)
            pieces.append({"name": name, "bytes": len(content),
                           "sha256": hashlib.sha256(content).hexdigest()})
            index += 1
    report = {"format": "d1-private-chunks/v1", "sqliteBytes": source.stat().st_size,
              "sha256": digest(source), "chunks": pieces}
    with private_open(target / "manifest.json") as meta:
        meta.write((json.dumps(report, indent=2) + "\n").encode("utf-8"))
    print(json.dumps({"status": "private_chunks_created", "chunks": len(pieces),
                      "bytes": source.stat().st_size,
                      "warning": "Chunks are UNENCRYPTED staging files: pack/encrypt before any app transfer."}))

def restore(directory, destination):
    source = Path(directory).resolve()
    target = Path(destination).resolve()
    if target.exists():
        fail("destination already exists")
    meta = json.loads(check_file(source / "manifest.json").read_text())
    if meta.get("format") != "d1-private-chunks/v1":
        fail("invalid chunk manifest")
    chunks = meta.get("chunks")
    if not isinstance(chunks, list) or not chunks:
        fail("no chunks found")
    target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = target.parent / (".restore-" + uuid.uuid4().hex + ".tmp")
    written = 0
    try:
        with private_open(temporary) as out:
            for index, item in enumerate(chunks):
                name = f"chunk-{index:06d}.bin"
                if item.get("name") != name:
                    fail("invalid or reordered chunk")
                path = check_file(source / name)
                data = path.read_bytes()
                if len(data) != item.get("bytes") or hashlib.sha256(data).hexdigest() != item.get("sha256"):
                    fail("chunk checksum mismatch")
                out.write(data)
                written += len(data)
        if written != meta.get("sqliteBytes") or digest(temporary) != meta.get("sha256"):
            fail("full SQLite checksum mismatch")
        tables = verify_sqlite(temporary)
        if target.exists():
            fail("destination appeared during restore")
        os.link(temporary, target)
        temporary.unlink()
        print(json.dumps({"status": "verified_sqlite_restored", "bytes": written,
                          "sha256": meta["sha256"], "tableCount": len(tables)}))
    finally:
        try:
            temporary.unlink(missing_ok=True)
        except OSError:
            pass

def main(argv):
    if len(argv) < 1:
        fail("usage: d1-stage.py import-sql <export.sql> <new.sqlite> | snapshot <sqlite> <new.sqlite> | chunk <sqlite> <new-dir> <bytes> | restore <chunks-dir> <new.sqlite>")
    if argv[0] == "import-sql" and len(argv) == 3:
        return import_sql(argv[1], argv[2])
    if argv[0] == "snapshot" and len(argv) == 3:
        return snapshot(argv[1], argv[2])
    if argv[0] == "chunk" and len(argv) == 4:
        return chunk(argv[1], argv[2], argv[3])
    if argv[0] == "restore" and len(argv) == 3:
        return restore(argv[1], argv[2])
    fail("invalid arguments")

if __name__ == "__main__":
    try:
        main(sys.argv[1:])
    except (OSError, ValueError, sqlite3.Error, UnicodeError) as error:
        print("Private D1 staging failed: " + str(error), file=sys.stderr)
        sys.exit(1)
