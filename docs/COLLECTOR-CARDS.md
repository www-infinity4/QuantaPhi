# Infinity 2026® numbered collector cards — deployment gate

Status: CODE STAGED, NOT LIVE. The existing QuantaPhi image generator remains the artwork source; this feature does not create its own model or guarantee free unlimited rendering.

## Owner rules
- One design is the immutable, saved source image and its rendering reference.
- Purchase costs exactly **1 spendable StarCoin**. A first paid copy of a design gets gold **1/1**, second gets **1/2**, thousandth gets **1/1000**.
- Edition numbers are assigned by the StarQuest/IDENTITY_DB purchase transaction, never localStorage, a refreshed page, or the image model.
- Every purchase gets a permanently stored IDENTITY_DB collector copy, unique token and receipt, with StarQuest ledger debit and an eventual idempotent Quant data mirror. The purchase price is **cost basis**, not an estimated resale value.
- Purchase replay uses the same device-wallet authentication and `requestId`; do not create a new ID when a request times out. Buyers may deliberately buy another edition with a fresh request ID.

## Required Cloudflare setup before activation
The Cloudflare account currently returns **10042: Please enable R2 through the Cloudflare Dashboard**. The currently deployed `quanta-phi-ledger` Worker has **DB** and **IDENTITY_DB** bindings only.

1. The Cloudflare account owner must enable R2 in their Dashboard. Do not silently create a paid service or guess credentials.
2. Create or select a persistent private R2 bucket for original images and bind that bucket to `quanta-phi-ledger` as **COLLECTOR_ART**.
3. Deploy the Worker from `workers/quanta-phi-ledger/worker.js` with `collector-cards.mjs` beside it. Keep the existing DB and IDENTITY_DB bindings.
4. Deploy the QuantaPhi static assets and index after the API and art route pass tests. Do not expose checkout first.
5. Smoke test two different authenticated buyers against one saved design. Confirm serial 1/1 then 1/2, 1 StarCoin deducted from each, unique receipt/token, Quant projection, downloadable image with gold type, duplicate request no charge, insufficient funds no issuance, disconnected wallet no issuance. Confirm card shelf shows original receipt after reload.
6. Add abuse, upload size and storage quota monitoring before promoting broadly. R2/storage and image model use are not unlimited or guaranteed free.

## Record ownership
- `IDENTITY_DB.qp_collector_designs`: published immutable artwork metadata (R2 binary kept out of D1).
- `IDENTITY_DB.qp_collector_copies`: authoritative paid editions, owner, serial, token ID, receipt ID, idempotency ID.
- `IDENTITY_DB.accounts.star_coins` / `ledger_events`: the only valid spend and ledger evidence.
- `DB.quant_collector_receipts`: retry-safe mirror for Quant data, never a second debit or mint.

Publishing a design alone does not debit a buyer. Buyer-facing image and edition records are only created after authenticated settlement.
