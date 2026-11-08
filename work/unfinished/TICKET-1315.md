---
issue: 1315
project: "QuantaPhi Quant feed/ads and privacy"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/1315
state: implementing
dot: "🔴"
progress_percent: 18
progress_basis: "Issue scoped, no independently accepted product, partner grant, payout or email send; Explainable in-app ranking, sponsor disclosure, consented metrics and zero unrelated wallet mutation"
sessions_spent: 3
sessions_remaining_estimate: unknown
agent: "ChatGPT issue scoping, no coordinator lease"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/otc-blue-star-neosporin-carousel-20261107
head_sha: null
pr: null
tests: []
merged: false
deployed: false
live_verified: false
blocker: "External provider qualification and/or account-specific delegated permissions not yet verified"
next_action: "Verify exact-head interactive card CI and responsive browser, then review/merge minimal OTC card PR and confirm live Oracle deep links"
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

## November 7, 2026 CT · Screenshot-requested reversible recommendations control

- **Existing job:** #1315. Owner's X screenshots discuss Bubbles card building and unwanted mass advertising. Do not infer access to X's targeting system or any private profile from those screenshots.
- **Focused source milestone:** `feat/for-you-not-for-me-1315-20261107`, draft PR [#1835](https://github.com/www-infinity4/QuantaPhi/pull/1835). Scope is only QuantaPhi's existing Oracle For You carousel, not a replacement builder, provider API or ad purchase system.
- **Implemented in branch:** `quanta-feed-rank.mjs` stores a bounded, sanitized browser-local `hiddenForYou` list; `oracle-card-deck.js` honors it in eligibility, ranking and next-card selection. Public, Following and original card DOM are retained. `index.html` + `oracle-card-spotlight.css` provide accessible Android-sized Not for me / Show in For You / Restore hidden controls.
- **Tests:** `test/oracle-feed-not-for-me.test.mjs` and `test/oracle-feed-not-for-me.browser.spec.mjs` added to existing interactive card CI. Four independent source-execution checks passed against fetched branch code with the accepted-brand classifier stubbed; this is *not* production or Android proof. Exact-head GitHub CI and browser result are pending.
- **Safety:** No real visitor accounts, advertising provider credentials, Cloudflare D1, GitHub writer lease, purchase approval or reward-wallet ledger touched; no external X feed control claimed. Public remains broad, and exclusions can be restored on the same browser.
- **Canonical full-ticket progress:** still estimated 18%; this partial feature does not satisfy sponsorship, consented metrics, live browser acceptance, publisher rights or deployment.
- **Next executable action:** Inspect exact-head PR #1835 interactive-card Node + Android-width Playwright checks, fix any failing test on the same branch, obtain independent review, then request merge/deployment verification through the existing release gate. Do not claim live availability before readback.
