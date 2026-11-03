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
