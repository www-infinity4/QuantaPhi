---
issue: 1394
project: "50-state organic cannabis source directory"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/1394
state: source_tested
dot: "🟡"
progress_percent: 35
progress_basis: "Read-only Worker source and five verified regulator catalog URLs; D1 has 12 Colorado stores, 50 queued states, five catalog records and one source-catalog receipt. Exact-head CI, independent review, deployment and 49 other states' stores remain."
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT source and Cloudflare, no verified coordinator lease"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
repo: www-infinity4/QuantaPhi
branch: feat/nationwide-cannabis-directory-bruce-banner-20261101
pr: "https://github.com/www-infinity4/QuantaPhi/pull/1395"
merged: false
deployed: false
live_verified: false
next_action: "Verify exact-head #1395 CI after front-matter repair, obtain independent review, then merge and separately deploy/read back the source Worker."
---

# TICKET-1394 · 50-state organic cannabis source directory

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1394
Source PR: https://github.com/www-infinity4/QuantaPhi/pull/1395
Branch: `feat/nationwide-cannabis-directory-bruce-banner-20261101`
State: 🟡 source implementation/review pending; **not deployed**.
Progress estimate: ~35% of source-and-data acceptance (Worker, 5 regulator URLs and a real D1 receipt; 45 regulator sources, most state store imports, CI/independent review, deployment and Quick Card readback remain).
Sessions spent: 1 documented 2026-11-01 session; remaining: unknown.
Writer lease: not independently established; do not assume exclusive production ownership.

## 2026-11-01 verified checkpoint
- Cloudflare US D1 `quantaphi-cannabis-directory` ID `5c3901fc-c5b8-41f3-bfd5-3153686ac481` queried directly: **12 store sources, CO only; 50 state policy rows; 50 queued discovery jobs; 0 store import receipts**. Never confuse queue with coverage.
- Created GET-only source directory Worker on the existing branch, using `DIRECTORY` D1 binding, no-store response, source gates, 24/page, 50-state coverage, state regulator catalog, separate receipt endpoint. Per-visit acknowledgment is **not age verification** and cannot enable restricted ads.
- Verified official source URLs from Iowa HHS (5 medical-only locations), Missouri DCR (license vs ATO), Illinois (map dated 2026-10-08), NY OCM dataset, Maine OCP (active vs conditional; 2026-10-08 CSV). **Five regulator sources, not five states with imported stores.**
- Created and applied idempotent `workers/cannabis-directory-regulator-catalog.sql` to isolated D1. Fresh readback: **5 official regulator catalog rows** and append-only `regulator_source_ingest_runs` receipt `2026-11-01-official-regulator-catalog-v1` inspected=5, accepted=5, rejected=0 at `2026-11-01 16:25:13`. Existing 12 store rows and 0 store import receipts unchanged.
- Added focused RED+new worker tests and `Cannabis Directory · organic source contracts` CI. **Tests/PR review/merge/deployment still require independent exact-head verification.**
- Never publish fabricated quality stars, customer reviews, potency/health claims, unlicensed photos, paid sponsor labels, or age-verified assertions. Existing 21+ spotlights remain independent organic source experiences.

## Next executable action
Fetch exact PR #1395 head, check targeted GitHub workflow conclusion, repair any real failures on the same branch, obtain required independent review, then expected-head merge and deploy Worker with isolated D1 binding. Verify public health, coverage, regulators, receipts and acknowledged stores. Next source import: five Iowa medical-only locations with state-regulator evidence and explicit medical-only labeling; verify address/license status and record actual store ingest receipts before claiming population. Missouri license+ATO and Illinois official map follow. Continue attractions/restaurant work when blocked.

## Holds
No public first-party ID upload/verification; no paid cannabis creatives; no 911/Broadcastify ID checks; no wallet, passkey, auth or other D1 writes. Source code merge is not production activation.
