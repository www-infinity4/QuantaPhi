---
issue: 1423
project: "Source-backed Quick Card merchandise directory"
source_requests:
  - "2026-11-02 owner X screenshots: Eastland, Jarritos, Comet, Walmart bettergoods and comparable brands"
state: implementing
dot: "🟡"
progress_percent: 58
progress_basis: "5/9 milestones: D1 catalog, API binding, live source readback, Oracle frontend source, local tests; CI/review/merge, mobile and actual photo/offer approvals remain"
sessions_spent: 2
sessions_remaining_estimate: unknown
agent: "ChatGPT · scoped owner request"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-03T19:19:35Z"
repo: "www-infinity4/QuantaPhi"
branch: "feat/product-directory-oracle-card-20261103"
head_sha: null
pr: 1627
tests:
  - "Local node --test worker.test.mjs: 5/5 pass after RED expiration regression"
ci: []
merged: false
deployed: false
live_verified: false
blocker: "Worker API live, but homepage adapter is source-only until exact-head CI, independent review, merge, Pages and Android readback; licensed product photographs/offers not yet available"
next_action: "Review exact-head PR #1627 CI and mobile browser results; address concrete failures before merger and Pages production readback"
---

# Nov 2 source-catalog checkpoint

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1423

## Actual Cloudflare receipts

- Created **new isolated D1** `quantaphi-product-directory` (UUID `18f1b8da-ec20-45e4-8c19-c9037439949c`) without touching existing Quick Cards, WidgetPhi, wallets or identities.
- Created 7 named tables + indexes. The offers table has three independent expiration columns (`listing_expires_at`, `price_expires_at`, `rights_expires_at`).
- Source-verified brand directories: Eastland, G.H.BASS, Jarritos, Sidral Mundet, Comet, Bon Ami, Bar Keepers Friend, Walmart bettergoods. Linked **9 official collection pages** into **7 shelves** (13 mappings), 0 published product offers.
- Authenticated D1 query independently returned 8 brands, 9 collections, 7 shelves, 13 mappings and 0 offers. Idempotent receipt `20261102-x-quickcard-batch1` written.
- Worker `quantaphi-product-directory` uploaded and 100% API deployment reported; D1 binding `DB`; workers.dev subdomain enabled. **Public GET response independently read back on 2026-11-02**.
- Tests: red case found single-expiry weakness, followed by source-fix; local 5/5 passed.
- GitHub branch mirrors Worker source and scoped tests; draft PR/review are next.

## Acceptance still missing

- Public GET health, Mixed and offers independently read back via separate source reader on 2026-11-02: health 8/9/0, Mixed 8 all-ages brand records, offers empty. Need verify department filtering, pagination, malformed parameters and non-GET with HTTP client.
- Exact-head CI, independent review, eventual merge and actual Android 320/360/393/430px QuantaPhi Quick Card readback.
- Wire to existing 27-department selector PR #1485; don't create another independent top-level carousel. Mixed is all-ages only; keep 21+ separate.
- Original image rights/approved ads, official merchant feed integrations, separate verified price and listing freshness/availability receipts. Until then display official source links and no invented paid promotions.
- Preserve source attribution, user corrections, Bubbles/ShopPhi/Santa's Helper reuse and current neutral card actions.

## Scope limits

The screenshot's pizza anecdote is user-reported, not evidence of a currently available exact Mediterranean pizza listing. Stored verified Walmart bettergoods **frozen category**, not a fabricated product listing or price. No Star Coin events or checkout were touched.

## Independent public GET readback — 2026-11-02
- URL `https://quantaphi-product-directory.marvaseater.workers.dev/v1/health` responded with `status=ok`, `source=cloudflare-d1`, `brand_count=8`, `collection_count=9`, `publishable_offer_candidates=0`.
- `/v1/mixed?limit=8` returned eight brands, Eastland/Jarritos/Comet/bettergoods/comparables, with their department and official source fields.
- `/v1/offers` returned `data=[]` (no approved merchandise/sponsor ads), as intended.
- **Live API verified, not main QuantaPhi homepage/app release verified.**
- Draft PR created at https://github.com/www-infinity4/QuantaPhi/pull/1492 .

## Nov 3 2026 · second engineering session
- Confirmed source PR #1492 **merged** at `3d572569c9bca880434af665ca8ac43efbcb1412`; API previously live-verified (8 brands, 9 collections, 0 approved offers).
- Created branch `feat/product-directory-oracle-card-20261103` and **draft PR #1627**. One original `productDirectoryCard` root added to homepage, Oracle `choices` and `CARD_DIRECTIONS` registration, read-only Cloudflare D1 frontend module, CSS and tests.
- Six core tests RED before code (missing implementation), then GREEN locally: Mixed/department routing, 21+ exclusion, safe URLs, collection source matching, deduplication, no-repeat rotation.
- Added dedicated GitHub Actions workflow for syntax, source, DOM integration and existing Worker tests. At session note time exact-head CI is queued; completion/merger and live Pages readback not asserted.
- No wallet/identity, advertiser checkout or subscription changes. Original abstract visual is **not** licensed product photography; separate rights gate retained.
- PR #1485 global 27-department selector remains draft/unmergeable, deliberately untouched; new card has its own bounded department filter while preserving existing Oracle structure.
