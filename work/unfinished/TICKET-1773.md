---
issue: 1773
project: QuantaPhi Cash Wallet funded USD account and merchant checkout
state: source_tested
dot: "🟡"
progress_percent: 15
progress_basis: "Dollar contract, preview, isolated D1 draft, source CI passed. No provider/merchant wiring or live deposits."
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT · owner-requested source engineering"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
last_observed_at_utc: "2026-11-07T02:00:00Z"
repo: www-infinity4/QuantaPhi
branch: feat/cash-wallet-foundation-20261106
pr: 1772
tests:
  - "Exact-head Cash Wallet source safety (no real funds) CI SUCCESS on commit 577d4f2fc4a68de87365e97451d2d86463d19a41"
merged: false
deployed: false
live_verified: false
blocker: "Licensed stored-value/funding provider, account identity/verified settlement, merchant checkout integration, receipt reconciliation and independently observed sandbox test are missing."
next_action: "Obtain partner/compliance approval and decide single-merchant closed-loop versus multi-merchant regulated wallet before writing or enabling money movement."
---

# TICKET-1773 · Cash Wallet

- **Canonical issue:** https://github.com/www-infinity4/QuantaPhi/issues/1773
- **Source PR:** https://github.com/www-infinity4/QuantaPhi/pull/1772
- **Customer objective:** Load USD once, pay using available settled balance at participating in-app checkouts without re-entering a card every purchase.
- **Current state:** Source-only prototype and policy gates. Provider-backed custody, real top-ups and spend endpoints are not live. Cash amount must never be falsely inferred from Quants, Star Coins or coupons.
- **Built:** cash-wallet-core.mjs, cash-wallet-preview.html, cash-wallet-card.mjs, cash-wallet-card.css, workers/unified-wallet/cash-wallet-schema.sql, test/cash-wallet-core.test.mjs, test/cash-wallet-preview.test.mjs, docs/CASH-WALLET-RELEASE-GATES.md, and CI workflow.
- **Tests:** PR exact-head Cash Wallet workflow SUCCESS before this unfinished ledger file. Recheck new exact-head after any subsequent commit.
- **Hard gates:** Partner & legal program approval → backend authentication and settlement webhooks → atomic wallet + provider reconciliation → merchant enrollment → refunds/disputes → mobile/provider sandbox receipts → signed production readback. No customer-facing live funds claim until all pass.
- **No financial mutations:** Code not merged/deployed; no real money, new balances, personal payment data, or existing reward/coupon records touched.
