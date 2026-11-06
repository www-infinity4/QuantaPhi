---
issue: 1608
project: "Persistent unique ad delivery and first-party creative inventory"
source_requests:
  - "2026-11-06 owner: ads showing must never repeat; create data inventory for new authentic ads"
state: implementing
dot: "🟡"
progress_percent: 35
progress_basis: "Estimated 3 of 9 release gates partly met: source selector/history, D1 table/API source, source-fed UI. Tests, migration, release and account-wide delivery verification outstanding"
sessions_spent: 1
sessions_remaining_estimate: "2–4 source/review sessions plus authenticated identity and device verification"
agent: "ChatGPT source branch (not a coordinator lease)"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: null
repo: www-infinity4/QuantaPhi
branch: "fix/ad-no-repeat-catalog-20261106"
head_sha: null
pr: null
tests:
  - "Test cases staged; exact-head CI not yet verified"
ci: []
merged: false
deployed: false
live_verified: false
blocker: "No account-wide authenticated atomic ad-claim route; D1 migration not applied; no approved external creative evidence"
next_action: "Run exact-head PR CI and address failures before database rollout"
---

# Ticket #1608 — 2026-11-06 session

Existing [#1608](https://github.com/www-infinity4/QuantaPhi/issues/1608) reused for non-repeat requirement instead of opening a duplicate. Related content rights [#1315](https://github.com/www-infinity4/QuantaPhi/issues/1315) and product directory [#1423](https://github.com/www-infinity4/QuantaPhi/issues/1423).

## Actual branch work
- `quick-ads-core.mjs`: select only unseen ads; empty inventory means `null`. Reviewed D1 new creative catalog with stable equivalence keys.
- `quick-ads.mjs`: browser-persistent seen history, fail-closed when history cannot be committed, reviewed Worker catalog feed.
- `quick-ads.css`: actual rights-cleared thumbnails when present.
- `workers/product-directory/worker.mjs` and `migrations/0001-ad-creatives.sql`: existing D1 read-only approved catalog and reserved per-account unique receipt table, no actual production SQL changes.
- `test/quick-ads.test.mjs` and `test/product-directory-worker.test.mjs`: regression cases for exhausted inventory, catalog acceptance and SQL rights gates.
- `docs/AD-CREATIVE-NOREPEAT.md`: release and security details.

## Known limitations
Browser-local history does not protect against cleared browser data, all simultaneous tabs or other devices. Atomic signed-in D1 claims are required for that. Other site ad placements and external providers are not yet covered. No real new sponsor/brand creative inserted. Do not interpret staged code as delivered production behavior.

Next gate: exact-head CI, independent review, migration/readback, Android acceptance and identity claim integration.
