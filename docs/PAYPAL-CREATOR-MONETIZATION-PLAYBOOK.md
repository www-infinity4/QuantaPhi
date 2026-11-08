# QuantaPhi Creator PayPal Connect — one creator login, hundreds of cards

**Canonical owner issue:** [#1841](https://github.com/www-infinity4/QuantaPhi/issues/1841). Related Cash Wallet #1773, Developer carousel #1790, Media Star royalties/creator reporting #1674, sponsorship billing #1315/#1317. Date: 2026-11-07 (America/Chicago).

**Actual release state:** A dedicated PayPal merchant login browser profile has been created by user request, but no PayPal sign-in/profile save, merchant account verification, PayPal Partner Referrals grant, payout-bank linking, payment or checkout has been verified. `creator-paypal-studio.html`, `creator-paypal-studio-core.mjs` and its D1 schema are **source-only**. A local JSON draft is NOT a live checkout.

## A. First PayPal Business login — owner-controlled

Official signup: https://www.paypal.com/us/business/open-business-account .
The owner was given a separate secure browser sign-in page and must personally:
1. Sign in or create/upgrade their own PayPal Business account, review provider business/country and company/individual information as accurate, complete PayPal-required identity and tax verification, and confirm terms.
2. Configure an **eligible** bank/payout account solely inside PayPal's secured settings. PayPal must verify ownership/eligibility; do not blindly choose an unrelated personal bank account for commercial payout.
3. Review PayPal Business dashboard payments capabilities, identity verification and account restrictions. Do not assume merchant eligibility just because PayPal login worked. A user-visible "Save profile" is a browser-session action, not a PayPal merchant approval receipt.
4. To collect a first standard business payment without platform API integration, use PayPal's official Payment Links & Buttons or Invoicing screens. Create a fixed-price product/service link or itemized advertiser invoice inside the actual PayPal dashboard, with the correct seller, item, terms and taxes. The buyer completes checkout with PayPal; verified payment is determined from actual PayPal account records, not return URLs or UI animation.

Official docs:
- https://www.paypal.com/us/business/open-business-account
- https://developer.paypal.com/payment-links-buttons/create-payment-link/
- https://developer.paypal.com/invoicing/about/
- https://www.paypal.com/us/cshelp/article/what-is-the-difference-between-personal-and-business-accounts%E2%80%AF-help318

No password, OTP, tax ID, bank number or provider API key should be entered into Bubbles, GPT, GitHub or a QuantaPhi draft. The owner submits legally binding application, verification and account terms personally.

## B. Fred's 500 cards should use ONE verified account connection

PayPal's seller-onboarding documentation supports partner-assisted account linking: seller opens a PayPal-generated, short-lived signup link, logs in, grants the partner explicit permission, then returns to the platform. This is **not currently active** on QuantaPhi; PayPal platform approval and correct Partner Referrals API partner credentials are prerequisites. Supported seller types vary by product/flow; do not promise every personal account or every country is eligible.

Use a server-side model:
`authenticated_creator -> one verified PayPal merchant connection -> up to 500 individually rights-approved card bindings -> authorized paid checkout -> provider-signed payment and refund receipts`.

- A QuantaPhi user account and PayPal merchant connection must be scoped to the same **verified** creator. A public handle like `fred` in a JSON draft is not authentication.
- 500 is a *batch template limit*; do not create 500 PayPal accounts, 500 bank links, 500 separate OAuth grants, 500 service registrations or 500 payee identities.
- Each paid item has its own card ID, USD price, product description, eligibility, copyright/creative license receipt, free-preview policy if applicable, refund/delivery/fulfillment terms, creator approval and published status.
- A source-curated X Space, YouTube episode, song, or other third-party program cannot automatically become a paywalled resale just because its link is in Media Star. Review the actual content-owner permissions and platform rules before selling rights to playback. Source indexing/creator curation and underlying media rights are different.
- Site owner **does not** silently receive Fred's PayPal proceeds. A site fee/revenue split is optional, requires creator contract, PayPal partner/fee authorization, explicit calculation and receipts; never route another person's funds through an owner account by default.
- PayPal paid dollars are separated from StarCoins, GIT Coins, Bubble Bits, GPT Coins, coupons and experimental Cash Wallet; no money/token conversion is implicit.

Official docs: https://developer.paypal.com/platforms/seller-onboarding/ and https://developer.paypal.com/platforms/seller-onboarding/onboarding-checklist/ ; PayPal developer account onboarding: https://developer.paypal.com/platforms/embedded-integration/set-up-partner-account/ .

## C. Actual reusable code in PR (source-only until approved)

- `creator-paypal-studio.html` — original Android-first, functional creator pricing workbench with explicit "PayPal not connected" and official PayPal signup. Linked from original Quick Card Builder.
- `creator-paypal-studio.js` — local-only interactive form, validates and exports up to 500 card bindings, allows copy and clear. It does not make HTTP requests or write browser storage; no provider credentials or account IDs are collected.
- `creator-paypal-studio-core.mjs` — fail-closed `parseCreatorCardIds`, `parseUsdPrice`, `prepareCreatorPayPalManifest`, `assessCreatorActivation`, all exposing draft-only status. Rejects duplicate/invalid IDs, 501+ batch, fraudulent approval fields, invalid pricing and fake credential settings.
- `workers/creator-paypal/merchant-schema.sql` — non-deployed D1 **design draft**: creator-to-merchant connection, creator-card price/rights, one-use onboarding state hash, provider webhook/event replay ledger. No bank numbers or access tokens are stored. This schema has not been executed; safe migrations and security review are later.
- Node and 360px browser tests are tied to existing Quick Card CI. A test passing does not mean the PayPal partner account exists.

## D. Planned authenticated service (do not advertise these endpoints as available)

1. `POST /v1/creator-paypal/connect-intent` — signed-in creator, CSRF, signed server state/nonce/expiry; merchant identity resolved from server session; PayPal approved Partner Referrals API returns an official redirect URL. No browser-supplied merchant ID or consumer bank data.
2. `GET /v1/creator-paypal/callback` — verify PayPal state, exact return origin, delegated permission grant and verified merchant eligibility using PayPal API, once-only state and timestamp. Link only to server's verified creator identity; handle revoked/limited accounts.
3. `GET /v1/creator-paypal/status` — owner-only read of connection state and required actions, never raw bank or PayPal token. Deactivate cards on merchant revocation.
4. `POST /v1/creator-paypal/cards/batch` — authenticated creator, up to 500 authorized card IDs, rights/price/creator consent and review receipts; atomic binding and idempotency; reject foreign/unreviewed/unsupported categories. Editing a JSON template is not approval.
5. `POST /v1/creator-paypal/checkout` — current approved card and user-consented quote, server-selected verified payee and USD amount, provider Orders API, idempotency key, tax/fees, refund/delivery terms, merchant checks. Buyer approval occurs in supported PayPal secure checkout, not a hand-authored fake login or bank-brand widget.
6. `POST /v1/creator-paypal/webhook` — provider-signed raw request/event/merchant/currency/amount verification, replay suppression, secure capture/refund/dispute state transitions, immutable event journal, real provider readback. Never mint money after a browser redirect alone.
7. `GET /v1/creator-paypal/earnings` — authenticated per-creator pending/paid/refunded/disputed reports, explicitly separate from customer Cash Wallet and site-owner Star Coin program.
8. Processor sandbox acceptance with actual signed webhooks, cross-creator isolation, 500-card batch stress, partial import failure, PayPal account revocation, fraud, source-rights failures, 320/360/393px Android behavior; exact-head CI and independent review before any funded run.

**Financial and compliance blockers:** PayPal platform partner approval, merchant verification, processor fee agreement, account eligibility, seller rights and commercial terms, user auth/integration security, refund/dispute handling and local laws. A PayPal Business account alone may immediately permit manual Payment Links or Invoicing, but does not authorize automatic on-platform seller onboarding or instant paying 500 Quick Cards.

## E. Bubbles future intake template (reusable, not a pretend completed build)

Customer-facing Bubbles instruction:

> "Connect my PayPal merchant once and prepare monetization for my [up to 500] owned Quick Cards. My verified QuantaPhi account is the owner of these card IDs. Here is my proposed pricing and rights/license evidence. Show the reviewed card list and payout destination status (without bank details), request my explicit approval for prices/terms, and prepare a safe PayPal login. Do not activate payments until the actual provider confirms account eligibility, card rights and a verified checkout receipt."

Bubbles must translate that into one job for the existing creator merchant service, not invent 500 payee accounts, sell unrelated content or label every staged card as paid. Owner-level ads and sponsor invoicing remain a different service from creator-specific PayPal merchant sales.
