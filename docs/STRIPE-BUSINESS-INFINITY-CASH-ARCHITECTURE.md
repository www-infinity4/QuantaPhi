# Stripe Business Quick Cards & proposed Infinity Cash architecture
**Canonical issue:** [#1843](https://github.com/www-infinity4/QuantaPhi/issues/1843). Related seller PayPal #1841 / PR #1842, Cash Wallet #1773 / PR #1772, direct sold ads #1315 / PR #1840, developer carousel #1790.

## Source stage: 2026-11-07 CT
Only Stripe account connected through ChatGPT: `Infinity sandbox` (`acct_1UZNk46EcqqJzlWv`), `livemode=false`. This is **not** a verified business seller onboarded through QuantaPhi, a payout account, personal Chime transfer authorization, or proof of custody. No merchant payout, new connection, cash deposit, live shop payment, lender activity or guarantee is established by this branch.

### Original cards and GPT roles

- `stripe-business-studio.html` is an original interactive Quick Card with current Infinity Phi artwork, phone-friendly text/buttons, Stripe's **official business registration** destination, a public-information-only seller drafting form (coins/lawn care/other eligible products), a real existing Bubbles specialist launcher, and an explicit not-connected status.
- `stripe-business-studio.js` and `stripe-business-studio-core.mjs` validate and export one seller with up to 500 reviewed-by-owner candidate cards. No data submitted or stored, bank fields, 3rd-party OAuth, approval flags, Stripe API calls, access keys or charges. A JSON draft does not bind a seller account, publish a card, start a charge, prove ownership or show a Cash Wallet balance.
- Linked from the original `quick-card-builder.html` and `shopphi-sell.html`; discoverable by named prompts through `bubbles-card-catalog.mjs`. The Bubbles specialized assistant uses existing Bubbles provider, **not** a new OpenAI/API subscription nor a verified independent Stripe Connect service. GPT can explain legitimate non-sensitive form fields and help draft public descriptions, not store bank credentials, tax IDs, government IDs, API keys, private user data, or approve/submit financial contracts without the owner's express authorized action.
- Tests include `test/stripe-business-studio.test.mjs` and `test/stripe-business-studio.browser.spec.mjs` with 360px Android UI/export and safety. Exact-head CI, independent review, approved merge and production readback are distinct.

### Connecting one seller to Shop Phi and Quick Cards (not yet wired)

1. Have QuantaPhi platform **actually enroll in Stripe Connect** and verify eligibility for US sellers, products, taxes, supported countries and intended fee model. The connected Infinity sandbox account does not prove full Connect platform capability.
2. Sign in a verified QuantaPhi account; map `seller_id` only from authenticated server session. Never trust a public seller handle as identity.
3. Create or associate a Stripe Connect account under the permitted Stripe integration. Generate a short-lived hosted onboarding/account link server-side. Never expose Stripe platform secret keys in the browser, Bubbles prompt or GitHub. Seller personally completes identity/tax/bank forms on Stripe's hosted page.
4. On return/refresh, **requery the Stripe account API and verify required capabilities/requirements and actual signed event**; a return URL alone is not approval. Treat pending/restricted/revoked as unavailable. Verify `charges_enabled`, `payouts_enabled` and the specific business requirements applicable to the integration.
5. Bind existing owned/rights-cleared coins, lawn-care service or retail Quick Cards to the verified seller ID, using separate price/refund/delivery terms, age/jurisdiction/content restrictions, verified product and user approval. One merchant connection can support many cards; each customer's charge must be explicitly authorized.
6. Use real Checkout/payment links/payment intents for the correct connected seller according to Stripe Connect architecture; use signed provider webhooks, idempotency, refunds/chargebacks and per-seller reconciliation, not the browser success screen. Provider terms and seller fee agreement govern payouts. Do not assume a customer merchant at any website automatically accepts QuantaPhi funds.
7. Store minimal **opaque reference IDs and verified connection state**, not raw bank numbers; the design-only `workers/stripe-business/seller-schema.sql` is an **unapplied** D1 table proposal. Access to any creator status and cards must be authenticated and row-scoped; keep API tokens securely encrypted in provider/private server secrets where needed, no GPT conversation vault.

Official developer documentation:
- https://docs.stripe.com/connect/how-connect-works
- https://docs.stripe.com/connect/onboarding/quickstart
- https://docs.stripe.com/connect/saas/tasks/onboard
- https://docs.stripe.com/connect/marketplace
- https://docs.stripe.com/connect/account-links

### "Infinity Bank" and a $500 transfer from Fred — correct accounting

A digital transaction reference, key, bank authorization, or Chime account read connection **does not itself represent spendable, backed USD**. The transfer can be initiated, pending, rejected, settled, returned, frozen or disputed. Money cannot be minted by assigning an electronic reference number. **Do not present QuantaPhi as a bank or promise deposit insurance without a verified bank/program contract and legal review.** This is a proposed provider-backed wallet, not a bank.

Example proposed legitimate flow:
- Fred authorizes a real $500 bank/ACH transfer in a licensed provider's approved interface. Sender account details stay with the bank/provider, not GPT or QuantaPhi Quick Card.
- Provider assigns a unique transaction reference, verified sender/recipient program, amount=50000 cents, currency=USD, timestamps and status. The public app may show `pending` while the money is in transit.
- An authenticated server verifies Stripe/provider **signed raw webhook and exact recipient**, checks idempotency and matches an authorized program account. A single event ID represents one externally confirmed event, not an independent $500 token.
- After **settlement and regulated-provider reconciliation**, an authorized financial service may credit the separate Cash Wallet **available** balance; pending, reserved, chargebacks/refunds and reversals remain individually auditable. The provider, not Bubbles or ChatGPT, holds/safeguards customer money. No money is credited based only on a transfer key, bank-link success or a payment intent.
- Cash Wallet spending requires recipient eligibility, an immutable server-quoted USD price, the user's explicit confirmation, concurrency-safe reservation, verified merchant acceptance and a true capture/refund receipt. Reconciliation proves that total customer liabilities equal approved partner-backed funds net of legally authorized pending/reversal treatment.
- A double-entry receipt journal should use immutable transaction/event IDs and entries tied to the provider's asset/liability accounts, not storing private account numbers. An event hash demonstrates record integrity but **does not create dollars**, satisfy money-transmitter law or guarantee funds are held.
- `infinity-cash-receipt-gates.mjs` is a fail-closed **advisory contract**, not a ledger, provider adapter, funding route or money-movement API. Even apparently signed provider evidence cannot credit cash from browser fields; only an authorized reconciler could do that after compliant launch.
- Quants, Star Coins, GITs, Bubble Bits, GPT Coins and coupons remain separate from ordinary USD and may not be advertised as insured bank deposits or redeemable currency without authorized programs and independently verified terms.

**Regulation:** Whether a specific closed-loop vs multi-merchant prepaid wallet is legally feasible depends on actual program design, state coverage, licensed provider, BSA/AML obligations, KYC/CIP, fraud/ACH returns, safeguarding, tax, account recovery and refunds. Do not infer an exemption merely because a transfer is $500 or because a card can be used online. Consult financial/payments counsel and qualified providers before any pilot with real customer money.

Sources:
- https://www.fincen.gov/resources/statutes-regulations/guidance/final-rule-definitions-and-other-regulations-relating
- https://www.fincen.gov/resources/statutes-regulations/guidance/frequently-asked-questions-regarding-prepaid-access
- https://docs.stripe.com/treasury/connect/money-movement/timelines
- Existing `docs/CASH-WALLET-RELEASE-GATES.md` in PR #1772.

### Bubbles cash-control model

Bubbles can suggest verified commerce activities that may generate legitimate revenue, such as creating original product cards, selling authorized services and finding advertising customers; profitability is never guaranteed. Users should **not** need to give Bubbles their Stripe account credentials. If a future regulated provider supplies scoped spending APIs, permissions must be owner-controlled, time-limited, merchant-allowlisted, capped with explicit limits, logged, revocable, and require consent to every payout/transfer unless the provider and user have expressly approved an appropriate narrowly scoped delegated workflow. No automatic investing, leverage, cash transfers, speculation or conversion of customer USD into Infinity currencies. Failure to generate income cannot be silently offset by spending someone else's stored balance.

### Ship gates and status
**Not ready for commercial release:** actual Connect platform permissions and seller onboarding, verified account readbacks, a legally authorized cash custody partner for USD, authorized D1/Worker code, immutable provider events, signed callback/webhook, refunds, fraud review, exact-head CI, Android browser/phone evidence, independent security/legal review, approved merge/deploy and true production receipts. Work on these through issues #1843 and #1773, not a fabricated deployed bank.
