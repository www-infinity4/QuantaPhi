# Coupon Wallet — store-payment acceptance gate

**Date:** 2026-11-06
**Scope:** QuantaPhi #1481 / draft PR #1621, Pepsi and Mello Yello pilot.
**Customer use at real tills:** **NOT VERIFIED / NOT ENABLED**. A coupon organizer is not merchant tender or a register integration.

## Current technical evidence

- The reviewed public feed at data/verified-coupon-offers.json contains **zero offers**. Do not show a fabricated code, barcode, coupon amount or paid savings.
- coupon-wallet-core.mjs accepts only current, reviewed public issuer offers; currently it persists to **this device only**.
- coupon-store-readiness.mjs now classifies a *selected* saved offer for the selected store route. All outputs report canAutoApply=false and isConfirmedSavings=false. Its classifications are instructions, **not proof of retailer acceptance**.
- The on-card checkout helper defaults to **no verified current coupon** when no saved offer exists. It never constructs an example offer as if it were real.
- Tests: run node --test test/coupon-quick-cards.test.mjs test/coupon-store-readiness.test.mjs, then node --check coupon-wallet-core.mjs && node --check coupon-store-readiness.mjs && node --check coupon-quick-cards.mjs. PR CI, Android tests and actual merchant evidence must be attached separately.

## Route requirements and safe customer guidance

| Route | Acceptable next action | Blocked claim |
| --- | --- | --- |
| Walmart physical register, manufacturer coupon | Present a genuine valid **paper** manufacturer coupon with a readable GS1 barcode; correct exact item/size/quantity and store acceptance are checked by register. | A phone image or this wallet's saved offer can be scanned as tender. |
| Walmart Cash / loyalty | Activate an eligible offer in a customer's actual Walmart account through official Walmart flows, meet applicable terms, and confirm in the merchant app/receipt. Walmart Cash earned is not automatically a reduction of the current purchase total. | QuantaPhi has activated the offer or credited cash. |
| Walmart.com | Confirm eligible seller, exact cart, promotion rules and merchant-authorized code application at checkout. | Any promo code has been applied just because it was saved. |
| McDonald's | Use an eligible offer in the official McDonald's app, with required account opt-in and qualifying location/time. One deal per person per visit. Current Pepsi/Mello Yello issuer offers **are not** a McDonald's app coupon. | Stacked app deals or an invented merchant barcode. |
| Rebate | Follow the issuer's approved process and obtain actual confirmation after purchase. | Rebate value already saved at the register. |
| Other merchants | Verify an issuer-approved acceptance route and exact product eligibility. | Universal automatic tender support. |

**Official rules:** [Walmart coupon policy](https://corporate.walmart.com/policies) · [Walmart Cash help](https://www.walmart.com/help/article/walmart-cash-faqs/3260c30df45443de80b4ac720717af28) · [McDonald's deals FAQ](https://www.mcdonalds.com/us/en-us/faq/deals.html) · [McDonald's terms](https://www.mcdonalds.com/us/en-us/terms-and-conditions.html).

## Hard release gates before customer-facing "Works at checkout"

1. **Offer provenance:** Acquire issuer/merchant-permitted source; retain current terms, issuer, merchant, product UPC/GTIN/size/quantity, location, expiry, activation requirements and cancellation. Source check must fail closed on stale or missing data.
2. **Secure cross-device account wallet:** Per-user authenticated D1/approved storage, idempotent save, revoked/expired handling, strict user isolation, logout cleanup and privacy review. Never expose coupon account credentials, single-use codes or payment information in public data.
3. **Store eligibility engine:** Compare exact basket and store/location to source terms; distinguish discoverable offer, eligible-to-try, app-activation-required, unsupported and retailer-confirmed redemption. No code guessing, barcode generation or permission bypass.
4. **Retailer-approved handoff:** Obtain official API/partner authorization where needed, or use legitimate paper/app flows. A customer must explicitly approve any actual checkout action. Do not submit payment, modify balances, or purchase items automatically.
5. **Receipt reconciliation:** For a permitted sandbox sale, capture merchant authorization, expected discount, actual merchant-reported discount and final before/after totals. A simulated response is **not** a merchant receipt. Realized savings require merchant evidence, not a browser-side assertion.
6. **Reliability:** Test expired, location-mismatched, SKU/variant-mismatched, duplicate, rejected, offline, invalid-session, account crossover, retry and concurrent attempts; ensure no changes to Quants/Star Coins/monetary ledgers.
7. **Mobile and deployment:** Review source PR and CI, manual Android viewport/keyboard/image tests (320/360/393/720 px), signed-in flow, staging checkout test and separate deployment readback before changing the live readiness status.

## Evidence collection template (no personal/payment data)

- Date/time (UTC), build commit SHA, environment, merchant type, authorized testing owner, source terms URL
- Offer ID/issuer, exact sample item ID/quantity, store region, permitted redemption mode
- Expected result vs actual retailer response and reason code
- Merchant-issued **redacted** test transaction reference, observed discount, expected total, actual total, tester initials
- PASS/FAIL/BLOCKED decision and link to CI/mobile/sandbox evidence

**Do not perform production transactions to prove this feature without a customer-controlled and merchant-authorized testing protocol.** This document is a release gate, not evidence of a successful live discount.
