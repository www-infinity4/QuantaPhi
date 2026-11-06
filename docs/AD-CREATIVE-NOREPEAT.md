# QuantaPhi ad inventory: unique creative delivery

Canonical owner request: **every ad shown must be new, never a recycled impression**.
Related issue: [#1608](https://github.com/www-infinity4/QuantaPhi/issues/1608).
This is source code on a review branch; it is **not a live Cloudflare migration or deployment**.

## What now works in source
- Quick Ads selects only unseen ad IDs. When inventory is exhausted, it returns no ad.
- A localStorage creative ledger survives refresh/restart on that browser. If storage is unavailable or full, Quick Ads shows no ad rather than claiming persistent no-repeat.
- A genuine new approved creative may be added without resetting the ledger; `equivalence_key` blocks identical campaign variants under different IDs.
- The existing Cloudflare D1 merchandise-source directory, not an empty duplicate database, gains an isolated `ad_creatives` table and a reserved `ad_seen_receipts` table.
- Only reviewed, current, licensed/owned-image rows appear in the read-only public `GET /v1/ads` API. No records are seeded without evidence.
- The browser tries the existing D1 Worker `/v1/ads` feed. If unavailable, it uses the existing first-party house ads; it does not fabricate replacements.

## Strict content acceptance before adding a row
A brand or product **source listing is not a paid advertisement**. A publisher must hold verifiable source URL, destination, stable content hash/equivalence key, real rights-cleared image, checked date, rights expiry, current campaign window and explicit editorial approval. Sponsored rows additionally need a valid original sponsor-agreement evidence link and correct disclosure. Never copy unlicensed images, invent availability or prices, use personal SSI/identity data, or mint wallet rewards for ad views.

New stock is added through reviewed/idempotent ingestion into `ad_creatives`. Do not expose anonymous public ad creation or allow arbitrary URL rows to bypass review. Use the existing Product Directory D1 database: `workers/product-directory/migrations/0001-ad-creatives.sql`, then publish the reviewed Worker version. Do not touch identity tables, wallet tables or existing directory records.

## Verification and release gates
1. Run `node --test test/quick-ads.test.mjs test/product-directory-worker.test.mjs` and repository CI at the exact PR head.
2. Review and apply the migration to the **existing** D1 before deploying the Worker. Until then `/v1/ads` can fail closed, and the UI still uses house ads.
3. Import one genuinely approved/rights-cleared creative through a reviewed admin process (no fake test ads into production). Check its image, disclosure, link, source expiry and new display.
4. Verify repeated carousel changes, browser restart, exhausted inventory and disabled localStorage on Android.
5. To guarantee non-repeat **across devices and simultaneous tabs**, connect `ad_seen_receipts` through the existing authenticated identity adapter and perform a server-side atomic claim keyed by the verified account + equivalence key before displaying. That API **is not implemented here**. Browser-local history does not guarantee account-wide uniqueness.
6. Audit other ad placements (in-card, cast and any third-party embedded networks) and route first-party ads through the shared receipt policy. External ad networks require their own supported controls and cannot be guaranteed by this module.

No paid placement, DB migration, account-wide suppression, exact-head CI, merge, deployment or Android browser acceptance is claimed until independently verified.
