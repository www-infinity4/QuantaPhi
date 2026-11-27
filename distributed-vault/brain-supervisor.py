#!/usr/bin/env python3
"""Bounded owner-host supervisor for the existing SQLite Brain entry point.

No installer, shell command, credential reset, model selection or remote action.
Only its own child is signalled. The private launch budget survives restarts.
"""
import fcntl
import json
import os
from pathlib import Path
import shutil
import signal
import sqlite3
import stat
import subprocess
import time

LIMIT = 3
WINDOW = 3600
SCHEMA = "CREATE TABLE brain_starts(id INTEGER PRIMARY KEY,at REAL NOT NULL,finished REAL,exit_code INTEGER)"


def emit(event, **fields):
    print(json.dumps(dict(event=event, when=time.time(), **fields)), flush=True)


def private_file(path):
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o077 or info.st_uid != os.getuid():
        raise ValueError("private_file_required")


def private_directory(path):
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or info.st_mode & 0o077 or info.st_uid != os.getuid():
        raise ValueError("private_directory_required")


def configuration(env):
    paths = []
    for key in ("BRAIN_WORK_DB", "BRAIN_STATE_DB"):
        value = env.get(key)
        if not value or not Path(value).is_absolute():
            raise ValueError("existing_brain_paths_required")
        path = Path(value)
        private_file(path)
        paths.append(path)
    ledger = Path(env.get("BRAIN_SUPERVISOR_DB") or str(paths[1].parent / "brain-supervisor.sqlite"))
    if not ledger.is_absolute():
        raise ValueError("private_ledger_required")
    private_directory(ledger.parent)
    for candidate in (ledger, Path(str(ledger) + ".lock")):
        for protected in paths:
            if candidate.resolve() == protected.resolve() or candidate.exists() and candidate.samefile(protected):
                raise ValueError("separate_supervisor_ledger_required")
    stop = Path(env.get("BRAIN_STOP_FILE") or str(ledger) + ".stop")
    if not stop.is_absolute():
        raise ValueError("private_stop_path_required")
    return ledger, stop


def open_ledger(path):
    try:
        fd = os.open(path, os.O_CREAT | os.O_EXCL | os.O_RDWR | os.O_NOFOLLOW, 0o600)
        os.close(fd)
    except FileExistsError:
        pass
    private_file(path)
    db = sqlite3.connect(path, timeout=3, isolation_level=None)
    try:
        objects = db.execute("SELECT name,sql FROM sqlite_master").fetchall()
        normalize = lambda text: "".join(str(text or "").lower().split())
        if any(name != "brain_starts" or normalize(sql) != normalize(SCHEMA) for name, sql in objects):
            raise ValueError("dedicated_supervisor_ledger_required")
        db.execute("PRAGMA synchronous=FULL")
        if not objects:
            db.execute(SCHEMA)
        return db
    except Exception:
        db.close()
        raise


def reserve_start(db):
    now = time.time()
    db.execute("BEGIN IMMEDIATE")
    try:
        # Future timestamps also consume the budget after a clock rollback.
        count = db.execute("SELECT COUNT(*) FROM brain_starts WHERE at>=?", (now - WINDOW,)).fetchone()[0]
        if count >= LIMIT:
            db.execute("ROLLBACK")
            return None
        row = db.execute("INSERT INTO brain_starts(at) VALUES(?)", (now,))
        db.execute("COMMIT")
        return row.lastrowid, count + 1
    except Exception:
        db.execute("ROLLBACK")
        raise


def supervise(env):
    ledger, stop = configuration(env)
    if stop.exists():
        emit("manual_stop_preserved")
        return 0
    node = shutil.which("node", path=env.get("PATH"))
    if not node:
        raise ValueError("existing_node_required")
    lock_path = Path(str(ledger) + ".lock")
    fd = os.open(lock_path, os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    try:
        private_file(lock_path)
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            emit("supervisor_already_active")
            return 73
        db = open_ledger(ledger)
        stopping = False

        def requested_stop(signum, frame):
            nonlocal stopping
            stopping = True

        signal.signal(signal.SIGINT, requested_stop)
        signal.signal(signal.SIGTERM, requested_stop)
        runtime = Path(__file__).resolve().with_name("sqlite-brain-runtime.mjs")
        try:
            while not stopping and not stop.exists():
                reserved = reserve_start(db)
                if reserved is None:
                    emit("restart_budget_exhausted", max_starts=LIMIT, window_seconds=WINDOW)
                    return 75
                attempt, number = reserved
                try:
                    child = subprocess.Popen([node, str(runtime)], cwd=runtime.parent.parent,
                                             env=env, stdin=subprocess.DEVNULL, start_new_session=True)
                except OSError:
                    db.execute("UPDATE brain_starts SET finished=?,exit_code=78 WHERE id=?", (time.time(), attempt))
                    emit("existing_runtime_unavailable")
                    return 78
                emit("child_started", pid=child.pid, attempt=number)
                while child.poll() is None:
                    if stopping or stop.exists():
                        child.terminate()
                        try:
                            child.wait(timeout=10)
                        except subprocess.TimeoutExpired:
                            child.kill()
                            child.wait()
                        break
                    time.sleep(0.1)
                code = child.wait()
                db.execute("UPDATE brain_starts SET finished=?,exit_code=? WHERE id=?", (time.time(), code, attempt))
                if stopping or stop.exists():
                    emit("managed_child_stopped", exit_code=code)
                    return 0
                emit("child_exited", exit_code=code)
                if code in (0, 78):
                    return code
                deadline = time.monotonic() + min(8, 2 ** (number - 1))
                while time.monotonic() < deadline and not stopping and not stop.exists():
                    time.sleep(0.1)
            emit("manual_stop_preserved")
            return 0
        finally:
            db.close()
    finally:
        os.close(fd)


if __name__ == "__main__":
    os.umask(0o077)
    try:
        result = supervise(dict(os.environ))
    except Exception:
        # Never print private paths, environment values, module source or keys.
        emit("supervisor_configuration_blocked")
        result = 78
    raise SystemExit(result)
