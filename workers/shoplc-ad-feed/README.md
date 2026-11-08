# Shop LC approved ad feed for Cloudflare

This is an **unreleased source implementation** on QuantaPhi issue #1015 / draft PR #1825. Nothing here implies approval to use Shop LC media, fetch their site, advertise as a partner, or publish personal targeted ads.

## Flow and activation gates

1. Join and receive approval for Shop LC's [official affiliate program](https://www.shoplc.com/pages/affiliate-program) through Ascend by Partnerize; retain rights/usage terms and permitted creatives. **The program advertises banner/text links, product feeds, and promo codes for approved partners.** Permission is not inferred from the public catalog.
2. Review the approved feed contract/format. The Worker **does not scrape Shop LC or the live broadcast**. It expects normalized JSON from an approved account/provider adapter with `{items:[{itemId:'product:1234567',productCode:'1234567',title,href,image,price,category,available:true,expiresAt:UNIX_MILLISECONDS,onAir:false,saleVerified:false}]}`. `onAir` and `saleVerified` must be provider-confirmed, never inferred from an ordinary listing or model-generated text.
3. Create isolated Cloudflare D1 **after approval**; apply `schema.sql`. Copy `wrangler.toml.example` to a local configuration and replace the actual D1 ID. Install secrets/vars by a reviewed release process, not from front-end JS: `SHOPLC_PARTNER_APPROVED=yes`, `SHOPLC_PRODUCT_FEED_APPROVED=yes`, `SHOPLC_MEDIA_LICENSE_APPROVED=yes`, `SHOPLC_APPROVAL_REFERENCE` (internal review reference), `SHOPLC_PARTNER_FEED_URL`, `SHOPLC_PARTNER_FEED_HOST`, `SHOPLC_PARTNER_FEED_TOKEN`. No sample values prove a real grant.
4. Cloudflare Cron (every 10 minutes) uses a short-lived, server-authorized HTTPS feed URL with redirect blocked, caps payload size, validates SKU, official product URLs and permitted Shop LC-hosted/Shopify images, deduplicates, and atomically replaces active D1 product rows. Failure never changes wallet data.
5. Only current results from a successful refresh within 15 minutes can be read from `/api/shoplc/authorized-sale-feed`. Items expire automatically. An approved feed returning zero items clears the catalog. No unapproved or expired items are shown.
6. Configure the QuantaPhi site Worker **service binding** named `SHOPLC_ADS` to the reviewed dedicated Worker. The site route is unavailable without it (HTTP 503; no fallback to HTML scraping). Run CI/security review, verify D1 readback and Android ads/Not for me before deployment.

**No personal visitor data, Star Coins, GIT/Quant/Bubble Bits, purchases, sales receipts or sponsor status** are inferred or modified by this adapter. User preference is device-local until separately designed account synchronization with consent. A public live TV link does not demonstrate item authorization or advertising rights.

## Tests
`node --test test/shoplc-contextual-sale.test.mjs test/shoplc-ad-feed-worker.test.mjs`

Watch exact-head CI in PR #1825; do not advertise the feed as running until Cloudflare scheduled execution and real-world product/image links are read back.
