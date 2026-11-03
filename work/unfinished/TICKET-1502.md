---
issue: 1502
project: "Search-to-Quick-Card discovery"
source_requests:
  - "2026-11-02 owner: automatically generate missing brand and website Quick Cards from search, Follow in Bubbles, eventual real Buy It Now"
state: implementing
dot: "🟡"
progress_percent: 30
progress_basis: "Two of eight core milestones source-authored: search result bridge and local interactive preview; tests, independent review, D1 sync, merchant checkout, merge, Android and live readback remain unverified"
sessions_spent: 2
sessions_remaining_estimate: unknown
agent: "ChatGPT · GitHub scoped source implementation"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-03T02:30:00Z"
repo: "www-infinity4/QuantaPhi"
branch: "feat/search-discovered-quick-cards-1502"
head_sha: "8d0b5d56b03fe9820cdb162cd103c663347a6dcf (source head before checkpoint update)"
pr: 1503
tests:
  - "test/search-card-discovery.test.mjs authored; execution not yet confirmed"
  - "test/quick-card-search.browser.spec.mjs GE Android path authored; exact-final-head execution pending"
  - "Search returns working Quick Cards CI passed for pre-final head 16fae7c; not acceptance for later commits"
ci:
  - "https://github.com/www-infinity4/QuantaPhi/actions/runs/41566832569: success on earlier head 16fae7c, not final"
  - "https://github.com/www-infinity4/QuantaPhi/actions/runs/41566949217: pending on source head 8d0b5d56"
merged: false
deployed: false
live_verified: false
blocker: "GitHub CI, independent review, Cloudflare D1 authorized ingest and merchant checkout integrations remain"
next_action: "Run exact-branch Node and Playwright tests, review spoofing/follow behaviors, fix failures before merge"
---

# Search creates missing Quick Cards · first source checkpoint

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1502

## PR and verified evidence

- Draft PR: https://github.com/www-infinity4/QuantaPhi/pull/1503
- Focused Quick Card CI succeeded at earlier head 16fae7c; the newer source head requires exact-head recheck. This checkpoint commit also changes PR head.

## Authored in this branch

- Added `search-card-discovery.mjs` to normalize public HTTPS origins, reject private/unsafe hosts and spoofed multi-subdomain brand matches, derive stable website IDs, and persist up to 200 device-local previews without duplicate domains.
- `index.html` dispatches fresh, run-scoped search result metadata; stale runs do not emit card discovery.
- `quick-card-search.mjs` reuses existing published cards first. On a new exact brand-domain hit or directly typed domain, it saves and displays the independent preview behind the search.
- `discovered-quick-card.html` and module render an accessible independent website card with official-site link, user-triggered Google site search, existing Follow/Collect/Share/+1 Build and Bubbles specialist instructions. The read API is disabled until the site is registered with a verified provider.
- `bubbles-card-catalog.mjs` allows same-device local previews to resolve via regular card intents, without pretending Cloudflare or signed-in provider synchronization.
- Wrote Node and Android-width browser regression tests including GE corporate vs GE Appliances and spoofed hostname rejection.

## Boundaries

- **Source authored, not source tested, CI passed, merged, deployed or live verified.** Code on this branch is not the public site.
- New generic websites are **device-local, search-sourced previews**, not Cloudflare-registered permanent public cards. Verified permanent D1 upsert is a future stage coordinating with #1423.
- No unsanctioned scraping, merchant impersonation, invented product photos/prices/ads, customer credentials or payments; no regulated-card publication.
- GE ambiguity: general corporate site ge.com is distinct from GE Appliances geappliances.com. New merchant Checkout requires merchant permission, price+stock evidence, explicit buyer authorization and order receipt; coordinate with #1250 and #1326.
- Repo coordinator lease was not claimed/verified in this session; this document is a checkpoint, not a lease receipt.

## Next executable action

Inspect CI on the exact PR head and fix any failing Node/Playwright or security checks before independent review; only then consider merging and deploying. Test Android 320/360/393/430px with real provider search and confirm card and wallet states remain correct.

## 2026-11-03 reconciliation session

- Previous exact-PR head `911f88f37d595d5f5f3978521a21aaeb17fde8e7` had 53/53 GitHub workflows completed successfully (including Search returns working Quick Cards).
- Reconciled against current main source without discarding unrelated index, site, or ledger additions. New merge-head CI and independent review still required.
- Other session independently persisted unlisted GE Appliances record in Cloudflare D1 under PR #1618. Avoid duplicate/public-promotion claims; source-based local previews remain separate.
- No provider checkout, wallet action, Cloudflare API mutation or live deployment was performed in this PR.
