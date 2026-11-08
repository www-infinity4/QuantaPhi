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

## 2026-11-07 CT · Private-follow sponsored boost and payment-receipt source pass

- **Owner request:** Companies may propose $100 test boosts through $100,000/month premium advertising. A visitor's own voluntary follow or liked brand/product can prioritize *approved and funded* sponsor content at active times, alternating genuinely approved current images/products while respecting Not for me. Not a claim that a visitor intends to purchase or that off-site/device surveillance is legal.
- **New scoped draft:** PR [#1840](https://github.com/www-infinity4/QuantaPhi/pull/1840), branch `feat/consent-sponsor-boost-policy-1315-20261107`. Pure `sponsored-boost-policy.mjs` and focused `test/sponsored-boost-policy.test.mjs` entered existing interactive card CI, including explicit opt-in/Follow/Like, hide, frequency caps, sponsor rights/payment model, sensitive-category exclusion and source-fresh product variation. This is a **source policy only**, not a production ad server; browser-supplied settled/approved flags must never grant campaign activation.
- **DB artifact:** `workers/sponsor-boost/ads-ledger-schema.sql` is an **unapplied** isolated Cloudflare D1 schema with provider-event idempotency, contract/creative receipts, and aggregate reported metrics. No provider payment or public data access is wired. `docs/SPONSORED-BOOST-PAYMENT-PROVIDER-GATES.md` details Stripe Financial Connections/Stripe Invoicing, PayPal Business, payment vs bank-linking, ad policy and Cash Wallet separation.
- **Actual money:** owner separately wants bank payout to Chime and PayPal. ChatGPT Finances shows read-only Chime account connection; **not** authorized QuantaPhi bank access or payouts. PayPal/Stripe merchant identity, banking destination, signed webhook and real business income unverified. Cash Wallet real customer stored-value remains **blocked** under #1773 / draft PR #1772 and needs a regulated partner, not just an account-link graphic.
- **CI / acceptance:** Exact-head CI on draft PR #1840 [run 42447040164](https://github.com/www-infinity4/QuantaPhi/actions/runs/42447040164) began and was in progress at first observation. No exact-head card suite success or browser/Android proof yet. Independent review, merchant onboarding, trusted server campaign storage, rights/funding reconciliation, consent/telemetry, approved merge, Cloudflare deployment and actual advertiser agreements remain undone.
- **Related source:** #1317 outreach contains a 361-company research list and unsent drafts in the ChatGPT conversation; no emails or commercial contracts were sent. The recorded Cloudflare traffic ledger includes bots and is not a viewable-ad or unique human audience metric.
- **Next safe action:** inspect run 42447040164 and fix the first source test failure on PR #1840, then independently review the isolated ad ranking/ledger draft. Continue real payment onboarding in #1773 only after owner-approved verified processor and regulatory scope. No funds moved, no banking credentials collected.

## 2026-11-07/08 CT · Stripe $100 sandbox test price, checkout and verified-webhook source

- Canonical issue **#1315**, existing draft PR [#1840](https://github.com/www-infinity4/QuantaPhi/pull/1840), branch `feat/consent-sponsor-boost-policy-1315-20261107` (same PR, not new project). Stripe plugin was **connected** and explicitly returned account `Infinity sandbox` with `livemode=false` and Stripe context `acct_1UZNk46EcqqJzlWv`; read existing products/links (none prior to this operation).
- Created actual **Stripe test product** `prod_VaZHvTSYWh1sqy` and one-time **$100 USD test price** `price_1UZO8k6EcqqJzlWvKf3rGFuy` (`unit_amount=10000`, `currency=usd`, `livemode=false`).
- Created actual **Stripe test-mode checkout Payment Link** `plink_1UZO996EcqqJzlWvCVkSrIz2`: https://buy.stripe.com/test_9B614gbBSeqWa9Ug5X7Vm00. Stripe API readback confirms link `active=true`, `livemode=false`, restricted to **one** completed checkout and **0** completed checkouts at most recent check. Metadata marks `environment=sandbox`, `review_status=not_approved`, `fulfillment=disabled`. This is **not** a paid advertiser, ad delivery receipt, Stripe live account or test transaction.
- Attempted one-browser sandbox Checkout QA via previously connected TinyFish; actual run **did not start** because its separate TinyFish wallet was out of funds. No funds were added or charged, and no checkout was submitted. The owner may manually perform one Stripe TEST-card-only checkout on Stripe's official sandbox to generate a test receipt. Do not use real bank/card data.
- Added strict WebCrypto raw-body Stripe HMAC signature check, test-only amount/currency/account/payment link/metadata match, 5-minute timestamp window and replay-proof isolated D1 insert in `workers/sponsor-boost/stripe-sandbox-webhook.mjs`; isolated **unapplied** `stripe-sandbox-schema.sql`. Every successful test receipt responds `canActivateAd=false`, `realMoney=false`; **no** `sponsor_campaign`, user Cash Wallet, creator payout or StarCoin mutation. This is SOURCE ONLY, not a deployed endpoint: Cloudflare sandbox D1 and Stripe test webhook secret have not been provisioned.
- Added `test/stripe-sponsor-sandbox-webhook.test.mjs` and syntax/test steps to existing card-quality CI. At head `49919359d4a08d6345468000a895f0ec7cbdf237`, run [42448966054](https://github.com/www-infinity4/QuantaPhi/actions/runs/42448966054) completed Node syntax and focused regression steps **success** while broad Android browser QA was **in progress** at observation. Verify final exact-head CI; latest doc-only changes may create a new head.
- Updated `docs/SPONSORED-BOOST-PAYMENT-PROVIDER-GATES.md` with exact Stripe IDs/link and required Cloudflare secret bindings. No live checkout, Stripe live payouts, PayPal merchant link, ads, banking updates or customer charges have been enabled.
- Next *safe executable* action: inspect the exact-head interactive card QA final status; fix any failures on the same PR, then independent review. To complete sandbox payment receipts requires owner-approved Stripe test checkout, isolated staging Worker secret and D1 provision, official Stripe webhook event registration and signed receipt/duplicate readback. Real advertiser billing and ads activation remain **blocked** on merchant/legal approval, reviewed content and contracts, production provider webhook and real user consent.

