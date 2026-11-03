#!/usr/bin/env python3
"""Read-only Bubbles CI and execution-evidence audit; never dispatch or merge."""
import argparse
import datetime
import json
import os
import urllib.error
import urllib.request

REPO = "www-infinity4/QuantaPhi"
BASE = "https://api.github.com"

def fetch(path):
    headers = {"Accept": "application/vnd.github+json", "User-Agent": "bubbles-rig"}
    if os.environ.get("GITHUB_TOKEN"):
        headers["Authorization"] = "Bearer " + os.environ["GITHUB_TOKEN"]
    try:
        with urllib.request.urlopen(urllib.request.Request(BASE + path, headers=headers), timeout=20) as response:
            return json.load(response), None
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        return None, str(exc)

def run(args):
    report = {"schema": "bubbles-rig/v1", "observed_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
              "repository": REPO, "mode": "read_only", "runs": [], "prs": [], "execution": {}, "result": "UNVERIFIED"}
    for number in args.run:
        data, error = fetch(f"/repos/{REPO}/actions/runs/{number}")
        report["runs"].append({"id": number, "status": data.get("status") if data else "UNVERIFIED",
                               "conclusion": data.get("conclusion") if data else None,
                               "head_sha": data.get("head_sha") if data else None, "error": error})
    for number in args.pr:
        data, error = fetch(f"/repos/{REPO}/pulls/{number}")
        report["prs"].append({"number": number, "state": data.get("state") if data else "UNVERIFIED",
                              "merged": data.get("merged") if data else None,
                              "draft": data.get("draft") if data else None,
                              "mergeable": data.get("mergeable") if data else None,
                              "head_sha": data.get("head", {}).get("sha") if data else None, "error": error})
    evidence = {}
    if args.evidence:
        with open(args.evidence, encoding="utf-8") as handle:
            evidence = json.load(handle)
        if not isinstance(evidence, dict):
            raise ValueError("Evidence must be an object")
    for stage in ("personal_context", "authorization", "brain_dispatch", "android_execution",
                  "tool_receipts", "chat_response", "speech", "production_readback"):
        item = evidence.get(stage, {})
        submitted = isinstance(item, dict) and item.get("observed") is True and isinstance(item.get("receipt_url"), str) and item["receipt_url"].startswith("https://")
        report["execution"][stage] = {"status": "EVIDENCE_SUBMITTED" if submitted else "UNVERIFIED",
                                       "receipt_url": item["receipt_url"] if submitted else None}
    if any(r["conclusion"] == "failure" for r in report["runs"]):
        report["result"] = "CI_FAILURE_END_TO_END_UNVERIFIED"
    elif any(r["status"] in ("in_progress", "queued", "waiting") for r in report["runs"]):
        report["result"] = "CI_PENDING_END_TO_END_UNVERIFIED"
    elif report["runs"] and all(r["status"] == "completed" and r["conclusion"] == "success" for r in report["runs"]):
        report["result"] = "CI_PASSED_END_TO_END_UNVERIFIED"
    with open(args.output, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2)
        handle.write("\n")
    print(json.dumps({"result": report["result"], "output": args.output}))
    return report

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--run", action="append", type=int, default=[])
    parser.add_argument("--pr", action="append", type=int, default=[])
    parser.add_argument("--evidence")
    parser.add_argument("--output", default="bubbles-rig-receipt.json")
    args = parser.parse_args()
    if any(n <= 0 for n in args.run + args.pr):
        parser.error("IDs must be positive")
    run(args)

if __name__ == "__main__":
    main()
