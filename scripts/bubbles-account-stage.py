#!/usr/bin/env python3
"""Owner-operated API access / empty staging DB; never activates a Brain writer.

Standard library only. Default: check. --stage: create/reuse the fixed empty D1
with the original three core schemas. --connect-github: separately store the
token in the named repository Actions secret, refusing a known existing secret.
"""

import argparse
import getpass
import json
import os
import re
import shutil
import subprocess
import sys
import urllib.error
import urllib.request
import warnings
from datetime import datetime, timezone


ACCOUNT_ID = "392a60022046dd9f6d11b1d4b511a2ad"
DATABASE_NAME = "bubbles-brain-core"
SECRET_NAME = "BUBBLES_CLOUDFLARE_API_TOKEN"
REPOSITORY = "www-infinity4/QuantaPhi"
ROOT = f"/accounts/{ACCOUNT_ID}/d1/database"
LIST_QUERY = "?name=bubbles-brain-core&per_page=100&page=1"
MAX_RESPONSE = 256 * 1024
UUID = re.compile(r"[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\Z")

# Original native schema-only readback, #1907/#1110, 2026-11-28 UTC.
# No identity, session, credential, wallet, analytics or media data is generated.
SCHEMA = (
    {"type": "table", "name": "work_tickets", "table": "work_tickets", "sql": """
CREATE TABLE IF NOT EXISTS work_tickets (
 id TEXT PRIMARY KEY,
 owner_hash TEXT NOT NULL,
 handoff_hash TEXT NOT NULL,
 source_app TEXT NOT NULL DEFAULT 'Omni Phi',
 source_url TEXT NOT NULL DEFAULT '',
 repository TEXT NOT NULL DEFAULT '',
 title TEXT NOT NULL,
 request TEXT NOT NULL,
 storyboard TEXT NOT NULL DEFAULT '',
 context_json TEXT NOT NULL DEFAULT '{}',
 status TEXT NOT NULL DEFAULT 'draft',
 claimed_by TEXT NOT NULL DEFAULT '',
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL,
 completed_at INTEGER,
 handoff_expires_at INTEGER NOT NULL,
 result_summary TEXT NOT NULL DEFAULT '',
 result_url TEXT NOT NULL DEFAULT '')""".strip()},
    {"type": "index", "name": "idx_work_tickets_owner_updated", "table": "work_tickets",
     "sql": "CREATE INDEX IF NOT EXISTS idx_work_tickets_owner_updated ON work_tickets(owner_hash, updated_at DESC)"},
    {"type": "index", "name": "idx_work_tickets_status_updated", "table": "work_tickets",
     "sql": "CREATE INDEX IF NOT EXISTS idx_work_tickets_status_updated ON work_tickets(status, updated_at DESC)"},
    {"type": "table", "name": "brain_experiences", "table": "brain_experiences", "sql": """
CREATE TABLE IF NOT EXISTS brain_experiences (
 experience_id TEXT PRIMARY KEY,
 owner_hash TEXT NOT NULL,
 repository TEXT NOT NULL,
 ticket_id TEXT NOT NULL DEFAULT '',
 job_id TEXT NOT NULL DEFAULT '',
 kind TEXT NOT NULL CHECK(kind IN ('observation','outcome','lesson','procedure')),
 status TEXT NOT NULL,
 summary TEXT NOT NULL,
 evidence_url TEXT NOT NULL DEFAULT '',
 metadata_json TEXT NOT NULL DEFAULT '{}',
 verified INTEGER NOT NULL DEFAULT 0 CHECK(verified IN (0,1)),
 occurred_at INTEGER NOT NULL,
 created_at INTEGER NOT NULL,
 embedding_status TEXT NOT NULL DEFAULT 'pending',
 CHECK(length(summary) BETWEEN 1 AND 1800))""".strip()},
    {"type": "index", "name": "idx_brain_memory_owner_repo_time", "table": "brain_experiences",
     "sql": "CREATE INDEX IF NOT EXISTS idx_brain_memory_owner_repo_time ON brain_experiences(owner_hash,repository,occurred_at DESC)"},
    {"type": "index", "name": "idx_brain_memory_owner_time", "table": "brain_experiences",
     "sql": "CREATE INDEX IF NOT EXISTS idx_brain_memory_owner_time ON brain_experiences(owner_hash,occurred_at DESC)"},
    {"type": "table", "name": "bubbles_chatgpt_bridge", "table": "bubbles_chatgpt_bridge",
     "sql": "CREATE TABLE IF NOT EXISTS bubbles_chatgpt_bridge (id TEXT PRIMARY KEY, action TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'queued', result TEXT, created_ms INTEGER NOT NULL, updated_ms INTEGER NOT NULL, expires_ms INTEGER NOT NULL)"},
    {"type": "index", "name": "idx_bubbles_chatgpt_bridge_next", "table": "bubbles_chatgpt_bridge",
     "sql": "CREATE INDEX IF NOT EXISTS idx_bubbles_chatgpt_bridge_next ON bubbles_chatgpt_bridge(status,created_ms)"},
)


class Blocked(Exception):
    """Fixed local reason codes only; never include provider/child error text."""

    def __init__(self, code, http_status=None):
        self.code = code
        self.http_status = http_status
        super().__init__(code)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise Blocked("api_redirect_refused")


class Client:
    def __init__(self, token, opener=None):
        self._token = token
        self._opener = opener or urllib.request.build_opener(NoRedirect())

    def call(self, method, path, body=None):
        allowed = ((method == "GET" and path == ROOT + LIST_QUERY) or
                   (method == "POST" and path == ROOT and body == {"name": DATABASE_NAME}) or
                   (method == "POST" and path.startswith(ROOT + "/") and
                    path.endswith("/query") and UUID.fullmatch(path[len(ROOT) + 1:-6])))
        if not allowed:
            raise Blocked("api_destination_refused")
        data = None if body is None else json.dumps(body).encode("utf-8")
        request = urllib.request.Request(
            "https://api.cloudflare.com/client/v4" + path, method=method, data=data,
            headers={"Authorization": "Bearer " + self._token,
                     "Accept": "application/json", "Content-Type": "application/json"})
        try:
            with self._opener.open(request, timeout=20) as response:
                raw = response.read(MAX_RESPONSE + 1)
                if response.status != 200:
                    raise Blocked("api_http_failure", response.status)
        except urllib.error.HTTPError as error:
            error.close()
            raise Blocked("api_http_failure", error.code) from None
        except (urllib.error.URLError, OSError, TimeoutError):
            raise Blocked("api_network_failure") from None
        if len(raw) > MAX_RESPONSE:
            raise Blocked("api_response_too_large")
        try:
            envelope = json.loads(raw)
        except (ValueError, UnicodeError):
            raise Blocked("api_invalid_json") from None
        if not isinstance(envelope, dict) or envelope.get("success") is not True:
            raise Blocked("api_unsuccessful")
        return envelope


def new_receipt(create=False):
    return {"scope": "bubbles-paid-account-empty-stage-v1", "account_id": ACCOUNT_ID,
            "database_name": DATABASE_NAME, "mode": "stage" if create else "check",
            "status": "started", "observed_at_utc": datetime.now(timezone.utc).isoformat(),
            "database_found": False, "database_creation": "not_attempted",
            "database_id": None, "schema_verified": False,
            "schema_statements_attempted": 0, "schema_statements_acknowledged": 0,
            "github_secret": "not_requested", "original_data_imported": False,
            "source_fence_verified": False, "writer_activated_by_this_run": False,
            "ai_calls_this_run": 0, "production_verified": False, "chat_verified": False}


def sql_tokens(sql):
    if not isinstance(sql, str):
        raise Blocked("target_schema_mismatch")
    tokens = re.findall(r"'(?:''|[^'])*'|\"(?:\"\"|[^\"])*\"|[A-Za-z_]\w*|\d+|[^\s]", sql)
    tokens = [t if t.startswith(("'", '"')) else t.lower() for t in tokens]
    # SQLite removes IF NOT EXISTS from the persisted CREATE header.
    if tokens[2:5] == ["if", "not", "exists"]:
        del tokens[2:5]
    if tokens and tokens[-1] == ";":
        tokens.pop()
    return tokens


def query(api, db_id, sql):
    envelope = api.call("POST", ROOT + f"/{db_id}/query", {"sql": sql})
    result = envelope.get("result")
    if not isinstance(result, list) or len(result) != 1 or not isinstance(result[0], dict):
        raise Blocked("query_result_invalid")
    if result[0].get("success") is not True or not isinstance(result[0].get("results"), list):
        raise Blocked("query_unsuccessful")
    return result[0]["results"]


def inspect_empty(api, db_id):
    rows = query(api, db_id, "SELECT type,name,tbl_name,sql FROM sqlite_master "
                 "WHERE name NOT GLOB 'sqlite_*' AND name != '_cf_KV' "
                 "ORDER BY type,name LIMIT 17")
    expected = {item["name"]: item for item in SCHEMA}
    present = set()
    for row in rows:
        if not isinstance(row, dict) or row.get("name") not in expected:
            raise Blocked("target_schema_unknown")
        item = expected[row["name"]]
        if (row.get("type") != item["type"] or row.get("tbl_name") != item["table"] or
                sql_tokens(row.get("sql")) != sql_tokens(item["sql"]) or item["name"] in present):
            raise Blocked("target_schema_mismatch")
        present.add(item["name"])
    for item in SCHEMA:
        if item["type"] == "table" and item["name"] in present:
            # Fixed names only. At most one row touched; never fetch a private value.
            found = query(api, db_id, f"SELECT EXISTS(SELECT 1 FROM {item['name']} LIMIT 1) AS occupied")
            if len(found) != 1 or found[0].get("occupied") != 0:
                raise Blocked("target_has_records")
    return present


def run(api, create=False, receipt=None):
    receipt = new_receipt(create) if receipt is None else receipt
    listing = api.call("GET", ROOT + LIST_QUERY)
    rows = listing.get("result")
    info = listing.get("result_info") or {}
    if (not isinstance(rows, list) or len(rows) >= 100 or not isinstance(info, dict) or
            info.get("total_pages", 1) != 1 or info.get("page", 1) != 1):
        raise Blocked("database_list_incomplete")
    matches = [r for r in rows if isinstance(r, dict) and r.get("name") == DATABASE_NAME]
    if len(matches) > 1:
        raise Blocked("database_name_ambiguous")
    if not matches and not create:
        receipt["status"] = "access_verified"
        return receipt
    if matches:
        database = matches[0]
        receipt["database_found"] = True
        receipt["database_creation"] = "existing"
    else:
        receipt["database_creation"] = "attempted_unconfirmed"
        database = api.call("POST", ROOT, {"name": DATABASE_NAME}).get("result")
        if not isinstance(database, dict) or database.get("name") != DATABASE_NAME:
            raise Blocked("database_create_unconfirmed")
        receipt["database_creation"] = "created"
    db_id = database.get("uuid")
    if not isinstance(db_id, str) or not UUID.fullmatch(db_id):
        raise Blocked("database_id_invalid")
    receipt["database_id"] = db_id
    receipt["database_found"] = True
    present = inspect_empty(api, db_id)
    if create:
        for item in SCHEMA:
            if item["name"] not in present:
                receipt["schema_statements_attempted"] += 1
                query(api, db_id, item["sql"])
                receipt["schema_statements_acknowledged"] += 1
        present = inspect_empty(api, db_id)
    receipt["schema_verified"] = len(present) == len(SCHEMA)
    if create and not receipt["schema_verified"]:
        raise Blocked("schema_readback_incomplete")
    receipt["status"] = "empty_stage_verified" if create else "access_verified"
    return receipt


def read_token():
    token = os.environ.pop(SECRET_NAME, None)
    if token is None:
        if not sys.stdin.isatty():
            raise Blocked("token_required_in_private_terminal")
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", getpass.GetPassWarning)
                token = getpass.getpass("Cloudflare API token (hidden; never paste into chat): ")
        except (getpass.GetPassWarning, EOFError, OSError):
            raise Blocked("private_token_prompt_unavailable") from None
    if not isinstance(token, str) or not re.fullmatch(r"[A-Za-z0-9_-]{20,1024}", token):
        raise Blocked("token_format_invalid")
    return token


def connect_github(token):
    executable = shutil.which("gh")
    if not executable:
        raise Blocked("existing_github_cli_required")
    # The token is stdin-only. Never inherit Cloudflare credentials/debug switches.
    env = {k: v for k, v in os.environ.items()
           if "CLOUDFLARE" not in k.upper() and not k.upper().startswith("CF_") and k not in
           ("GH_DEBUG", "GIT_TRACE", "GIT_CURL_VERBOSE")}
    env["GH_HOST"] = "github.com"

    def gh(args, value=None):
        try:
            result = subprocess.run([executable] + args, input=value, text=True,
                                    stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                    timeout=30, env=env, check=False)
        except (OSError, subprocess.SubprocessError):
            raise Blocked("github_secret_connection_failed") from None
        if result.returncode:
            raise Blocked("github_secret_connection_failed")
        return result.stdout

    try:
        listing = json.loads(gh(["api", f"repos/{REPOSITORY}/actions/secrets?per_page=100"]))
    except ValueError:
        raise Blocked("github_secret_list_invalid") from None
    if (not isinstance(listing, dict) or not isinstance(listing.get("secrets"), list) or
            not isinstance(listing.get("total_count"), int) or listing["total_count"] > 100 or
            listing["total_count"] != len(listing["secrets"])):
        raise Blocked("github_secret_list_incomplete")
    names = [s.get("name") if isinstance(s, dict) else None for s in listing["secrets"]]
    if any(not isinstance(n, str) or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", n) for n in names):
        raise Blocked("github_secret_list_invalid")
    names = [n.upper() for n in names]
    if len(names) != len(set(names)):
        raise Blocked("github_secret_list_invalid")
    if SECRET_NAME in names:
        return "existing_unmodified"
    gh(["secret", "set", SECRET_NAME, "--repo", REPOSITORY], token)
    try:
        saved = json.loads(gh(["api", f"repos/{REPOSITORY}/actions/secrets/{SECRET_NAME}"]))
    except ValueError:
        raise Blocked("github_secret_readback_invalid") from None
    if not isinstance(saved, dict) or saved.get("name") != SECRET_NAME:
        raise Blocked("github_secret_readback_invalid")
    return "stored"


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--stage", action="store_true", help="create/verify the fixed empty Bubbles/Brain D1")
    parser.add_argument("--connect-github", action="store_true",
                        help=f"store the token as {REPOSITORY} Actions secret {SECRET_NAME}; refuse known existing")
    args = parser.parse_args(argv)
    receipt = new_receipt(args.stage)
    try:
        token = read_token()
        run(Client(token), create=args.stage, receipt=receipt)
        if args.connect_github:
            receipt["github_secret"] = "connection_attempted_unconfirmed"
            receipt["github_secret"] = connect_github(token)
        code = 0
    except Blocked as error:
        receipt["status"] = "blocked"
        receipt["reason"] = error.code
        if error.http_status is not None:
            receipt["http_status"] = error.http_status
        code = 1
    except KeyboardInterrupt:
        receipt["status"], receipt["reason"], code = "blocked", "owner_interrupted", 130
    except Exception:
        # Never serialize an unexpected exception containing credentials/provider data.
        receipt["status"], receipt["reason"], code = "blocked", "unexpected_local_failure", 1
    print(json.dumps(receipt, sort_keys=True))
    return code


if __name__ == "__main__":
    sys.exit(main())
