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
