---
issue: 1359
project: "Cloudflare Attractions Directory · Colorado then all 50 states"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/1359
state: implementing
dot: "🟡"
progress_percent: 65
progress_basis: "Isolated Cloudflare D1 database, 50 state queue, six source-backed CO records and live read-only Worker; front-end and automatic source importer branch staged, not yet merged."
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT source and Cloudflare, no coordinator lease"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
repo: www-infinity4/QuantaPhi
branch: feat/1359-attractions-directory-cloudflare-feed
head_sha: a5993e5c11e25fbcc8184474cb8a93e6c05c183c
pr: "https://github.com/www-infinity4/QuantaPhi/pull/1368"
tests:
  - "Live Cloudflare D1 health returned records=6"
  - "Node/Python and two attractions-specific Android browser tests passed on tested PR heads; final exact-head rerun pending."
ci: []
merged: false
deployed: false
live_verified: false
blocker: "Broad QuantaPhi browser QA failed on unrelated Cooperative Shopping overflow and Levi source carousel; narrow shared fix reverted, final exact-head checks pending; Overture data PR not reviewed."
next_action: "Inspect PR 1368 exact-head CI and isolate shared-carousel blocker before safe expected-head merge and homepage readback."
---

# Colorado-first attractions directory

The independent Cloudflare D1 quantaphi-attractions-directory has six curated Colorado records and a separate 50-state queue. New Cloudflare Worker quantaphi-attractions-directory uses binding ATTRACTIONS and publicly serves GET search, feed, stats and health. Read-only fetch verified six records. Cron is set for 10:37 UTC daily to read only reviewed GitHub source snapshots.

A new source directory Quick Card is staged for the existing Oracle carousel; it searches D1 rather than creating thousands of nodes. Overture Places importer and weekly Colorado four-region source PR workflow are staged. Catalog items are non-sponsored with attributed URLs and no fabricated images, hours, booking times, prices or reviews.

Source side: independent D1 created, schema applied, 50 states seeded as a queue, six source entries inserted, Worker deployed and live health/search readback confirmed. No wallet, auth or restaurant modifications.

Next: exact-head tests and browser release gate, PR merge and homepage verification; inspect source-data workflow receipts, merge reviewed Colorado snapshots and verify actual record counts/coverage. Colorado is not complete yet. 49 other states are queued and not represented as populated.

## Latest verification checkpoint — 2026-11-01

- PR #1368 created with independent Worker, state queue, seeded Colorado source records, four-region Overture source importer and new Oracle Quick Card.
- Attractions source/Node/Python and mobile-card CI passed on prior exact heads; broad site QA failed on two unrelated components (Cooperative Shopping overflow 320px/393px and existing Levi Next-offer carousel).
- Narrow shared-carousel change passed focused tests but did not resolve full integration; speculative shared changes were fully reverted from this attractions PR.
- Six actual Colorado attractions and 50-state queue remain live in isolated Cloudflare D1. No reviewed Overture bulk snapshot yet ingested; no homepage merge or live UI release yet claimed.
- Existing hourly Continuity Builder was updated successfully to include #1359 alongside current business/restaurant priorities.
- Next: exact-head CI, then merge only when actual gate passes; verify public script and UI and import reviewed Colorado Overture batches.