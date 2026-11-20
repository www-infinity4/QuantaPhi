# ShopPhi authenticated publication — completion gates

This checkpoint is source preparation, not a deployment receipt. It builds on the already released QuantaPhi frontend fixes (#1022, #1025) and tracks the actual blocker in #1027.

## Existing verified source contracts

- QuantaPhi `shop-ad-phi.js` reads `window.ShopAdPhiConfig = { apiBase, siteId, instanceId }`. The `apiBase` must be a same-origin relative path, and publication uses same-origin credentials.
- The client calls owner-scoped `POST /api/sites/:siteId/cards/:instanceId/shop/config`, `POST .../shop/items`, `POST .../shop/items/:itemId/publish`, then `GET .../shop/items`.
- A distinct unauthenticated `GET /public/sites/:siteId/cards/:instanceId/shop` must return the published item before the UI can claim public visibility.
- WidgetPhi `cloudflare/catalog-api.mjs` requires an actual D1 catalog binding and a trusted signed Phi identity with issuer/audience checks. Its repository warns that this Worker is not deployed by that repository.
- Existing QuantaPhi quick-card publishing creates moderated unlisted cards; it must not be substituted for public ShopPhi inventory.

## Integration prerequisites — verify, never invent

1. Inspect actual `quantaphi-site` and WidgetPhi Worker routes and bindings, and the current full Wrangler configuration. Preserve existing bindings, schedules, secrets and D1.
2. Verify WidgetPhi catalog migrations against the *existing* catalog database; create no replacement database.
3. Establish a server-to-server catalog proxy that verifies the genuine owner's current session, maps it to a catalog subject and issues a short-lived scoped server-side identity. Never expose a bearer/JWT/secret to static JS or trust a caller-supplied owner header.
4. Verify configured `siteId` and `instanceId` exist and are owned by that subject. Only then emit `ShopAdPhiConfig` from trusted deployment configuration.
5. Preserve seller-media privacy. Device-local blobs cannot become public URLs without authorized upload, stripping metadata, durable storage and review.
6. Test guest rejection, expired session, wrong owner, duplicate retries, parent unpublished, malformed links and server failure with draft retention.
7. Acceptance must include a real owner POST receipt, catalog D1 readback, a second unauthenticated public read, visible homepage/card placement and mobile UI verification. A successful API response alone is not publication.

## Release states

- **Source prepared**: this checklist exists, no live effect.
- **Backend wired**: verified route/bindings and authenticated identity path in reviewed source.
- **CI passed**: exact-head tests and required workflow coverage.
- **Merged/deployed**: separately recorded GitHub and Cloudflare receipts.
- **Live verified**: owner session + public second-session readback + card visibility.

Do not enable the Create Post public-success message until all public gates are satisfied. Preserve private drafts and explicit blocked states in the meantime. Independent review and required checks precede automatic merge/publish under the owner's standing policy.

Related: QuantaPhi issues #1027, #1145, #1192; WidgetPhi `cloudflare/catalog-api.mjs`.
