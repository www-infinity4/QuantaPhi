# QuantaPhi product-source directory · 2026-11-02

Canonical issue: [#1423](https://github.com/www-infinity4/QuantaPhi/issues/1423). Related: Eastland [#1426](https://github.com/www-infinity4/QuantaPhi/issues/1426) and department selector [PR #1485](https://github.com/www-infinity4/QuantaPhi/pull/1485).

## Existing authenticated Cloudflare resources

- New isolated D1: `quantaphi-product-directory` (UUID `18f1b8da-ec20-45e4-8c19-c9037439949c`).
- Worker: `quantaphi-product-directory`, bound to D1 as `DB`; 100% API deployment reported by Cloudflare and workers.dev enabled.
- Expected URL: `https://quantaphi-product-directory.marvaseater.workers.dev`. Independent HTTP response and Android readback are **not yet confirmed**.
- Authenticated D1 readback 2026-11-02: 8 source-verified *brand destinations*, 9 collection links, 7 shelves, 13 brand-to-shelf links, **0 published offers**, import receipt `20261102-x-quickcard-batch1`.
- Store only original source links and editorial category context; no copied brand images, price, stock, ratings, ads or affiliation claims. `image_url` remains empty and `image_rights` unverified. A public brand listing is not a verified product advertisement.

## Seed subjects and comparisons

| Department | Main screenshot subject | Comparable source-backed subject | Source directory |
|---|---|---|---|
| Fashion / Footwear | Eastland | G.H.BASS | https://eastlandshoe.com/ ; https://www.ghbass.com/ |
| Food / Drinks | Jarritos | Sidral Mundet | https://jarritos.com/flavors/ ; https://sidralmundet.com/our-products/ |
| Home / Cleaning | Comet | Bon Ami, Bar Keepers Friend | https://cometcleaner.com/products ; https://www.bonami.com/products/ ; https://barkeepersfriend.com/ |
| Food / Groceries | Walmart bettergoods | expand after source verification | https://www.walmart.com/browse/food/bettergoods/976759_7128585_8911633 |

Walmart's Greek/Mediterranean pizza **is a user-reported product idea**; no current named product link, price or inventory has been independently verified. Avoid treating the screenshot narrative as merchant data.

## Read-only API contract

- `GET /v1/health` database counts
- `GET /v1/shelves` categories
- `GET /v1/brands?department=Food&limit=24&offset=0` department brands
- `GET /v1/mixed?limit=24&offset=0` all-ages brand union
- `GET /v1/collections?brand=jarritos` source collections
- `GET /v1/offers` **empty until rights, source freshness, stock, price and editorial approval are proven**

The Worker rejects non-GET requests, limits pagination, and isolates all-ages content. These are brand-source records; category assignment is not evidence of a current paid campaign or licensed creative.

## Next gates

1. Independent live HTTP readback from Worker endpoints, then browser mobile 320/360/393/430px.
2. Add reviewed migration and idempotent ingestion source to this PR; do not silently alter existing user/store/identity D1 tables.
3. Reuse PR #1485's existing 27-department original-card selector for integration after it is accepted and deployed; do not fork or duplicate homepage carousel state.
4. Build a first-party Quick Card adapter with source-first image/official links, working neutral Follow / Star / Collect / Share / +1 Build controls; show missing image/offer states honestly.
5. Onboard official APIs/merchant feeds or explicit image licenses; store independent offer/price/rights expiry, sponsor evidence and real product data before publishing advertisements.
6. Keep every new record reusable in Santa's Helper, ShopPhi, coupon wallet (only verified coupons), category search and Mixed.

No merge, homepage activation, commercial license, wallet debit, or production Android acceptance is asserted by this source-only branch.
