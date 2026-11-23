# QuantaPhi Cash Wallet — funded USD account and in-app checkout

**Status 2026-11-06: source foundation only; no deposits, money custody or merchant payments enabled.**

## Customer experience target

1. Sign in to a verified customer account.
2. Choose **Add funds** and complete a bank transfer or other approved funding flow with a licensed payments partner.
3. See **Pending** separately from **Available** USD. Credit spendable funds only after the provider's verified settlement notification and reconciliation.
4. At a participating QuantaPhi merchant, review actual SKU/quantity/tax/shipping and price before choosing **Pay with Cash Wallet**.
5. Confirm once; backend creates an atomic, idempotent hold from *settled available funds*. Merchant/provider confirms settlement, then issue one receipt. If the purchase fails, void/release the hold. Refunds and funding reversals follow the approved partner's documented policies.

**Customers should not need to re-enter a card at every in-app purchase.** They may still need to connect an approved funding method to load the wallet, and merchant/identity/payment rules apply. A balance loaded with a funding partner is NOT automatically accepted at third-party physical registers or third-party websites.

## Existing repo and isolation

- Existing rewards use workers/unified-wallet/worker.js, Quants, Infinity, Star Coins and Bubble Bits. Never credit or debit these balances on behalf of USD deposits.
- Existing coupon-wallet draft #1621 is separate and cannot be used as merchant tender.
- cash-wallet-core.mjs is a fail-closed **preflight model**, not a payment processor. Both funding and spending functions return false for direct payment/credit/charge.
- cash-wallet-preview.html + cash-wallet-card.css + cash-wallet-card.mjs display an **owner-inspectable development preview**, not a card promoted into the public Oracle feed. Real balance is unknown, shown as em dash, never fictional $0.00.
- workers/unified-wallet/cash-wallet-schema.sql is an isolated D1 **draft**. It is NOT applied by GitHub Pages or live Worker deployment.

## Licensed provider and compliance decision

Before live funds, select a partner that explicitly supports the exact model: (a) single-merchant closed-loop prepaid credit OR (b) a broader multi-merchant, provider-managed consumer wallet. Determine legal treatment with qualified payments counsel and the provider for all served states; do not infer licensing exemptions from a small balance. Terms, disclosures, safeguarding, refunds, disputes, KYC/CIP, sanctions/AML, abandoned property, account closure and customer support must be agreed and configured. Payment processing usually has transaction fees; no "free payment rail" is assumed.

Provider performs regulated custody, identity checks where required, consumer protections, fraud monitoring, funding/deposit reversals and money movement. QuantaPhi retains only a minimal reconciled display/hold journal, **not** raw cards, bank credentials, SSNs, single-use payment tokens or private payment details in GitHub, JS, browser storage or log output.

## Backend implementation acceptance

- [ ] Provider contract, risk/compliance approval, commercial terms, states, legal owner and business merchant onboarding completed.
- [ ] Server identity maps a valid signed-in account to one cash-provider customer/wallet. Browser may not provide another user's ID, wallet ID, approved status, balance, or provider reference.
- [ ] Authenticated HTTPS POST top-up-intent endpoint generates an idempotent provider checkout session server-side. Client never creates a balance or sends bank secrets to QuantaPhi.
- [ ] Provider webhook validates authentic signature using its official SDK/algorithm against raw request bytes, non-expired timestamp and exact configured provider ID; durable unique event key and atomic D1 ledger update. Duplicate, reordered, forged, wrong customer, wrong currency, late, pending, disputed and reversed deposits are rejected/handled without extra credits.
- [ ] Reconciliation runs against actual provider transaction/balance reports, surfaces mismatches for manual review and freezes unsafe operations.
- [ ] Authorize spending only at provider-contracted merchants with signed/current server-side order quote, full purchase price, exact user/account, consent, idempotency and bounded expiry; atomically reserve funds and prevent concurrent overdraft.
- [ ] One of capture, release, expiry or refund for each reservation. Status and actual receipts come from the provider/merchant, never UI animation or local storage.
- [ ] Keep available, pending, reserved, reversed, refunded and spent statuses separately; never mix reserve/release events with fiat deposits or rewards tokens.
- [ ] Confirm provider support for withdrawals/cash-out **before** advertising that capability; if closed-loop, explain spending restrictions and refunds.
- [ ] Document PCI scope, CORS/CSRF, secret rotation, account recovery, rate limits, fraud limits, per-user isolation, breach handling, accessibility and privacy policy.
- [ ] Tests: malformed cents, idempotent deposit, replay/reversal, parallel overspend, wrong account, invalid session, provider outage, incorrect merchant, mismatched/expired quote, refunds, negative balance, and immutable existing reward balances.
- [ ] Stage with **provider-issued sandbox money**, verify signed-in Android UI/keyboard and no fake success; compare paid merchant receipt to provider settlement and ledger exactly.
- [ ] Independent security/compliance review; explicit feature-flag release; separate CI/merge/deploy/prod readback evidence.

## API contract — not wired or available yet

- GET /v1/cash-wallet/state → signed-in owner only; authoritative available_cents, pending_cents, reserved_cents, currency=USD, source time, provider connection state. Return "unavailable" on provider failures, not a forged zero.
- POST /v1/cash-wallet/fund-intent → authenticated, valid amount, idempotency; server-created licensed-provider funding session; **never wallet credit**.
- POST /v1/cash-wallet/reserve → signed order quote and customer approval, merchant allowlist, settled balance atomic reservation, idempotent response.
- POST /v1/cash-wallet/confirm → provider/merchant verified capture and receipt.
- POST /v1/cash-wallet/release → idempotent void/refund flow with server-side authorization.
- POST /v1/cash-wallet/provider-webhook → signature-verified server-to-server, event replay defense.
- GET /v1/cash-wallet/history → only that user's server-authenticated settled/pending entries, no private provider token.

All routes above are a **proposed interface**, not live endpoints.

## External regulatory starting references

- FinCEN final rule / prepaid access: https://www.fincen.gov/resources/statutes-regulations/guidance/final-rule-definitions-and-other-regulations-relating
- FinCEN closed-loop explanation: https://www.fincen.gov/resources/statutes-regulations/guidance/frequently-asked-questions-regarding-prepaid-access
- FFIEC prepaid access risk overview: https://bsaaml.ffiec.gov/manual/RisksAssociatedWithMoneyLaunderingAndTerroristFinancing/09

**Release decision: blocked** until both the regulatory/provider path and merchant-funded sandbox-to-receipt evidence exist. Never transfer actual customer funds to test an unapproved build.
