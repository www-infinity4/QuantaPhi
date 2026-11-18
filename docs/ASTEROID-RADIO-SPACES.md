# ASTEROID RADIO · Media Star X Spaces host card

Scope: user-submitted post [@A5T3R0lD](https://x.com/A5T3R0lD/status/2123131588548387160) on November 18, 2026. This is a public X post URL, **not** a direct recording identity. The X account is **ASTEROID RADIO**, an investing/market broadcaster; it is not a scientific asteroid index.

## Implementation
- Front-only Oracle Octaves card: `#asteroidSpacesRadio` in `index.html`, `asteroid-spaces-radio.mjs` and `.css`, mounted also in Bubbles' independent `asteroid-spaces` card and combined `media-star` player.
- Accessible original-source action, local title search, refresh and device-local no-repeat shuffle; no automatic playback, paid X API, audio rehosting, coin charges or Fred payout wiring.
- Data flow: read-only public GET `/v1/curated/asteroid` from the **existing** `media-star-following-spaces` D1 Worker; fallback to `asteroid-spaces-index.json` if that API has not been deployed/seeded. Only the public ASTEROID host is queried; wallet histories/follows stay private.
- Source-only seed migration `workers/media-star-following/migrations/20261118-asteroid-radio.sql` is idempotent; must be reviewed/applied separately. **Git commit does not deploy D1 or Workers.**
- `availability=indexed` means a source link is indexed, **not** replay verified, audio tested or currently live. Space status cannot be inferred from post age. Mixed-host speaker listings are not imported as ASTEROID-hosted broadcasts.

## Verified source lead
- Public archive host page: https://www.twitterspacegpt.com/zh/hosts/A5T3R0lD
- **One direct original Space ID indexed** from the archive's ASTEROID-hosted entry: `1pKdRbWZgVRJW` at https://x.com/i/spaces/1pKdRbWZgVRJW
- Listed title: `ASTEROID RADIO: $DOG TONIGHT - BUY ON KRAKEN`, date 2026-03-25, duration 03:18:35. X playback has **not** been independently verified.
- User-provided post is retained as a discovery link, not counted as an episode.
- Archive completeness unverified; the goal of **all** historic Spaces requires authorized source discovery, host attribution, deduplication and replay verification. Neither X public post search nor an archive's speakers tab proves complete hosted recordings.

## Acceptance and release gates
1. Node tests: `node --test test/asteroid-spaces-card.test.mjs test/asteroid-spaces-worker.test.mjs` plus existing X Spaces regressions.
2. Exact-head GitHub CI, independent patch review, owner-approved merge, then controlled Cloudflare D1 migration and Worker deployment (existing secrets/bindings preserved).
3. Browser and Android tap/readback of original X link; report if replay is unavailable rather than substituting invented audio.
4. Expand the indexed library only from provider-confirmed original X Space IDs with date, host, original link and attribution.

Canonical umbrella ticket: https://github.com/www-infinity4/QuantaPhi/issues/1284 . This is the **host-catalog extension** of that existing X Spaces project, not a new payment or account workflow.
