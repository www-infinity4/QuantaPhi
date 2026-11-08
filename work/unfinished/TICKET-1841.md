---
issue: 1841
project: "QuantaPhi creator PayPal Connect — one account, up to 500 Quick Cards"
source_requests:
  - "2026-11-07 owner PayPal merchant onboarding + Fred 500 card monetization"
state: source_tested
dot: "🔴"
progress_percent: 22
progress_basis: "Five source components, local draft UI, documented account flow, tests staged. None of the critical PayPal merchant authorization, platform partnership, authenticated server, money movement or live checkout is verified."
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT Green source engineer; no separate signed Brain lease claimed"
lease_id: null
lease_expires_at: null
fence: null
task_session_id: null
repo: www-infinity4/QuantaPhi
branch: feat/creator-paypal-studio-1841-20261107
pr: 1842
merged: false
deployed: false
live_verified: false
blocker: "User-controlled PayPal Business sign-in, actual merchant eligibility, PayPal platform partner approval, owner/creator consent, backend checkout and payment reconciliation absent."
next_action: "Inspect exact-head PR #1842 card-quality CI, correct real failures, obtain independent review, then continue official merchant onboarding after user saves PayPal browser sign-in."
---

# Ticket #1841 · PayPal creator merchant for up to 500 Quick Cards

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1841


## November 7, 2026 · first source stage

User wants secure PayPal Business onboarding, guided page navigation after manual sign-in, and a reusable creator monetization system. Their example is Fred attaching the same verified seller account to 500 of his owned/rights-cleared QuantaPhi cards. The direct billing sponsor program (#1315) and customer Cash Wallet (#1773) are separate.

**User-controlled browser:** a distinct TinyFish browser profile was created with target official PayPal Business signup. The setup URL was sent to the owner in the ChatGPT session. Profile cookies, credentials and callback secret were *not* committed. Sign-in/save status not yet confirmed, therefore no authenticated form automation, merchant onboarding, payout or bank linking performed.

**Source created in PR #1842:**
- `creator-paypal-studio-core.mjs`: max 500 per manifest, exact price parsing, rejects extra privileged fields/duplicates, explicitly blocks checkout.
- `creator-paypal-studio.html` and `creator-paypal-studio.js`: real Android-first pricing form, local JSON preview/copy/download, no vendor API, no bank/private data and no false merchant connected UI. The original `quick-card-builder.html` links it.
- `workers/creator-paypal/merchant-schema.sql`: **unapplied** D1 design for creator merchant connection, individual card permissions, one-use onboarding state, verified provider payment/refund event reconciliation.
- `docs/PAYPAL-CREATOR-MONETIZATION-PLAYBOOK.md`: official PayPal standalone merchant signup, first payment links/invoices, and partner-approved seller onboarding for creator platform.
- `test/creator-paypal-studio.test.mjs` and `test/creator-paypal-studio.browser.spec.mjs`: source and 360px Playwright draft/export/security specs wired to existing card-quality workflow.

**No financial side effects:** source only. No password, OTP, tax ID, PayPal token, bank number, owner or Fred merchant ID stored. No user payouts, commission splits, wallet mutations, purchased licenses, content-owner authorization or live PayPal Checkout. A seller handles their own PayPal login and payment/terms consent. Do not assume Fred owns third-party X/YouTube content rights.

**Further gates:** exact-head CI, independent code review, signed in-app creator identity, approved PayPal platform partner/Partner Referrals API, per-creator consents and status, official server-generated order/capture, rights/terms review, signed payment webhook idempotency, creator settlement reporting, Android and provider sandbox receipts, approved merge/deploy and live UI readback.

**Source links:**
https://developer.paypal.com/platforms/seller-onboarding/
https://www.paypal.com/us/business/open-business-account
https://developer.paypal.com/payment-links-buttons/create-payment-link/
https://developer.paypal.com/invoicing/about/

Status remains RED until exact-head CI and the external PayPal partner requirements are verified.
