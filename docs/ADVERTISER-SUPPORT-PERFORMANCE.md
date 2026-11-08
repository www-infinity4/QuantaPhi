# Infinity advertiser support · proposed program (November 7, 2026)

**Status: source-only request-and-review experience; no authorized campaign, live donation collection, invoice, bank-account linking or sales guarantee.** Continues QuantaPhi issue #1315 and the existing Infinity Affiliates Quick Card.

## Two independent merchant choices

1. **Voluntary support contribution ("donation")** — after benefiting from organic exposure, a brand may *choose* to send an optional commercial contribution. There is no required amount, retroactive debt, recurring charge or paid boost attached. QuantaPhi is not represented as a tax-exempt charity; no tax-deductible donation claim. Donation/support never changes first-party organic ranking or creates an endorsement.
2. **Proposed 30-day $100 outcome-review campaign** — the owner's stated conditional fee is **$100 if merchant-verified, QuantaPhi-attributed net sales during the 30-day window fall below $1,000**. Otherwise the proposed conditional fee is $0. This is **not a guarantee of $1,000 sales** and is not an offer to automatically bill merchants. Public copy and review link display the under-target fee plainly. A signed, reviewed agreement must specify the exact deadline, who pays what, cancellation/refunds/disputes, and how a qualified attributed sale is proven. Do not activate this paid product or collect money until permitted terms, proof and consent exist.

## Sales-evidence model

`advertiser-partner-core.mjs` is **pure evaluation logic**; it does not fetch merchant orders and its input must come from a server-side authorized, tamper-evident merchant receipt feed. Only count:
- settled USD orders in the 30-day interval, matching the specific opted-in merchant and campaign;
- orders explicitly attributed by a source-verifiable QuantaPhi referral and confirmed by the authorized payment/order provider;
- unique order IDs, net of actual refunds and chargebacks;
- a finalized full-period provider coverage receipt confirming complete refund and chargeback reconciliation.

Ignore views, clicks, users' interest estimates, manually typed sales claims, unaffiliated stores, unmatched orders, pending authorizations, duplicated receipts and orders outside the window. A partial, stale, mismatched or conflicting report yields **needs_verified_coverage**; in-progress windows yield **in_progress**. A completed below-target review returns **under_target_review**, never "charge authorized." A completed report at or above the target returns **target_met**, still no billing authority.

## Release, security and marketing gates

- The existing Infinity Affiliates card exposes only a proposal form with a public GitHub issue composer. The business must submit the review request itself; this does not create an active campaign or collect even $0.01.
- Public form includes a specific below-target fee acknowledgement, separate from ordinary consent. Do not collect consumer information, provider secrets, addresses or payment credentials in a public issue.
- Payment methods, merchant tax/account status, any later invoices, cancellations and refunds require an independent contracted billing/Stripe or processor design and legal review. Signing a contract and successfully collecting a dollar are separate events.
- Do not market a $1,000 "guarantee" without a substantiated guarantee contract; see FTC [Advertising FAQs](https://www.ftc.gov/business-guidance/resources/advertising-faqs-guide-small-business).
- Paid placements must be labeled as advertisements; voluntary donations must not secretly increase prominence. Existing editorial cards remain independent.
- For this PR, only source/test/browser CI can be checked. **No production billing, verified merchant sales, D1 attribution store or live donation gateway exists from this code.**

## Acceptance

The source branch is reviewable when standalone original Infinity Affiliates pages and the Oracle version both mount the partner section, both choices are readable at 390px, a request is only prepared after consent, the conditional fee wording is explicit, and all source and Android CI pass at an exact Git commit. Commercial release and first real merchant are **separate future gates**.
