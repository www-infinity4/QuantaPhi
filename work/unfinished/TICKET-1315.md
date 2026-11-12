---
issue: 1315
project: "QuantaPhi Quant feed/ads and privacy"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/1315
state: implementing
dot: "🔴"
progress_percent: 20
progress_basis: "Issue scoped, no independently accepted product, partner grant, payout or email send; Explainable in-app ranking, sponsor disclosure, consented metrics and zero unrelated wallet mutation"
sessions_spent: 4
sessions_remaining_estimate: unknown
agent: "ChatGPT issue scoping, no coordinator lease"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/advertiser-donations-performance-review-20261107
head_sha: null
pr: null
tests: []
merged: false
deployed: false
live_verified: false
blocker: "Optional brand contribution/conditional $100 proposal has no signed commercial terms, verified merchant-order integration, processor authorization or approved pricing; source review only"
next_action: "Verify advertiser partner source/390px CI at exact PR head, independent legal and billing review; no payment/merchant launch without explicit agreement"
---

# TICKET-1315: QuantaPhi Quant feed/ads and privacy

## November 7, 2026 · Nontransactional advertiser support pilot (session 4)
- Owner requested optional brand donations (commercial voluntary contributions after receiving value) instead of boosting ordinary brand cards, with a separately opted-in **$100 / 30-day** small-business ad proposal tied to **$1,000 in verified QuantaPhi-attributed net sales**.
- The owner's stated charge condition is **$100 if sales fall below $1,000**, which is a fee on underperformance, **not a guarantee of $1,000 sales**. It is written explicitly for review, not represented as a confirmed offer.
- Branch: `feat/advertiser-donations-performance-review-20261107`. Pure validation/evidence module, inline request UI inside **existing Infinity Affiliates** card, mobile CSS, non-transactional public GitHub request link, 9 focused tests, 390px browser tests, policy doc and extended CI. No payment or wallet actions.
- Source-level work is **staged only**; no CI/independent review/merge/production readback yet on this checkpoint. No first-party merchant receipts, campaign contracts, donation receipts or D1 settlement ledger claimed.
- Estimated overall #1315 acceptance now 20%; this narrower design milestone is not acceptance of issue #1315. No owner-runner lease claimed; another contractor must independently review commercial terms and security before any live billing.
- Next single action: inspect exact PR head CI for advertiser program and existing Infinity Affiliates browser behavior; repair failures on the same branch, then request independent review.

# TICKET-1315: QuantaPhi Quant feed/ads and privacy

## November 7, 2026 · User-requested live carousel recovery
- **Confirmed blocker:** OTC cards were only in unmerged PR #1738, and main still had no `essentialsQuickCards` registration. Original PR is mergeable=false.
- Small main-based release branch: `feat/otc-blue-star-neosporin-carousel-20261107`. Reuses existing #1315 issue and prior reviewed seed code; changes no wallet/identity/checkout. Preserves existing #1738 for optional Power Chain functionality and later conflict resolution.
- Five independent editorial OTC source cards including **Blue Star Anti-Itch 2 oz** (Walmart item 10316529) and **Neosporin Original Triple Antibiotic 1 oz** (Walmart item 10294303). First aid is distinct from skin itch; real source-hosted photographs, official item links, no stale prices or paid ads.
- Main Oracle viewer has direct Blue Star and Neosporin jump buttons; hidden source host supplies the original interactive article, shared Follow/Star/Collect/Share/Build controls, Public and Following, and no medical click/view profiling. Photo failure keeps the item actionable.
- Reviewed JSON importer capacity <=120 records per batch is preserved; zero additional unreviewed listing claims.
- Added Node source + wiring tests and Android-width Playwright navigation/Following tests into the existing CI. **Exact-head CI, independent review, merge, deployment and live Android acceptance are pending until verified**.
- Status: estimated 18% of full #1315 acceptance; not an accepted sponsorship or live merchant partnership. No coordinator lease claimed.

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

## November 8, 2026 CT · Quant event ingestion source stage

- Reused canonical issue [#1315](https://github.com/www-infinity4/QuantaPhi/issues/1315); related to genuine click telemetry in #1674. **No new ticket or coordinator lease claimed.** Isolated clean-main branch `feat/quant-events-d1-queue-1315-20261108`, draft [PR #1884](https://github.com/www-infinity4/QuantaPhi/pull/1884).
- Staged `workers/quant-events/` with separate, **unapplied** D1 `users/events` schema (epoch milliseconds, compound user/type/time index, idempotent event keys), authenticated trusted Worker ingestion, Queues/DLQ config *example*, and Node 22/Python SQLite CI smoke workflow. `quant-ai.quant_events` and all Quanta/StarCoin/GIT/wallet ledgers were not modified.
- Source package verification before GitHub stage: **17 Node and 4 Python SQLite tests passed; local TypeScript type-check passed**. Initial new GitHub workflow failed on a test-only `const URL` shadowing error; fixed in `dd8feadb5388f7619e6dc1012dd5ca60f9cdbbef`. Fresh exact-head GitHub CI status is **pending verification** and must be inspected before review.
- Status **source staged, production unverified**; not merged, no D1 migrations, Queue/DLQ provisioning, secret/binding changes, tracked production events, BI writes, credits or payouts.
- Estimate: issue-wide progress remains **18% as last documented** pending accepted opt-in personal ranking/real sponsorship and actual release receipts. Session: one focused source-staging continuation; remaining sessions unknown.
- Gate: existing signed account/user verification, behavioral and postal metadata consent, documented retention and erasure, explicit infrastructure budget, isolated staging D1 migration, queue backlog/load verification, exact-head CI and independent security review.
- **Next single executable action:** verify [PR #1884](https://github.com/www-infinity4/QuantaPhi/pull/1884) exact-head CI and resolve its failures; then pass isolated backend to independent reviewer. No production rollout yet.


## November 8, 2026 CT · Signed identity and location consent hardening of draft PR #1884

- Continued **the same** existing issue [#1315](https://github.com/www-infinity4/QuantaPhi/issues/1315), same draft PR [#1884](https://github.com/www-infinity4/QuantaPhi/pull/1884), same isolated `feat/quant-events-d1-queue-1315-20261108` branch. No fresh issue, external identity adapter, runner lease, resource purchase or production deployment.
- Source change: ingress now verifies short-lived HMAC-SHA256 subject proof from a *future trusted QuantaPhi signed-in identity bridge*, rejects missing/expired/tampered/mismatched user identity, and returns 503 when identity secret or explicit INGEST_MODE is absent. Bearer alone is not enough to authorize a JSON user ID.
- Region/postal extraction is privacy-gated: neither may enter Queue/D1 unless the trusted identity source signs `geo=1` after consent **and** the reviewed server `GEO_STORAGE_ENABLED=true` flag exists. Otherwise stored edge values are null. No actual customer consent was claimed.
- Local test-first receipt: six new identity/geo/mode tests initially reproduced failures in prior Worker; after Green repair, **23/23 Node tests**, **4/4 Python SQLite tests** and TypeScript `tsc --noEmit` passed in the working container.
- GitHub CI at source head `8adc3c6f6d0c97aa184f7ada26c096569218eabc`: all **5/5 workflows completed success**; dedicated Quant events workflow [run 42559549406](https://github.com/www-infinity4/QuantaPhi/actions/runs/42559549406) completed **13/13 Worker/SQLite tests** and a passing Python schema check. This checkpoint append itself will advance the head and must be rechecked separately.
- Review state: no independent PR review recorded at inspection. Existing QuantaPhi authenticated identity signer wiring, consent audit/retention, paid Queue + isolated D1 resource budget, isolated staging migration and real load/Android readback are still **blocked**. Do not merge/deploy/publish tracked events until gates pass. Parent issue-wide prior progress estimate 18% remains unchanged; source improvement is not production acceptance.
- **Next executable action:** have an independent reviewer validate the HMAC identity adapter contract and consent policy against QuantaPhi's actual signed-in session gateway; then authorize isolated D1/Queue staging and observe Queue → D1 replay/readback before considering release.

## November 8, 2026 CT · Wallet-verified event bridge and CI repair (#1884)

- **Same issue [#1315](https://github.com/www-infinity4/QuantaPhi/issues/1315)** and same draft [PR #1884](https://github.com/www-infinity4/QuantaPhi/pull/1884); scope isolated to opt-in telemetry, no new project, lease or unreviewed deployment.
- Built `workers/quant-events/src/wallet-bridge.mjs`: reuses the **existing** `walletIdentity(request,env)` server verifier and BOT_WALLET service binding; blocks `bc_` pairing credentials and client-supplied user IDs; maps a verified Wallet subject to an HMAC pseudonym. Uses independent service bearer + short-lived signed identity proof to send only recognized Quick Card interaction types to ingest. No browser credentials or raw Wallet ID are sent to the event Worker.
- Added isolated `quant_event_consents` migration `0002_quant_event_consents.sql`, consent checks including revocation, and an opt-in protocol *without* a public auto-consent route. Location consent stays OFF (`geo=0`); only verified analytics-consent rows authorize events. No real users have been consented or profiled.
- Introduced **fail-closed** `/api/quant-events` route in central site Worker guarded by `EVENTS_BRIDGE_ENABLED==='true'` and an isolated `EVENTS_BRIDGE` service binding. No route activation, resource, secret, or binding was changed in Cloudflare. Separate bridge Worker requires BOT_WALLET / EVENT_CONSENT_DB / EVENTS_SERVICE and secret bindings if ever approved; included template is `wrangler.bridge.example.jsonc`, not a deployable configuration.
- **Test-first receipts:** missing Wallet bridge initially caused [GitHub Quant events run 42561151332](https://github.com/www-infinity4/QuantaPhi/actions/runs/42561151332) failure. Static import in site Worker broke older VM/data-URL regression tests; changed architecture to isolate bridge behind service binding and corrected integration fixture syntax. These are genuine failed tests, not omitted artifacts.
- **Exact source head** `e9d678f58cdbe6265f2661b91b523adbd7980602`: 15/15 GitHub workflows completed **success**; dedicated Quant events [run 42561853263](https://github.com/www-infinity4/QuantaPhi/actions/runs/42561853263) reports **24/24 Node tests passing** plus Python SQLite schema and compound index check, including synthetic Wallet→consent→HMAC→Queue path, consent revocation and no D1 persistence claim. Site, wallet, Bubbles and protected page regressions also success. GitHub reported mergeable=true and draft/open; no independent PR approval.
- **Production state:** `quant-ai.quant_events`, StarCoin, Quants, GIT, Bubble Bits and all wallet/identity databases untouched. No telemetry D1/Queue/DLQ provisioned; no D1 migration, paid resource, site deployment, customer session acceptance, or browser consent UI. This remains source-tested, **NOT independently approved or live**. Broader issue progress remains the previously documented 18% estimate.
- **Next single executable action:** obtain independent privacy/security review of the isolated service-binding/consent contract; then, with explicit resource budget and owner-authorized staged test consent, provision separate staging D1/Queue/DLQ, verify Queue→D1 and revoke/delete behavior, and benchmark before any real user events. New documentation-only checkpoint commit will require a fresh exact-head CI readback.


## November 8, 2026 CT · Analytics consent settings, delayed Queue revocation guard (#1884)

- Continued **same** issue [#1315](https://github.com/www-infinity4/QuantaPhi/issues/1315), same draft [PR #1884](https://github.com/www-infinity4/QuantaPhi/pull/1884). No new issue, no coordinator lease, no resource purchase or Cloudflare migration/deployment.
- Added disabled-by-default `/api/quant-events/consent` preference route in site Worker and isolated bridge Worker; independent `EVENT_CONSENT_MANAGEMENT_ENABLED=true` flag; Wallet-verifier-only GET status and explicit checked v1 POST grant/revoke, no client-selected user ID. Both collection and consent management flags remain OFF by default. Added `quant-events-privacy.html` and `quant-events-privacy.mjs` with readable Oracle-style mobile controls, no automatic grant, existing Wallet token resolver, explicit statement that this is separate from Google Analytics/AdSense; linked from Account Connections and privacy policy.
- The Queue D1 consumer now uses **atomic per-insert consent guards** on `quant_event_consents` with revoked flag and a consent-start epoch not later than the server-accepted event timestamp. 16-row prepared INSERT uses 98 bound parameters, within the 100 cap. Delayed queued messages are dropped when revoked or accepted before a renewed opt-in. Mixed-consent batches cannot write another account. Direct D1 now requires explicit `DIRECT_STAGING_ALLOWED=true` and applies the same consent SQL guard; production Queue mode remains recommended.
- Test-first red receipts: consent tests initially failed before endpoint implementation and initial fixture syntax was corrected; queued-after-revoke tests failed before guarded SQL was added; direct-mode unlock regression failed before code repair. Broad site VM regressions from prior iteration remained resolved by private service-binding isolation.
- **Exact code/doc head at verification:** `2a609cb0c058d24f35c801bdb1b874b20f7580e7`. **20/20 GitHub workflows success**, no pending or failures. Dedicated [Quant events CI run #42563356314](https://github.com/www-infinity4/QuantaPhi/actions/runs/42563356314): **37/37 Node tests pass**, SQLite migration & compound-index check pass. Includes synthetic consent grant/revocation, 0 unintended event insert after queued revoke/regrant, privacy page contract and direct staging lock tests. This checkpoint commit itself will advance PR head; recheck exact-head CI after commit before finalizing.
- **Still incomplete:** standalone consent page and Worker are **not deployed**; no live account, Queue, D1, card event provider, BI tool, currency/Wallet changes or actual user consent has been captured. Data export/deletion and retention lifecycle, per-user rate limit/backpressure, third-party analytics separation, Cloudflare staging budget and independent privacy/security review remain required. The overall issue #1315 encompasses ranking/ads and stays at prior 18% estimate; source-only telemetry is not commercial completion.
- **Next executable action:** have an independent reviewer assess consent text, request boundaries, stale Queue and erasure/export design against site/Wallet identity rules, then approve isolated staging with an explicit spend cap. Do not merge/enable tracking without that review and live-readback evidence.


## November 8, 2026 CT · Source merged and isolated staging receipt (#1884)

- This documents **existing** #1315, not a duplicate issue or a new release authorization. The owner explicitly asked for Cloudflare staging and merge. GitHub [PR #1884](https://github.com/www-infinity4/QuantaPhi/pull/1884) was squash **merged** into `main`: commit [`df93c0c9ddf1fba370b613e04586ca32918404a7`](https://github.com/www-infinity4/QuantaPhi/commit/df93c0c9ddf1fba370b613e04586ca32918404a7). Verified closed/merged=true and merged timestamp `2026-11-09T05:29:46Z`. GitHub `main` has the Worker/consent source and disabled-by-default site routes.
- At tested pre-merge source SHA `b5434c731ac2e77db496ba46e9882fdf7cccdeaa`, **20/20 PR CI workflows SUCCESS**, dedicated [run 42567316682](https://github.com/www-infinity4/QuantaPhi/actions/runs/42567316682) **42/42 Node tests plus SQLite schema/index check SUCCESS**. Six Copilot review comments found; six fixes committed, replied, and resolved. Copilot posted a COMMENTED review (full agentic suite unavailable), **not a formal independent APPROVED review**; owner expressly authorized source-only merge and production event flags remain off.
- Real Cloudflare staging: created isolated D1 `quantaphi-quant-events-staging`, separate Queue `quantaphi-quant-events-staging`, DLQ `quantaphi-quant-events-staging-dlq`, and small HTTP pull consumer; installed migrations 0001 and 0002 with `users/events/quant_event_consents` and two indexes. Synthetic event `stage-event-00000001`: Queue push/pull, consent-gated D1 batch receipts changes `[1,1]`, SQL readback, Queue ack. Synthetic event `stage-event-00000002`: queued before consent withdrawal, guarded D1 insertion changed `0` rows, SELECT found `0`, ack. Cleanup removed the three synthetic records, and final staging D1 counts `users=0/events=0/consents=0`. Queue backlog was 0 on readback.
- **Production remains OFF**: Cloudflare live `quantaphi-site` settings at inspection had `BUBBLES_CONNECTIONS`, `CODEPHI`, `QUANT_AI`, `QUANTAI` bindings but no `EVENTS_BRIDGE` or event enable flags; last read deployment dated November 6. No real user analytics, new production Worker, Wallet mutation, BI export, paid load test, or 100k DAU benchmark. Staging canary used HTTP pull and API SQL (not the exact compiled Worker script), so full repo Worker runtime acceptance is a separate gate.
- **Unfinished steps:** isolated compiled staging Worker deployment/Queue consumer, staging secret/service wiring, actual Wallet-user consent UI test, retention/export/delete and abuse/budget safeguards, independent privacy/security acceptance before production activation. No general issue #1315 completion or user-facing card revenue claims. Keep existing broader issue progress estimate 18% until other feed/ranking acceptance milestones.
