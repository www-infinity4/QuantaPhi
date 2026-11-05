# Bubbles executor income attribution + Media Star clicks · issue #1674

Owner intent, 2026-11-04: the signed-in owner is Bubbles' executor. Display verified Quant, GIT, GPT Bit and Bubble Bit attribution in that owner's wallet view, separately from actual wallet balances and real-money receipts. Report genuine Media Star card interactions, distinguish zero observed activity from unavailable analytics, and use impressions to diagnose targeting.

## Files
- `workers/executor-insights/schema.sql`: isolated D1 evidence and engagement tables; idempotent IDs and per-session impression guard.
- `workers/executor-insights/worker.mjs`: GET `/v1/executor/summary` (existing StarQuest session token verified against IDENTITY_DB), POST `/v1/media-star/event` (whitelisted site Origin and validated enums), GET `/health`.
- `media-star-interactions.js`: 750ms half-visible impression, first-party trusted UI action, original replay *intent*. No page bounce or media rehosting. The browser's `isTrusted` is a UI filter, not server-side proof a unique human clicked.
- `bubbles-executor-insights.js`: read-only extra pane in the existing wallet. Labels pending/settled separately and *never* replaces Quants, StarCoins, Infinity or Music Quants.

## Non-negotiable accounting boundaries
1. An executor *attribution receipt* is a claim with real source evidence, **not** cash income, transferable GIT, or proof a provider adopted the economy. Pending units are not spendable. Even `settled` units are displayed only as linked receipt counts until the Unified Wallet has independently confirmed the spendable balance. The Worker exposes **no HTTP credit/mint/spend endpoint**.
2. A separately authenticated/verifying Brain service must insert an immutable `executor_income_evidence` row with owner ID derived from verified session/job identity, receipt ID, source system, work ID, source line/commit quality proof where applicable, and wallet settlement receipt. Do not accept such fields from an ordinary browser. Do not award by lines of junk text, repeated builds, browser events or “thinking”.
3. Per-asset `QUANT` here means executor-attributed, independently verified receipts; it is not the total existing QUANT balance. Do not double credit the Unified Wallet or move Fred's StarCoin payouts. Replays and browser clicks have no asset minting relationship.
4. Media events are `browser_observed`, not independently verified people, successful audio playback, sales or profit. Public browser events can be spoofed despite Origin/CF bot screening. Attribution is limited to the configured platform owner, not arbitrary exported Media Star creator cards.
5. No raw IP, email, user-agent, login token, referrer URL, or private conversation is stored in event D1. The random session ID lasts one browser tab/session and is only used for approximate deduplication. Treat unique sessions as estimates, not exact unique humans. Do not claim paid ad conversions without a separate server-side purchase/payout receipt.
6. Nothing is backfilled. Before an instrumented live release, absent click data means **not recorded**, not “nobody clicked”. After deployment, zero sessions shown or clicks is a genuine zero within that collector's coverage only.

## Release gates (NOT done)
1. Independently review source and exact-head tests: `node --test test/executor-insights.test.mjs`, then full QuantaPhi CI. Test privacy, rate controls, replay/deduplication, authorization with two genuine accounts, event origin and bot abuse, mobile 320/360/393/720 layouts.
2. Provision/reuse appropriately isolated D1 and apply `schema.sql`. Bind `DB` (this new ledger) and the **existing** `IDENTITY_DB` account database; configure `MEDIA_STAR_OWNER_ID` using the account ID resolved on the server (never from public HTML). Secure write access to income evidence for an independent internal verifier only. Configure Cloudflare WAF/rate limiting before enabling unauthenticated event ingestion.
3. Deploy Worker, verify its protected summary rejects missing, cross-owner and revoked tokens. In first-party site configuration set `window.PhiExecutorInsightsEndpoint` to the actual verified HTTPS Worker origin **before** loading these scripts. Do not invent a production URL; absent config the client fails closed and shows “not connected”.
4. Confirm that one actual user tap appears once in source D1 and the owner's dashboard, then verify impressions, 30-day CTR and independent real purchase receipts (if any). Inspect actual source/placement conversion before changing Quant-targeting; do not invent clicks to improve metrics.
5. Wire trusted Brain receipt verification and GIT quality checks to owner-isolated income evidence, then reconcile settlements against the existing wallet before claiming spendability or cash withdrawal. Until then, zero automatic minting is intentional.

Related issues: [#1296](https://github.com/www-infinity4/QuantaPhi/issues/1296) Bits, [#1192](https://github.com/www-infinity4/QuantaPhi/issues/1192) Brain execution, [#1315](https://github.com/www-infinity4/QuantaPhi/issues/1315) Quant-ranked ads.
