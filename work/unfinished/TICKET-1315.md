---
issue: 1315
project: "QuantaPhi Quant feed/ads and privacy"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/1315
state: implementing
dot: "🔴"
progress_percent: 24
progress_basis: "Issue scoped, no independently accepted product, partner grant, payout or email send; Explainable in-app ranking, sponsor disclosure, consented metrics and zero unrelated wallet mutation"
sessions_spent: 4
sessions_remaining_estimate: unknown
agent: "ChatGPT issue scoping, no coordinator lease"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/media-star-fred-launcher-otc-featured-20261107
head_sha: pending-final-checkpoint
pr: 1820
tests: [test/essentials-live-cards.test.mjs, test/essentials-companion-cards.test.mjs, test/essentials-cards.browser.spec.mjs]
merged: false
deployed: false
live_verified: false
blocker: "External provider qualification and/or account-specific delegated permissions not yet verified"
next_action: "Check exact-head PR #1820 interactive-card CI and Android-width source links, then review merge/deploy eligibility; do not claim live until readback"
---

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

## November 7, 2026 · Owner accepted three companion Quick Card suggestions
- Added Aquaphor Healing Ointment 1.75 oz, BAND-AID Hydro Seal All-Purpose 10 ct, Cortizone-10 Maximum Strength Sensitive Skin 2 oz as three distinct original Oracle entries (8 reviewed static seeds total).
- Reviewed source links and package images from Walmart, Kroger/HealthWarehouse, and manufacturer labeling. Source ledger: `docs/MEDICINE-CABINET-EDITORIAL-SOURCES.md`.
- Additional one-tap buttons are beneath the owner-featured Blue Star and Neosporin pair; no duplicates, prices, sponsored rankings, or medical tracking.
- All three cards have distinct directions / drug-facts descriptions and manufacturer URLs, existing on-card Share/Collect/Follow/Build and mobile image fallback.
- TDD: added failing new-card assertions before the new records (all three IDs absent from source); expanded Node and mobile browser CI. Exact-head CI and actual Android acceptance pending. No live deploy, paid ad rights or partner authorization claimed.
- Preserved original #1315 privacy/ads goals; eight cards do not complete the full 50-state/promotional/ranking backlog.
