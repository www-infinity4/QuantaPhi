---
issue: 1481
project: "Universal Coupon Wallet and original Pepsi/Mello Yello Quick Cards"
source_requests:
  - "2026-11-03 owner request to engineer distinct product coupon cards and Follow-to-Wallet experience"
state: source_tested
dot: "🟡"
progress_percent: 25
progress_basis: "Source pilot and 7/7 focused unit tests passed; no live issuer offer, account D1 sync, merchant redemption or production mobile acceptance"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT · interactive owner-requested source engineering"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
last_observed_at_utc: "2026-11-03T18:20:00Z"
repo: "www-infinity4/QuantaPhi"
branch: "feat/coupon-quick-cards-20261103"
head_sha: null
pr: 1621
tests:
  - "Coupon card Node tests 7/7 PASS at source head cf5363429e538e328196722fff0a6397bb50de3c"
  - "JavaScript syntax and empty-default verified feed schema PASS"
ci:
  - "https://github.com/www-infinity4/QuantaPhi/actions/runs/41692497694 - SUCCESS on code head cf536342"
merged: false
deployed: false
live_verified: false
blocker: "Reviewed issuer offer feed, real image usage approval, signed-in D1 sync, merchant authorization, independent browser review and release gates remain outstanding"
next_action: "Run exact-head coupon and unfinished-ledger CI for PR #1621, then independently verify mobile card controls and original artwork rights before any merge"
---

# TICKET-1481 · Verified Coupon Wallet and original-source cards

- **Canonical issue:** https://github.com/www-infinity4/QuantaPhi/issues/1481
- **Source request:** owner asked for Pepsi and Mello Yello coupon advertising discovery, Follow-to-Wallet auto-save, Walmart/McDonald's checkout advice, and creative experimental cards.
- **Owner/agent:** interactive ChatGPT engineering session; no coordinator lease was obtained or claimed.
- **Task/session identity and lease fence:** null / unclaimed.
- **Last observed:** 2026-11-03 UTC.
- **Repo/branch:** `www-infinity4/QuantaPhi` / `feat/coupon-quick-cards-20261103`.
- **Progress:** 🔴 unfinished, ~25% estimated (pilot original-source Pepsi and Mello Yello layouts + device-only public coupon organizer + static source and unit tests; **zero live verified coupons, zero approved merchant redemptions**).
- **State:** implementing → test pending (not deployed, not merchant connected).
- **Sessions spent / remaining estimate:** 1 / unknown.

## Work completed in this bounded session
- Two visually distinct cards with real retailer-sourced product artwork, original issuer/product/promo links and Follow actions.
- An integrated third Coupon Wallet card with opt-in device-only Follow reconciliation, reviewed public source feed, expiration/review checks, duplicate prevention and merchant-specific **advice only**.
- Reviewed offer file intentionally empty; no fabricated or secret codes.
- New branch work committed to `coupon-wallet-core.mjs`, `coupon-quick-cards.mjs`, `coupon-quick-cards.css`, `data/verified-coupon-offers.json`, `index.html`, `oracle-card-deck.js`, and `test/coupon-quick-cards.test.mjs`; branch-only CI added.
- No existing token wallet, Quants, Star Coins, payments, identity or Cloudflare D1 rows touched.

## Evidence and acceptance gates
- Issue #1481 is the master feature contract. Focused `node --test test/coupon-quick-cards.test.mjs` and `node --check` are the initial source acceptance commands; GitHub CI + browser/mobile checks required.
- Test creation preceded production implementation. Runtime and exact-head CI outcomes must be linked on the issue when reported.
- No claim of production visibility, actual coupon availability, merchant-app integration, secure cloud wallet sync or real checkout until independently verified.
- Original images are linked from public retailer sources as independent discovery, not a claimed partnership or licensed creative.

## Unfinished / blockers
1. Exact-head CI run and browser widths 320/360/393/720; verify keyboard/focus, original moving-deck transitions, image loading and card registration.
2. Verified recurring issuer feed and legal use of third-party product images; current empty offer file is truthful but cannot provide current savings.
3. Signed-in, per-user Cloudflare D1 sync; current pilot uses browser device storage only.
4. Merchant-authorized APIs / real transaction receipts; Walmart in-store paper policy and McDonald's one-app-deal restriction prevent a universal automatic tender promise.
5. Security/release review plus independent production readback before closing.

**Next one executable action:** open the feature PR, inspect exact-head coupon CI, and fix any source failures. Preserve distinct merge, deployment and live-verification gates.
