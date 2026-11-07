---
issue: 1332
project: "Infinity sustainability scorecard and experimental hydrogen research"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/1332
state: implementing
dot: "🟡"
progress_percent: 8
progress_basis: "EPA/DOE methodology and lifecycle accounting fields specified, no measured baseline or validated owner energy prototype"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT source-only, no coordinator lease"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/power-chain-cooperative-1330
head_sha: null
pr: null
tests:
  - "Node cooperative comparison tests and Android 320/393px browser QA submitted, exact-head CI pending"
merged: false
deployed: false
live_verified: false
blocker: "Provider merchant quotes and fulfillment contracts, recipient-consent controls, sustainability measurements not yet integrated"
next_action: "Build evidence-backed environmental measurement schema; do not publish zero-carbon claims without measurement"
---

# Ticket 1332 — Infinity sustainability scorecard and experimental hydrogen research

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1332

## Current source milestone
Existing Power Chain public index and Bulk Allocator remain unchanged. Cooperating shopping plans have integer-cent quote comparison and opt-in research fields only; no direct merchant account, checkout, hub logistics booking, emissions measurements, dollar token conversion or customer purchase.

See [Power Chain blueprint](../../docs/INFINITY-COOPERATIVE-POWER-CHAIN.md).

## Remaining acceptance
Build evidence-backed environmental measurement schema; do not publish zero-carbon claims without measurement. Independent exact-head tests, review, deployment, receipts and actual authorization are required to claim each later milestone.

## Scope boundaries
- Shop products, customer payment, supplier prices, discounts and shipping are verified by their authorized providers.
- Customer/child gift profile data must never be silently fetched from private accounts, stored or used for ads.
- Regional warehouses (USA/Africa), Macy's/Walmart/Kroger/JCPenney partnerships and zero-carbon freight are not contracted or verified today.
- Novel hydrogen hypothesis is experimental research, not a proven net energy source. Compare measured input/output with safe independent validation.
- Never edit the existing wallet, Quants, Star Coins, account identity, tokens or private credentials in this scope.


## November 7, 2026 — Innovations · Solar Paint Quick Card source milestone
- **Owner request:** Create a separate Innovations carousel starting with https://8msolar.com/solar-paint-turning-any-surface-into-a-solar-panel/ and allow discovery of related breakthroughs and better uses. Solar Paint is **research** (8MSolar published April 2, 2025), **not** a purchasable can of electricity-producing paint.
- **Scoped branch:** `feat/innovations-solar-paint-1332-20261107`; scoped to the current QuantaPhi homepage, its established Quick Card controls and source-only R&D. No signed executor lease claimed.
- **Created:** source-backed catalog `innovations-carousel-core.mjs` with Solar Paint, NLR perovskite cells, DOE switchable solar windows, DOE integrated solar materials; individual original editorial concept SVG illustrations with clear disclosure, picture-first one-at-a-time `innovations-carousel.mjs` and CSS; homepage integration beside existing Infinity Concepts. Existing Follow, Star, Collect, Share and +1 Build use `quanta-card-actions.mjs`. The research action uses the existing QuantaPhi Search input/button, does not pretend results were discovered or silently auto-publish them.
- **Source evidence:** 8MSolar (April 2, 2025), NLR perovskite research `https://www.nlr.gov/pv/perovskite-solar-cells`, DOE switchable windows `https://www.energy.gov/cmei/buildings/articles/switchable-photovoltaic-windows`, DOE BIPV overview `https://www.energy.gov/cmei/systems/articles/expanding-solar-energy-opportunities-rooftops-building-integration`. All images are original illustrations, not site photographs or commercial product shots.
- **Tests:** `tests/innovations-carousel.test.mjs` authored before source catalog; new Android Playwright `test/innovations-carousel.browser.spec.mjs` covers 320/360/393px, artwork, real source links and research Search handoff. Source workflow `.github/workflows/innovations-carousel.yml` verifies Node, XML illustrations and Chromium. CI outcome **pending** until exact-branch run receipt.
- **Important open scope:** authenticated Bubbles automated recurring discovery/ingestion, rights-checked third-party artwork, editorial review, new card approval and release receipts; no public auto-publishing, electricity-output claims, money/coin/wallet changes, or verified prototype.
- **Status:** source staged on branch; CI, independent review, merge, Cloudflare readback, Android production acceptance **pending**. Original sustainability/packaging standard remains unfinished independently.
- **Next:** open PR for the same #1332, validate exact-head CI/browser checks, independent review, merge only if permitted, then separately verify live page and card actions. 

## November 7, 2026 — free Termux research collector for Innovations

- **User authorization:** return to solar-paint / hybrid photovoltaic + hydrogen / AI materials research, without paid trial tools. Scope is collecting public bibliographic metadata as source-backed editorial research candidates, not adding unsupported scientific efficiency claims.
- **Added:** `scripts/termux-solar-research.sh` in this existing solar Innovations branch. Self-contained shell + Python 3 standard-library collector; no API keys, npm, new backend or subscriptions. Searches 7 topics using public Crossref, Europe PMC and limited keyless OpenAlex. Caches raw provider responses for up to 20 hours and builds `~/quanta-research/results/quick-card-candidates.json`, `research-papers.csv` and `research-cards.html`.
- **Safety / accuracy:** source DOI preserved; deduplicate by DOI; direct published paper links; technical efficiency/hydrogen quantities intentionally `null`; all candidates `draft_only` and not available for automatic publication. Does not modify Cloudflare D1 or any StarCoin/Quants/GIT wallet and does not start a paid service.
- **Local verification:** `bash -n` passed, embedded Python compiled, mocked three-provider pipeline deduplicated a shared DOI into 1 draft with no invented efficiency data. This is a local simulated test, not proof of a real remote ingestion or Android UI.
- **CI:** Innovations workflow source job extended to check shell/Python syntax and safety markers on the branch. Exact-head GitHub CI, independent review, PR mergeability, real Android Termux network run, eventual QuantaPhi deployment and automatic card ingestion remain to verify.
- **Next action:** check exact-head CI and test the one-paste launcher on the user's Termux. Preserve raw provider HTTP errors instead of claiming data imported. Review source rights/claims before any future Media Star or Innovations publication.
