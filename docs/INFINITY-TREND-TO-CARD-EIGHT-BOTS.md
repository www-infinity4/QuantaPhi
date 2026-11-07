# Infinity Trend-to-Card · eight-role pilot (November 7, 2026)

Parent: [QuantaPhi #1315](https://github.com/www-infinity4/QuantaPhi/issues/1315). Related: music controls #1641, trending movie PR #1776, QuantaPhi Quick Card publisher and Media Star creator. This branch is a **reviewable source change, not a live eight-agent deployment**.

## Owner-directed bot delegation

| Role | Responsibility | Required receipt |
| --- | --- | --- |
| 1 · GPT Director | Read owner request, AGENTS.md, duplicate tickets, assemble the task and delegate Yellow research | Issue and exact scoped work order |
| 2 · Yellow | Collect Google Trends RSS and permitted original artist/merchant source evidence into isolated D1; no unlimited scraping | Source URL, read/checked time, category and record count |
| 3 · Orange | Choose between eligible related cards and ads with Quant AI, freshness, fairness, nonrepeat and editorial rights constraints; only Orange may authorize discovery placement | Signed service/Quant AI verdict, explained decision and authorized moderation record |
| 4 · Blue | Assemble source-backed Oracle Octaves cards using original player and merchant data; no invented stock or media | New card ID, source mapping and actual card assets |
| 5 · Green | Make embedded player, source Buy/View, user search, build, and post/share controls work; no false on-card playback claims | Functional and negative-path interaction tests |
| 6 · Red | Independently check validity, source/rights, security, responsive Android controls, wallet isolation and regression | Test run, CI SHA, browser and source receipt |
| 7 · Purple | Preserve job lease, checkpoint, dependency, retry and blockers in D1/Continuity until merge and verified release | Durable job ID, attempts, last_error and next owner |
| 8 · Silver | Review exact-head PR/CI, merge only when authorized, deploy, perform live origin and Android readback, repair on failure | Merge SHA, deploy ID, live URL and page/test evidence |

**A queued job is not a running bot.** The D1 Worker schedules and stores work; an authenticated agent runner still must claim each job and perform the role. Worker `/health` explicitly reports `active_bots:0` until a real agent runtime is connected. Purple is a parallel watchdog; the critical content path is GPT → Yellow → Orange proposal → Blue → Green → Red → Silver. A bad or expired lease returns to the queue instead of disappearing, with 4-attempt limit and explicit blocked status.

## What the staged code really does

- `trend-card-core.mjs`: explicit-source validation; normalized entity matching and repeat suppression; no sponsored offers disguised as organic; Orange proposal does **not** equal publish authority.
- `workers/trend-card-engine/worker.mjs`: Google Trends **RSS** only, bounded to 750KB/60 entries per scheduled fetch, durable D1 `trend_signals`, eight daily role queue records, lease revival, authenticated 10-minute claim and evidence-backed completion routes. No wallet, user profile or third-party account reads.
- `workers/trend-card-engine/schema.sql`: isolated D1 tables. Never bind the identity, main Quant-AI source DB or the wallet to this Worker.
- `seed-pink-floyd.sql`: November 5 official *Animals 50* announcement / *Sheep (Original Radio Edit)* and official store listing as a **pending Orange proposal** with media rights and testing flags off. No in-page Spotify ID or licensed art has been supplied; do not pretend playback works.
- `index.html` & `creator-ad-studio.css`: **permanent** public creator links immediately after the lower-page sponsor board. The Quick Card publisher still creates a real shareable URL **unlisted**; Media Star links to its existing Oracle creator card. Creator advertisements and sponsored content require independent rights and pricing checks.

## Cloudflare setup and release gate (NOT executed by the presence of this file)

1. Create an isolated D1 database `quantaphi-trend-card-engine`. Apply `schema.sql`, then `seed-pink-floyd.sql`. Verify table counts and source values by readback. Do **not** reuse any wallet or identity D1.
2. Deploy the new Worker as its own service with `TREND_DB` bound to the exact D1 ID. Add the `OPERATOR_TOKEN` secret using secure Cloudflare bindings; never commit its value. Configure hourly UTC `0 * * * *` Cron Trigger. Route only reviewed /health, /featured and authenticated /jobs endpoints; restrict claim/complete access.
3. Confirm a real successful Cron fetch, a D1 count of Google RSS signals and eight queued job rows. Google searches are discovery signals, **not** proof a specific movie, song or product is for sale. Yellow must independently verify music, images, offers, prices and explicit URLs.
4. Connect authenticated Bot/Brain executors to claim, do work, attach actual evidence, and complete; reserve Orange promotion approval for a **verified Quant AI service receipt + authorized moderation**. The current `/orange/approve` deliberately fails 503 until the contract is securely implemented.
5. Add a reviewed provider-specific in-card player (Spotify licensed embed or authorized YouTube/other), plus actual merchant item URL and attribution. Without a licensed embed, label the card as a **link**, not a player.
6. Run `node --test test/trend-card-engine.test.mjs test/trend-card-worker.test.mjs`; verify latest-head GitHub CI, independent Red source/rights review, 320/360/393px Android viewer, no console errors and static creator shelf always visible after the sponsor board.
7. Only then merge/deploy. Verify /health, D1, real card posting **after Orange's final approval**, source image and in-page playback, and safe revoke/removal. Log actual deployment receipts on issue #1315. Scheduled source ingestion and publishing are separate.

## Advertising policy and source refresh

Public Quick Cards are independent discovery results, not automatically sponsored. Sponsored and affiliate material needs the real agreement, disclosure, rights, eligibility and expiration date; use a distinct sponsored rank/ledger, not an organic label. Keep existing 21+ content inside the opt-in carousel, not the public shelf. Refresh verified source records rather than silently repeating stale offers. Do not scrape sites without authorization or override rate limits, access controls or robots rules.

## Current status

- Source-backed discovery pilot and static creator shelf: **staged in branch**.
- Test-suite proof: focused Node tests executed locally; CI and Android/production not yet verified.
- Isolated Cloudflare D1, staging Worker deployment and Cron configured and independently read back; eight *running* bots, public advertising approval, licensed artist player, merchant checkout and sponsor payouts: **not established**.
- Next verified action: inspect exact-head CI and review security/rights; then isolated D1 staging and scheduled RSS readback. Keep this issue open until source, CI, deployment, Android and user-posting acceptance are observed.

## November 7 addendum · Existing Quant AI IS connected — Orange makes decisions on demand

The existing Cloudflare `quant-ai` Worker already has `DB`, `QUANTA_DB`, and `IDENTITY_DB` bindings; QuantaPhi's production site Worker already binds `QUANT_AI` and `QUANTAI` to it. **No new model service, data migration, permanent AI call, or additional Quant mint is required.**

Read-only aggregate Cloudflare inspection on Nov 7 found:
- Quant AI D1 has 0 `quant_packets`, 0 `quant_tags`, and 0 `quant_events` at inspection (the source and permission schema exists, but these are not populated decision signals yet).
- The existing authoritative Quanta ledger has 37 committed searches, 471 card interactions, 97 collected items, 98 mint records, and 202 research revisions across accounts. These are aggregate counts, not a single person's data. Orange uses only the current authenticated user's allowed rows, not all other users' records.
- The new isolated staging Worker binds those **existing** D1 resources to read relevant evidence without exporting or copying any wallet/identity table into its public trend-card D1.

**On-demand request:** `POST /decision` on the private staging Worker accepts an explicit `consent:true`, bounded candidate cards, current card context and a valid existing `sq_` device token. It resolves the user through the existing IDENTITY_DB, checks an active wallet, and uses parameterized read-only SELECTs scoped by user_id/wallet_id for their committed searches, card interactions, and collects. Any future Quant-AI packet tags require `personalized_discovery` purpose and unexpired consent. It returns ranked card IDs/scores, generic explanations and signal counts; no raw searches, stable user IDs or wallet IDs. It cannot transfer assets or authorize public advertising. Authentication failures fail closed.

**Homepage handoff staged in PR #1781:** The existing For You view asks Orange for a ranking only when the visitor selects For You or taps Next. The `quanta-feed-orange.mjs` adapter uses the existing signed-in QuantaCloudConnection, with same-origin `/api/quant-orange/decision` forwarding privately through `TREND_CARD_ENGINE`. On server error or disconnected authentication, the existing signed-in Quant ranking code remains the fallback. Personal ranking state is in memory and cleared on feed tab changes. Public and Following are not silently personalized.

**Release dependency:** PR #1781 is still a draft; the staging decision endpoint and D1 bindings are deployed, but the homepage route is not live until that PR is independently tested, approved/merged/deployed and the production site Worker receives a reviewed `TREND_CARD_ENGINE` private service binding. No real signed-in user decision was invoked from this chat. Distinguish selection of an eligible card from **Orange's separate, rights-checked decision to publish sponsored material publicly**; `/orange/approve` still returns 503 until trusted moderation and rights receipts are implemented.

The presence of a Cloudflare database does not prove all data is populated or that a user is authenticated. Never claim every Quant packet is available when the Quant AI tag tables are empty.
