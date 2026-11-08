---
issue: 1843
project: "Stripe Business Quick Cards and safeguarded Infinity Cash receipts"
source_request: "Owner requested Bubbles/GPT-assisted seller Stripe setup, Shop Phi linking and a secure cash transfer-receipt plan."
state: implementing
dot: "🔴"
progress_percent: 32
progress_basis: "Public-business-only original Stripe studio, Bubbles locator, Shop Phi/Quick Card links, 500-card export, fail-closed transfer receipt, schema draft and tests source-staged. No actual Stripe Connect seller onboarding or USD custody/processor status."
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT Green source engineer, no signed owner executor lease"
lease_id: null
lease_expires_at: null
fence: null
task_session_id: null
repo: www-infinity4/QuantaPhi
branch: feat/stripe-business-quick-cards-1843-20261107
pr: null
merged: false
deployed: false
live_verified: false
blocker: "Exact-head CI/Android verification, Stripe Connect seller permissions, KYC, regulated customer funds custody and secure server backends missing."
next_action: "Run exact-head Node and 360px Playwright card tests, repair observed failures on the same PR and obtain independent review before any authorized merge."
---

# Ticket #1843 · Stripe business quick cards, Shop Phi and Infinity Cash safeguards

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1843

## Nov 7, 2026 CT: owner intent

- Owner wants a dedicated GPT/Bubbles assistant and Quick Cards enabling independent users to form or connect their own Stripe businesses (coins, mowing lawn/service, products) and attach verified seller payment methods to their QuantaPhi Quick Card or Shop Phi storefront. Reuse one verified Stripe merchant per seller rather than 500 connections.
- Owner envisions an Infinity Cash Wallet tracking $500 transfers from Chime accounts via digital references, with Bubbles pursuing legitimate earnings. Digital references are **not backed USD** until a licensed provider has received and settled/reconciled actual funds; Bubbles can't promise positive returns, create cash, or spend users' pooled money without individually authorized/compliant controls.
- Current connected Stripe context (previous owner session): only `Infinity sandbox`, `livemode=false`; this is not QuantaPhi's live Connect partner seller platform or a connected consumer custody account.
- Existing focused Cash Wallet #1773 / PR #1772 is source-only and remains separate from seller earnings, Quants, StarCoins and other incentive programs; original creator PayPal #1841 and sponsor Stripe #1315 remain separate branches.

## Source milestones staged this session

- `stripe-business-studio.html`: Oracle Octaves/Infinity original, readable mobile layout, first-party art, public business draft fields, real official Stripe signup URL, explicit not-connected/unknown cash states, real Bubbles specialist embed instructions and access button.
- `stripe-business-studio.js` and `stripe-business-studio-core.mjs`: one seller + up to 500 candidate cards with valid USD prices; no localStorage/fetch/bank upload, password fields, verified flag, money transfer, ChatGPT financial secret storage, automatic merchant creation or false checkout. User explicitly saves/copies local file.
- `bubbles-card-catalog.mjs`, `quick-card-builder.html`, `shopphi-sell.html` original routes to actual Stripe studio. No duplicate fake public ad cards.
- `infinity-cash-receipt-gates.mjs`: distinguishes unverified, pending, unsettled, returned, provider/regulated/reconciliation prerequisites; **always blocks browser-initiated cash credit or autonomous Bubbles money/investment**. This is source-only preflight.
- `workers/stripe-business/seller-schema.sql` is an **unapplied** Connect seller/card binding, onboard state and rights/price audit model, not a money custodian. No Stripe API secret or bank data stored.
- `test/stripe-business-studio.test.mjs` and `test/stripe-business-studio.browser.spec.mjs` tied to existing Quick Card CI; pending exact-head check.
- `docs/STRIPE-BUSINESS-INFINITY-CASH-ARCHITECTURE.md`: official Connect onboarding, authentic seller readback, regulated partner custody and no growth guarantee, payment/rights gates.

No customer USD, live Connect account, bank transfer, completed Stripe payment, Cash Wallet available balance, funding or payout credential/authorization, live Worker release or account linking has been added by source files.

## Next evidence and release blockers

Source exact-head CI, 360px and broader Android layout; independent security/payment review; actual authorized Stripe Connect platform/seller onboarding; signed callback+webhook with per-user isolation; documented seller agreements and product rights; merchant payout eligibility; separately a licensed customer funding/custody provider, transfer and reversal reconciliation; permitted merge, deployment and Android browser/phone live acceptance. Preserve ticket until all gates are supported by receipts.
