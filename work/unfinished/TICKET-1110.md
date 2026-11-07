---
issue: 1110
project: "QuantaPhi Traffic Intelligence — human/bot source reconciliation dashboard"
source_requests:
  - "2026-11-06: Create a Site for QuantaPhi.org separating realtime, verified bots, suspicious, unknown; pages, comparisons, CF/GA4, crawler and wiring records"
state: source_tested
dot: "🟡"
progress_percent: 35
progress_basis: "Estimated: Android source/dashboard, strictly validated metric contract and source docs completed; authenticated page-level, GA4 and live acceptance outstanding"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT; source-only, no active executor lease"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-07T01:59:18.802Z"
repo: www-infinity4/QuantaPhi
branch: feat/traffic-intelligence-20261106
head_sha: 74eea065ab1ff1204c091e34a7bb64b5a657544c
pr: 1770
tests:
  - "Contract: test/traffic-intelligence.test.mjs; CI workflow now includes it; final result pending"
ci: []
merged: false
deployed: false
live_verified: false
blocker: "Cloudflare refresh secret not configured in last checked snapshot; GA4/Data API and detailed per-page/bot feed not connected"
next_action: "Inspect exact-head Site traffic safety checks; fix failures; obtain independent review before release"
---
# Ticket #1110 · Session checkpoint

## Scope delivered in branch
- Dedicated mobile-first `traffic-intelligence.html`, indexed from existing homepage menu and traffic details.
- Current existing Cloudflare D1 aggregate reader, never converted to a person count; stale/no-token/source errors preserved.
- Separate cards for GA4 realtime active users, verified bots, suspicious, unclassified and human-likely signals, each unfilled unless source-backed.
- Per-path inventory from sitemap, period comparison controls, browser crawler-file diagnostics, source registry, local-only notes and evidence export.
- Strict `traffic-intelligence-core.mjs` count/source/window/path validation; simulated negative, missing-source and incompatible-period tests.
- `docs/TRAFFIC-INTELLIGENCE.md` records upstream sources, sampling and permissions, secure future API contract, missing wiring and release gates.

## Still missing (no success claim)
- Actual authorized `/api/traffic-intelligence` Worker/GA4 adapter and live split metrics.
- Full deployed page census and GA4 instrumentation coverage, permitted bot and path reads, GA4 Data API read-only credentials.
- Verified crawler events (not just browser 200), AdSense diagnosis and Cloudflare bot/referrer permissions.
- Exact-head CI and review, merge, deployed URL and 320–720px Android readback.

Existing canonical audit: https://github.com/www-infinity4/QuantaPhi/issues/1110. Existing D1/Worker guide: `docs/SITE-TRAFFIC.md`.
