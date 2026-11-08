# QuantaPhi · consented sponsorship boosts and payment separation

**Source milestone only, November 7, 2026 CT.** Existing tickets: ad targeting #1315, advertiser outreach #1317, Cash Wallet #1773 / source PR #1772, legal review #1837. No ad campaign, checkout, bank payout, Cash Wallet deposit, PayPal authorization, Google AdSense earnings or live Cloudflare campaign database is established by this change.

## Distinct payment workflows (do not merge)

| Workflow | Correct processor path | Destination | Evidence |
| --- | --- | --- | --- |
| Brand buys a $100 experimental sponsored Quick Card boost | QuantaPhi verified merchant account -> provider-hosted invoice/payment link (Stripe Invoicing or PayPal Business Invoicing) -> provider-signed payment/webhook confirmation | Processor-approved settlement account, configured privately in **the processor** | Provider invoice ID, idempotent payment ID, paid/settled status, sponsor contract, refund history |
| Brand negotiates a $100,000/month premium sponsorship | Written scope, proper pricing/disclosures, invoicing with terms, procurement/tax approval before payment | Privately verified merchant settlement setup | Both parties' signed agreement, audit and provider receipt; this is an **asking price**, never an earnings or reach guarantee |
| Consumer purchases a product at merchant checkout | Official merchant/provider-approved checkout, optionally Stripe Checkout + supported ACH/Financial Connections or PayPal Checkout | Authorized merchant account, not QuantaPhi's anonymous wallet | Signed order, user payment authorization, successful provider capture and real fulfillment |
| Consumer funds QuantaPhi Cash Wallet for later multi-merchant spending | **Separate regulated stored-value partner** + licensed account/program, settlement reconciler and KYC/AML/compliance where required (see #1773) | Provider-managed customer funds | Settled balance after verified provider webhook and custody reconciliation; separate from Quants/Star Coins |

**Bank account business-use gate (important):** As of November 2026, Chime's own help says it does **not** support business accounts and its Checking Account is intended for individual personal use: https://help.chime.com/account-security-00b00e5a/account-info-9fa82bb4/does-chime-offer-joint-accounts-or-business-accounts-1595d11d and https://help.chime.com/how-do-i-open-a-chime-account-bafa327e . The owner should **not assume Chime is eligible** for commercial sponsorship merchant settlement. Confirm legal payee type and use an eligible business payout account under the merchant entity/provider contract; verify any personal withdrawals or subsequent PayPal transfers separately with the relevant terms. Chime's PayPal compatibility article is https://help.chime.com/can-i-use-my-chime-account-with-third-party-apps-1d922bbb and does not change the business-use limitation. Never represent connected ChatGPT Finances account records as processor bank verification.

**Important:** Stripe Financial Connections and Plaid Link can connect bank accounts with appropriate permissions; neither is a general-purpose substitute for payment processing. Stripe Payments/Connect can handle eligible provider-accepted purchases, invoicing and payouts, but do **not** assume this creates a licensed QuantaPhi multi-merchant stored-value account. PayPal also requires merchant onboarding and compliant provider operations. QuantaPhi **cannot** spend or transfer a bank balance merely because ChatGPT Finances has a read-only bank connection. Do not put bank credentials, routing/account numbers, PayPal secrets, Plaid access tokens or merchant restricted keys in GitHub, Bubbles prompts, browser JS, advertiser email, or unencrypted D1 fields. Each provider's onboarding must be completed by the account owner directly, with exact plan/fees/identity confirmed.

Official references:
- Stripe secure bank connection: https://stripe.com/financial-connections
- Stripe Checkout and ACH: https://docs.stripe.com/payments/ach-direct-debit/accept-a-payment
- Stripe invoicing: https://docs.stripe.com/invoicing
- Stripe Connect: https://docs.stripe.com/connect
- Plaid Auth (bank authentication is **not** a processor): https://plaid.com/docs/auth/
- PayPal invoice, orders, webhooks: https://developer.paypal.com/api/rest/current-resources/
- PayPal live account requirements: https://developer.paypal.com/api/rest
- Existing project Cash Wallet gates: `docs/CASH-WALLET-RELEASE-GATES.md` on PR #1772.

## Unique QuantaPhi boost: user-chosen relevance rather than invisible surveillance

Read-only function `sponsored-boost-policy.mjs` accepts a *trusted server-approved campaign snapshot* and only the currently active visitor's **consented first-party** follow or explicit liked product signal. It does not search offsite, listen on the microphone, read banks, use GPT memories, infer sensitive categories or inspect private messages. Rotation is during an active QuantaPhi session, inside the contracted UTC campaign window. No invisible background prompting or person-level export.

- No opt-in, no voluntarily followed/liked product, explicit Not for me or inactive session -> no personalized sponsored boost.
- Company may supply its own current, approved, rights-cleared products and image variants. Show only in-stock, source-fresh creative; do not fabricate sale/discount, stock or product images. Ensure creator consent, publisher/third-party media rights and category-specific regulations.
- Keep explicit `Sponsored` label and `Why this card` reason; Public and Following catalogs remain intact. Neither a paid ad nor a click can delete non-ad inventory or override user hide.
- Frequency cap and minimum gap suppress aggressive repeats, alternate real approved variants and preserve negative choices; default to nonpersonalized contextual ads when consent unavailable.
- Never use sensitive categories or special categories (health, credit, politics, adult, cannabis etc) for interest profiling, and never target a business with bank, Finance or payment details.
- `qualifiesSponsorCampaign` models review gates; **not financial proof**. A malicious browser can invent `fundingStatus: settled`, so the client must never provide it; the backend must fetch approved campaign/merchant/contract data from trusted storage, independently verify signatures/settlement, and honor active contract dates.

## Qualification and reporting

Cloudflare `quantaphi-site-traffic-ledger` is useful verified aggregate **HTTP traffic**. It includes bots and does not establish unique human visitors, visible advertisements, clicks, conversions or attributable sales. Present it under exact source/UTC dates and with these distinctions. Do not count an ad as viewed merely because the carousel generated or rotated it.

A planned consent-aware server telemetry pipeline should require:
- Authenticated/attested delivered creative, verified availability and visible on-screen threshold (e.g. 50% area for 1s for display-style viewability), respecting no-tracking preference.
- De-duplication keyed to bounded short-lived server receipts; bot/fraud filtering; human user click required; independent conversion only after merchant-authorized event; explicit source definitions, UTC period and aggregate only to advertisers.
- Never cross-sell personally identifiable device data. Keep records with approved retention/erasure, no raw full URLs/identity fields in sponsor reports.
- Negative controls: background tab, never-painted creative, auto-scroll or rotating hidden carousel -> **zero eligible sponsored impressions**. Repeated refresh/robot traffic -> excluded from paid click metrics.
- Keep Google AdSense inventory **separate**. Never reward Google ad clicks or trigger synthetic viewing; sponsored direct-sold Quick Cards must be visibly identified as ads, and terms prohibit guaranteed performance without validated evidence.
- For the $100 pilot, record the actual invoice/payment (when verified) and independent before/after qualified clicks, placement, traffic, duration and comparable audience; do not claim a causal lift without a controlled comparison.

Official policy references:
https://support.google.com/publisherpolicies/answer/48182
https://support.google.com/adsense/answer/2660562
https://www.ftc.gov/business-guidance/resources/native-advertising-guide-businesses

## Secure architecture and work gates

1. **Owner-controlled provider onboarding:** verify legal merchant identity, processor support/fees, business payout destination privately and valid business terms. Never submit bank details to a model or email. Choose between Stripe Invoicing/Checkout and PayPal Business invoicing based on actual merchant eligibility and account owner consent. Do not turn on another user's saved bank.
2. **Backend first:** rate-limited, authenticated advertiser invoice intent; never accept amount, payment success, campaign approval or bank destination from the browser as truth. Campaign status transitions `draft -> reviewed -> invoice_issued -> provider_paid -> active -> ended/refunded` occur server-side after verified evidence.
3. **Signed webhook:** use provider-issued signature and raw request body, timestamp/replay control, verified merchant ID/account/currency/amount and idempotent storage transaction before activating a paid spot.
4. **Cloudflare D1:** use a new isolated advertiser database/schema for aggregate campaign contracts, statuses, asset rights and approved creative; do not reuse the reward wallet or Cash Wallet user funds tables. The source-only D1 draft `workers/sponsor-boost/ads-ledger-schema.sql` in this branch is **not** a migration or deployed database.
5. **Media/placement:** display only reviewed campaigns when actual active server campaign snapshots and consent/preference conditions are satisfied. Mark paid labels and subject to category restrictions. Record valid metrics only via separately verified server-side receipts.
6. **Checkout UX:** use the payment provider's verified hosted banking/ACH chooser if eligible—never copy fake bank-brand logos or invent a "Pay now" connected state. Capture immutable provider invoice/charge status and reconciled settlement before reporting income.
7. **Separation:** Direct-sponsor invoices and cash revenue are not Quants, Star Coins, GITs, Bubble Bits, GPT Coins or preloaded user Cash Wallet deposits. Reconciled USD income remains a separately authorized merchant ledger.
8. **No publish without tests:** isolated source regression, staged provider sandbox with real signed webhook replay, auth/CSRF/fraud tests, 320/360/393px browser/Android, independent legal/privacy review, exact-head CI, authorized merge and production readback with genuine processor receipt. No live payout until that evidence exists.

## Owner action required (when prepared)

- Complete Stripe or PayPal **business merchant** onboarding in the provider's own official account dashboard; connect the desired eligible settlement account there, under the owner's control. Do not disclose bank numbers in this project, GPT prompt or outgoing ad pitch.
- Approve the final public price list, refund/invoice terms, brand contact batches and physical mailing/sender details before sales outreach.
- Bring a real licensed payment/stored-value provider agreement to Cash Wallet #1773 if multi-merchant preloaded USD money is required. Standard payment checkout is not equivalent.
