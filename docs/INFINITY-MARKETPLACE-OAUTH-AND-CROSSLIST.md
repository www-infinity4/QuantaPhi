# Infinity Marketplace Quick Cards — verified developer gates (2026-10-31)

## What is in the existing eBay PR
- Public eBay auction and Buy It Now listing search via official Browse API **only after production app credentials are configured and tested**; public search fallback is clearly source links, not false inventory or account access.
- Blue in-card Search action, compact Auctions / Buy It Now / My eBay tabs, original image, bid count, source price/currency, seller/shipping info, honest Buy It Now option when still offered.
- Auction *maximum bid review* is local, explicit, and **never submits a bid**; final bid is at eBay until Offer API is approved. No amount is injected into third-party web forms.
- My eBay switches native section views: Buying / Bidding / Selling / Purchases. Without per-user OAuth they contain useful official account handoffs and explicitly say **Not connected**, not made-up personal listings.
- Selling opens the existing ShopPhi private listing editor. This does not publish to marketplaces.

## What developer access / owner action actually means
**eBay application developer registration** is distinct from signing in as an eBay buyer or seller:
1. Register an app at https://developer.ebay.com/ and set production app key ID/secret server-side (Cloudflare Workers secrets; never in static JavaScript, repo, chat message, or user form). Configure the approved OAuth callback, scopes, state/PKCE, encrypted token vault and per-tenant binding.
2. eBay Browse public search uses an **application access token**. An eBay username, user ID, or signed-in browser window does not grant third-party account access.
3. My eBay private buying/selling/order status requires a **user OAuth token** with appropriate specific permissions and real backend account-data adapters. Only then show **Connected** after verified backend readback.
4. **Bidding** requires separately approved production **Buy Offer API** and buyer consent, accurate last-second listing revalidation, total limit/fee visibility, explicit final confirmation and idempotent bid receipts. **Checkout** requires appropriate Buy Order/checkout production permissions. Never silently bid or purchase.
5. eBay seller listings/quantity management can use the Sell Inventory API plus seller OAuth, approved business policies, inventory location, and seller-scoped SKU. Fulfillment API/order verification supplies sale receipts.
6. An explicit developer-stage blocker should carry an actionable receipt: missing exact configuration/API/scope, provider's application and permission URL, safe owner consent step, PR/CI/deployment evidence, with no repeated generic login request.

Official references:
- https://developer.ebay.com/develop/guides/sell/get-started-with-ebay-apis
- https://developer.ebay.com/api-docs/buy/api-offer.html
- https://developer.ebay.com/api-docs/sell/inventory/overview.html
- https://www.developer.ebay.com/api-docs/static/oauth-token-types.html

## Cross-marketplace listing / selling
**One ShopPhi seller SKU** can become multiple authorized provider listings, each storing its own account, item/listing ID, venue, variant, quantity, publication receipt and last source reconciliation. A shared private source draft is not a published listing.

| Provider | Public documented path | Current readiness |
| --- | --- | --- |
| eBay | Sell Inventory API + seller OAuth; Fulfillment API receipt | Adapter not connected / authorization pending |
| Etsy | Open API v3 seller listings and inventory with OAuth `listings_r` / `listings_w`; `order.paid` webhook | Developer app/commercial access and per-seller OAuth pending |
| Mercari US | Official desktop cross-list import (eBay/Poshmark/Depop); each imported listing remains independent and updates are NOT synchronized | Manual import/handoff, no verified US seller write API |
| Poshmark | Official seller site and any separately approved partner integration | No verified public seller API in this build |

Mercari *Shops Japan* GraphQL APIs are **not** proof of a public US Mercari seller API or of access to a particular seller account.

### Sale-on-one-channel reconciliation contract
1. Verify the inbound event server-side (webhook signature or authenticated provider API readback), linked seller, paid status, order/line SKU, quantity, timestamp and replay key. No seller event inferred from an AI message or public web page.
2. In the same durable tenant-scoped inventory ledger, record sale and reserve quantity using an atomic compare-and-set transaction. Do not merely compare local browser drafts. Repeat event IDs must not double-deduct.
3. Plan quantity updates/withdrawals for each other *active matching SKU* with per-marketplace idempotency keys. `crosslist-inventory-core.mjs` performs this planning only; it never posts, withdraws or claims completion.
4. Execute only through independently approved user-scoped provider adapters. Record real per-provider response, item ID and final readback. Unsupported / denied / lost-connection marketplaces must be marked **manual follow-up**, never falsely called delisted. Notify the seller if risk of double sale remains.
5. Do not guarantee instantaneous propagation: webhook delivery, provider rate limits, connection health and in-flight purchases can race. The interface must visibly say when another channel's withdrawal is **pending**, **confirmed**, or **needs action**.

Official sources:
- https://developer.etsy.com/documentation/tutorials/listings/
- https://developers.etsy.com/documentation/essentials/webhooks/
- https://www.mercari.com/us/help_center/article/609/

## Release requirement
PR, tests, independent review, Cloudflare worker secrets, provider approval, live OAuth, Android display/keyboard/browser validation, and production readback are separate stages. Draft/merged must never be presented as a live connected account.
