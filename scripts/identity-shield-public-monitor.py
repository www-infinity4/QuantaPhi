#!/usr/bin/env python3
"""Weekly public-page change radar. No account automation, SSNs or private data."""
import hashlib
import json
import re
import sys
from datetime import datetime, timezone
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
STATE = ROOT / "data/identity-shield-research.json"
SOURCES = {
    "ssa-account": "https://www.ssa.gov/myaccount/",
    "ssa-statement": "https://www.ssa.gov/myaccount/statement.html",
    "ftc-recovery": "https://www.identitytheft.gov/Steps",
    "ftc-freeze": "https://www.identitytheft.gov/credit-freezes",
}
MAX_BYTES = 600_000


class ExtractText(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.hidden_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "svg", "noscript"}:
            self.hidden_depth += 1

    def handle_endtag(self, tag):
        if tag in {"script", "style", "svg", "noscript"} and self.hidden_depth:
            self.hidden_depth -= 1

    def handle_data(self, data):
        if not self.hidden_depth and data.strip():
            self.parts.append(data)


def normalize_public_page(content):
    parser = ExtractText()
    parser.feed(content)
    return re.sub(r"\s+", " ", " ".join(parser.parts)).strip()


def public_digest(url):
    if url not in SOURCES.values():
        raise ValueError("public_source_not_allowlisted")
    req = Request(url, headers={
        "User-Agent": "QuantaPhi-Public-Source-Research/1.0",
        "Accept": "text/html",
    })
    with urlopen(req, timeout=13) as response:
        final = urlparse(response.geturl())
        initial = urlparse(url)
        if final.scheme != "https" or final.hostname != initial.hostname:
            raise ValueError("source_redirect_outside_allowlist")
        if response.status != 200:
            raise ValueError("source_http_unavailable")
        body = response.read(MAX_BYTES + 1)
    if len(body) > MAX_BYTES:
        raise ValueError("source_over_size_limit")
    text = normalize_public_page(body.decode("utf-8", errors="replace"))
    if len(text) < 160:
        raise ValueError("source_content_unverifiable")
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def update_state(snapshot, check=public_digest, now=None):
    if snapshot.get("monitor_kind") != "public_policy_sources_only":
        raise ValueError("unexpected_monitor_state")
    now = now or datetime.now(timezone.utc).isoformat(timespec="seconds")
    seen = {row.get("id"): row for row in snapshot.get("sources", [])}
    output = []
    for key, url in SOURCES.items():
        prior = seen.get(key, {})
        previous_digest = prior.get("content_sha256")
        row = {
            "id": key,
            "url": url,
            "status": "pending",
            "last_checked_utc": now,
            "last_success_utc": prior.get("last_success_utc"),
            "last_change_utc": prior.get("last_change_utc"),
            "content_sha256": previous_digest,
        }
        try:
            digest = check(url)
            row["last_success_utc"] = now
            row["content_sha256"] = digest
            if previous_digest and previous_digest != digest:
                row["last_change_utc"] = now
            row["status"] = "review_required" if (
                row["last_change_utc"] or prior.get("status") == "review_required"
            ) else "ok"
        except Exception as error:
            # Public-monitor failure must NOT be reported as a successful check.
            row["status"] = "unavailable"
            print("Public source check unavailable:", key, type(error).__name__, file=sys.stderr)
        output.append(row)
    return {
        "schema_version": 1,
        "monitor_kind": "public_policy_sources_only",
        "last_run_utc": now,
        "sources": output,
    }


def main():
    snapshot = json.loads(STATE.read_text(encoding="utf-8"))
    updated = update_state(snapshot)
    STATE.write_text(json.dumps(updated, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    ok = sum(row["status"] in {"ok", "review_required"} for row in updated["sources"])
    print(f"Public government research checks: {ok}/{len(SOURCES)} successful. No personal accounts accessed.")


if __name__ == "__main__":
    main()
