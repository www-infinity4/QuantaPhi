# Star Coin Cloudflare tracking, October 4, 2026

QuantaPhi Collect and Share buttons each earn +0.1 Star Coin. Before this change, a Collect only credited the browser wallet (`QuantaPhiWallet.addCollect`). No Cloudflare service received a receipt for it. For a signed-in account, the StarQuest cloud state overwrites the browser Star Coin balance, so those browser-only Collect credits could disappear. Shares already went through Control Phi's StarQuest receipt queue when Control Phi was loaded. No Cloudflare ledger kept QuantaPhi's own copy.

## What changed

- `window.QuantaStarCredit(kind, reference, card)` in `index.html` is now the only credit path for the card Collect, card Share, page Share and AI Overview Share buttons.
  - Collect uses `ControlPhi.ensureActionCredit(ref,'collect')`, and Share uses `ControlPhi.ensureShareCredit(ref)`. Both queue the StarQuest Cloudflare receipt that owns the signed-in balance. If Control Phi has not loaded, the local QuantaPhi wallet credits the coin as before.
  - When the credit is new, it is also recorded with `QuantaStarCoinCloud`. Duplicate credits are not recorded again.
- `star-coin-cloud.js` keeps a durable browser outbox (`quantaPhi:pendingStarCoinCredits:v1`). It sends that outbox to `POST /v1/quants/star-coins` on the QuantaPhi ledger worker. Items are removed only after the ledger confirms them. It retries on load, focus, `online`, a visible tab and `starquest:ledger-connected`. The first time an account runs it, it backfills earlier browser-only QuantaPhi Collect/Share credits and collected cards.
- `workers/quanta-phi-ledger/worker.js` adds:
  - `POST /v1/quants/star-coins`: stores up to 100 receipts in the `quanta_star_coin_credits` table, one row per account and reference ID, so retries never credit twice. Collect receipts also upsert the collected card into `quant_collects`.
  - `GET /v1/quants/star-coins`: returns the account's total tenths, whole Star Coins, progress toward the next coin, Collect and Share counts, and recent history.

Search minting is unchanged: one search still commits the Quant and the Infinity token together through `/v1/quants/search`, with the durable retry queue.

## Deploy (Cloudflare)

1. Merge so GitHub Pages serves `star-coin-cloud.js` and the updated `index.html`.
2. Deploy the ledger worker with its existing bindings and cron trigger (`workers/quanta-phi-ledger/wrangler.toml`): `npx wrangler deploy` from `workers/quanta-phi-ledger`. The worker creates the new table on first use. `quant-transfer-schema.sql` documents it.
3. Verify the served bytes as described in `SEARCH_RECOVERY_2026-10-04.md`. Purge the Worker subrequest cache if the old `index.html` is still served.
4. Signed in on the phone, tap Collect on a card. Then check `GET /v1/quants/star-coins`, or `localStorage['quantaPhi:pendingStarCoinCredits:v1']` should become empty.

Validation: `node --test test/star-coin-cloud.test.cjs`. It covers D1 idempotency and card storage, the offline outbox and later flush, the one-time backfill, and Control Phi routing with the local fallback. No balances, credentials or history are reset.
