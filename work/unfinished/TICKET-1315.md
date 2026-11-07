---
issue: 1315
project: "QuantaPhi Quant feed/ads and privacy"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/1315
state: implementing
dot: "🔴"
progress_percent: unknown
progress_basis: "Issue scoped, no independently accepted product, partner grant, payout or email send; Explainable in-app ranking, sponsor disclosure, consented metrics and zero unrelated wallet mutation"
sessions_spent: 3
sessions_remaining_estimate: unknown
agent: "ChatGPT issue scoping, no coordinator lease"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: trend-card-orange-pilot-20261107
head_sha: 542f8249e13a42822ab38efb9d42ba627a48429d
pr: 1781
tests:
  - "Infinity Trend-to-Card pilot checks run 42348331838: passed on 542f8249e13a42822ab38efb9d42ba627a48429d"
merged: false
deployed: false
live_verified: false
blocker: "Quant-AI data is connected and staging /decision works, but production site TREND_CARD_ENGINE binding/PR merge, an actual signed-in user decision receipt, independent browser/artist QA, and public ad moderation are outstanding"
next_action: "Review remaining CI and browser failures; verify private TREND_CARD_ENGINE site binding in staging; then merge/deploy only after Red rights and Android acceptance"
---

# TICKET-1315: QuantaPhi Quant feed/ads and privacy

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1315

Status: scoped RED; no accepted external commercial partnership, connected provider account, site-side product or email send is claimed. This is one documented planning session, not an execution lease.

## First verified requirement
Inspect QuantaPhi first-party feed ranking, source attribution, ad controls and wallet isolation.

## Completion definition
Explainable in-app ranking, sponsor disclosure, consented metrics and zero unrelated wallet mutation.

## Dependencies and security
- Official partnership grants and ownership proof are external decisions.
- No blanket administrator rights to X, Facebook, ChatGPT or provider customer accounts.
- No passwords, private customer data, credentials, email harvest or platform bypass.
- Auth scopes must be least privilege, per business and revocable.
- Do not edit QuantaPhi wallet or Cloudflare identity bindings.
- Source PR, exact-head tests and independent acceptance must precede any completion claim.
- Send messages only after verified contacts and owner-approved recipient batch, with delivery receipts.

## Session receipt
GitHub issue created during the owner-request scoping session; checkpoint staged in a documentation-only branch. No real implementation, provider consent, commercial payout or outside send has occurred.

## November 7 · Trend-to-Card engineering receipt (second documented session)
- Source draft on `trend-card-orange-pilot-20261107`: static public creator shelf next to sponsor board; `trend-card-core.mjs` source/Quant review gates; isolated D1 Worker and SQL; 8 durable role definitions and authenticated claim/complete paths; Pink Floyd *Animals 50* official-source row proposed only; docs and focused Node tests.
- Local test record: seven initial focused tests passed, with additional lease/receipt scenario added afterward. GitHub CI and Android readback not yet established.
- No active coordinator lease claimed; this is not an assertion eight autonomous agents were spawned or a Cloudflare Worker deployed. No wallet, customer identity or production state mutated.
- Orange approval route deliberately 503 until an actual trusted Quant AI verdict and reviewer grant are connected. Nothing auto-posts.
- Next action: open reviewable PR, check exact-head CI, inspect worker security and Red/Green Android behavior, then deploy to isolated staging if approved.

## November 7 · On-demand Quant AI correction and implementation (third documented session)
- Independently inspected Cloudflare: production `quant-ai` Worker has `DB` (Quant-AI), `QUANTA_DB` (infinity-ledger), `IDENTITY_DB` (starquest-ledger), and `quantaphi-site` already binds two service aliases to the existing `quant-ai` Worker. No new model, Quant mint, wallet transfer, account secret or permanent model loop needed.
- Verified bounded aggregate **all-account** counts only: the Quant AI D1 had 0 packet/tag/event rows; the authoritative ledger had 37 committed searches, 471 card interactions, 97 collected items and 202 research revisions. These are not any one person's counts and no identity or raw personal record was released in the report.
- Added `workers/trend-card-engine/quant-decision.mjs` to read the existing databases only on authenticated explicit `consent:true` request. It resolves the existing SQ device token server-side; requires active wallet; reads **only that user's** bounded committed search history, interactions, collects, and permissioned/active Quant tag evidence; returns ranked card IDs/reasons and evidence counts without wallet IDs or raw queries. It never grants public ad placement.
- Added `POST /decision` and restricted CORS to staged Trend-to-Card Worker; updated D1/service bindings and deployed a new Cloudflare staging version `6fa83626-9f32-4f95-bf17-7ab0b34525bf`, deployment `7f92a1d3-4b27-4c36-b52c-cc0c976485a1`. Verified `/health` readback shows both Quant AI service and data connections true, `decision_mode=on_demand_per_user`, zero active autonomous bots. `/featured` returns no publicly approved items, as intended.
- Updated Orange's durable D1 job from blocked to **queued**, because existing Quant AI evidence is available and actual work is triggered only when a permitted user requests a recommendation. This does not clear the independent public rights/moderation blocker.
- Added `quanta-feed-orange.mjs`, optional For You/Next handoff, and a private site Worker route via `TREND_CARD_ENGINE`, staged on PR #1781 only. Missing binding fails closed, legacy Quant ranking remains fallback; visitor selection triggers the read, not background periodic scoring.
- Dedicated `Infinity Trend-to-Card pilot checks` CI run 42348331838 passed. Broader repo still reports an artist radio source failure; Android browser status requires final inspection. Source PR #1781 is **open/draft/unmerged**, production homepage and same-origin Orange proxy not yet live. No actual signed-in visitor request verified yet; do not call it production complete.
- Next single action: Red review broad CI and verify site-binding + signed-in synthetic Android browser acceptance, then release through approved merge and on-site readback.
