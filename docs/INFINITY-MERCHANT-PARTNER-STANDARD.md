# QuantaPhi Infinity Merchant Standard · proposed partner specification

**Status:** developer/product proposal, not an approved standard, licensed merchant integration, checkout currency or signed partner contract. Source: owner requirements, issues [#1326](https://github.com/www-infinity4/QuantaPhi/issues/1326), [#1316](https://github.com/www-infinity4/QuantaPhi/issues/1316) and [#1317](https://github.com/www-infinity4/QuantaPhi/issues/1317).

## What a merchant receives

**A Quick Card that can grow into a full-site layout.** It begins with approved hero photography, alternative product views, full descriptions, size/specification options, real offers, search, accessible actions and source links. An optional second phase creates a mobile-first complete page or site experience from the merchant's own approved information architecture. QuantaPhi can recommend an improved order of information, readable neutral button system, faster mobile navigation and AI-assisted first-party support. The merchant remains the source of truth for pricing, item condition, authenticity, SKU, current inventory, promotions, checkout and order handling.

**More content, not unauthorized product control.** We request image-feed access, product data, licensed logos, sanctioned media and detailed descriptions; official source links and genuine current merchant offers; partner-authorized API endpoints/webhooks; permission to create a preview and approved marketing materials. We do not request access to private customer records, wholesale rates as a condition of collaboration or unrestricted administrator access to the merchant's systems. No ad is called "cooperative" without an actual agreement.

**Bubbles-assistance, optional.** A business verifies its ownership in an isolated Bubbles tenant and may link selected GitHub repos with a scoped GitHub App and Cloudflare projects using appropriate least-privilege OAuth/service credentials. Initial access is read-only. The system creates PRs, tests and previews for explicit human approval; merges and deployments happen only after provider-verified scope, legal permission, owner sign-off, reversible change plan and relevant CI. Companies may contribute approved assets to the Quick Card without hiring a website rebuild.

**Quantdata for a merchant.** Potential metrics: consented in-card impressions, specific asset/card interactions, product clicks, verified action completions, referral source and opt-in lead requests. Display origin and actual observation periods, minimize personal data, honor opt-out/delete/retention, preserve tenant separation, never fabricate conversion counts or offer inaccessible customer history. QuantaPhi controls first-party ranking, not the original platform's recommendations or content.

## Draft quality gates

- Mobile usability and accessible descriptive alt text for merchant-approved images, at least one product image and source/rights receipt.
- Verified source URL, actual merchant-owned catalog and action destinations; no fake stock, Buy Now, authorization or promotions.
- Consistent layout and controls, usable navigation and clear return to merchant checkout, no unapproved third-party embeds or automatic purchases.
- Every source/import, live pricing request, visitor analytics, repo branch write, production deploy, promoted ad and payout has **separate** evidence and consent.
- Source-only evaluation is in `infinity-merchant-standard.mjs`; it is NOT a provider token check or actual backend authorization. Server-side verification is still required.

## Partnership choices and acceptance

(A) Provide officially permitted catalog/media for an independent original-site link. (B) Approve a native in-card feed/actions API. (C) Commission a quoted site-UX upgrade by QuantaPhi/Bubbles, retaining source ownership and veto. (D) Sign a paid advertising/affiliate partnership, separately disclosed. (E) Explore future compliant Quant/StarCoin merchant-unit pricing—**not available for actual payments today**.

First production milestone: one consenting pilot merchant or strictly synthetic sandbox demonstrates assets → native card → approved PR preview → explicit site deploy → independent readback → revoke, with receipts and tests across two different tenants.
