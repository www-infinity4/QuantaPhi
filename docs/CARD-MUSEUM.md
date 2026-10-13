# Infinity 2026® Card Museum — staged implementation

## Four collection series
- **StarQuest** — space, science, history, StarQuest collection artwork.
- **Chiller** — original classic spooky/chiller collector artwork.
- **ShopLC** — shopping discoveries and commerce-related original collector designs (not third-party ShopLC imagery without permission).
- **Infinity Radio** — radio history, shows, and original music-themed designs (not copyrighted cover art without permission).

The four starting series are catalog **slots**, not automatically created or sold cards. Publishing a design requires a real finished image from the site's Trading Card mode. No placeholders count as owned assets.

## Serial and payment contract
- Design has one durable original artwork record; individual StarQuest wallets may hold multiple issued copies.
- Buyer A of a design receives `1/1`, buyer B `1/2`, buyer 1000 `1/1000`, buyer 2000 `1/2000`. This is **issue order**, not a limited edition of one.
- A copy costs exactly **1 StarCoin** (from `accounts.star_coins`, not Quants or an optimistic browser balance).
- One SQL `INSERT` into `qp_collector_copies` uses the per-design next serial number; a trigger atomically debits the authenticated StarQuest account and creates a ledger event. Unique keys ensure one buyer request cannot be charged twice and per-design serials cannot collide. Serial contention fails safe; retries use the same request ID.
- Every settled copy has a wallet account ID, immutable token ID, receipt ID, design ID, gold edition, recorded price, timestamp and a recovery path. Quant D1 receives an idempotent `quant_collector_receipts` mirror. A failing mirror **does not cancel, duplicate, or re-charge** the authoritative receipt; owning copy history retries the projection.
- The gold edition is composited from the server-verified receipt on saving an owned card. The original artwork is never permanently altered and can be reconstructed on any device from the wallet receipt.

## Museum privacy and release schedule
- Museum holds **one slot per published design**; sold copies appear in the wallet, not as duplicate museum artworks.
- Before the first purchase, there is no public reveal date and the public gallery displays a sealed slot.
- First settled sale begins the seven-day period, not image creation or page load.
- Before the seven-day deadline, public museum JSON never includes the unreleased image URL or total sales count, and unauthenticated image requests are denied. People can authenticate and explicitly preview a sales offer **before paying**.
- On or after exactly seven days from the first sale, public museum shows one image and the **actual total sold**, and later buyers keep receiving sequential numbers. The original might reach 1/1000 before reveal and 1/2000 after another 1000 copies sell.
- A buyer can view their issued copies immediately. Museum reveal does not change wallet ownership and does not guarantee future resale value.

## Routes
- `https://quantaphi.org/card-museum/` — standalone museum with StarQuest, Chiller, ShopLC, Infinity Radio.
- `/#collectorMuseum` — the same museum embedded in the home page.
- `/#collectorShelf` — private wallet-owned album (latest 100, server-filtered by device account).
- `GET /v1/collector/museum` — public sealed/revealed metadata only.
- `GET /v1/collector/art/:designId` — *public only after reveal*.
- `GET /v1/collector/preview/:designId` — authenticated preview even before first sale.
- `POST /v1/collector/designs` — authenticated publication of a finished Trading Card image.
- `POST /v1/collector/purchase` — authenticated 1-StarCoin issuance.
- `GET /v1/collector/copies` — authenticated personal asset inventory, with Quant receipt repair.
- `GET /v1/collector/offers` — authenticated available card previews, metadata.
All write endpoints require the established `sq_` device token; neither anonymous clicks nor refreshing mint assets.

## Rollout blocker — Cloudflare R2
On October 13, 2026, the connected Cloudflare account returned **10042: Please enable R2 through the Cloudflare Dashboard**. The service is not safe to deploy as a functioning collector checkout until:
1. R2 is enabled and an R2 bucket called `quantaphi-collector-art` is created.
2. The Quant ledger Worker has the `COLLECTOR_ART` R2 binding from `workers/quanta-phi-ledger/wrangler.toml`.
3. The authenticated D1 schemas and browser flows pass live verification: upload original art, preview without spending, purchase twice from different wallets, enforce balance, retry identical request, check sale count and day-seven cutoff.
4. Check Cloudflare storage/bandwidth costs and rate limits before large-scale image uploads.
Do not fake a checkout receipt, auto-create a designer card, promise infinite free storage, or bypass this blocker. The planned bucket name is a provisioning target, **not** a claim that it currently exists.

## Ownership and rights
The purchase grants an application-recorded digital collectible asset and its copy/receipt history; it does not automatically transfer copyright, confer NFT status, or establish resale-market value. Artists must hold rights to the artwork they list. An outside brand's trademarks and assets may require permission, and an independent Infinity original should avoid implying brand endorsement.
