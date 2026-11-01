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
head_sha: null
pr: null
tests:
  - "Live Cloudflare D1 health returned records=6"
  - "Node and Python import tests authored; exact-head CI pending"
ci: []
merged: false
deployed: false
live_verified: false
blocker: "Homepage merge and independent Android readback pending; Colorado Overture source data PR not yet generated or reviewed."
next_action: "Run exact-head CI and mobile browser QA for new attractions directory UI; fix failures before merging."
---

# Colorado-first attractions directory

The independent Cloudflare D1 quantaphi-attractions-directory has six curated Colorado records and a separate 50-state queue. New Cloudflare Worker quantaphi-attractions-directory uses binding ATTRACTIONS and publicly serves GET search, feed, stats and health. Read-only fetch verified six records. Cron is set for 10:37 UTC daily to read only reviewed GitHub source snapshots.

A new source directory Quick Card is staged for the existing Oracle carousel; it searches D1 rather than creating thousands of nodes. Overture Places importer and weekly Colorado four-region source PR workflow are staged. Catalog items are non-sponsored with attributed URLs and no fabricated images, hours, booking times, prices or reviews.

Source side: independent D1 created, schema applied, 50 states seeded as a queue, six source entries inserted, Worker deployed and live health/search readback confirmed. No wallet, auth or restaurant modifications.

Next: exact-head tests and browser release gate, PR merge and homepage verification; inspect source-data workflow receipts, merge reviewed Colorado snapshots and verify actual record counts/coverage. Colorado is not complete yet. 49 other states are queued and not represented as populated.
