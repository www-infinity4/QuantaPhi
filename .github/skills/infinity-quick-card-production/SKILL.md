---
name: infinity-quick-card-production
description: Build, repair, test, review, and release QuantaPhi Infinity Quick Cards using native in-card source experiences, verified public data, authorized provider accounts, wallet-safe controls, and mobile acceptance. Use for screenshot-to-card catalog work, X/Twitter developer-stage patterns, Bubbles card requests, or deployment of card changes.
---

# Infinity Quick Card production

Use this skill in `www-infinity4/QuantaPhi` for each new or repaired Quick Card. Read repository `AGENTS.md`, the existing quick-card modules, owner issue context, and the exact PR head before making changes. Reuse production components rather than starting a disconnected demo.

## Desired experience

- One registered card per independently identifiable app, service, or destination. Preserve the original publisher, name, category, approved HTTPS destination, and unique deep link.
- Render the website's useful content **inside** the Infinity card as structured native UI, not a screenshot or an iframe masquerading as an authenticated copy. If embedding is expressly allowed, user initiated, and useful, label it truthfully and provide an original-site fallback.
- Prefer the Oracle Octaves design system: clear white/light surface, recognizable brand treatment, professional source-licensed imagery, readable copy, rounded controls, keyboard access, and 320/360/393/430px Android layouts. Do not invent product photos or offer stale content as live.
- Keep shared Follow, Star, Collect, Share, and +1 Build actions. Use their existing wiring; never credit a wallet balance or purchase solely for a local click. Do not add duplicate generic search bars when a source-specific search exists.
- Keep accurate display labels for each capability: source catalog only, public read available, verified provider account, authorized action, or blocked. The card registration alone does not prove provider integration.

## Source and identity contracts

1. Inspect the existing `plugin-quick-card-catalog.mjs`, `tinyfish-card-catalog.mjs`, `tinyfish-card-reader.mjs`, `workers/continuity-session-coordinator/card-website.mjs`, `quanta-card-actions.mjs`, and current route components.
2. Trust only explicit registry IDs and HTTPS destinations. No arbitrary URL from a request can dispatch a paid or privileged browser run. Public reads must use the source-validated broker with the original URL and time/receipt; filter links to the verified publisher domain. Show actual errors and never synthesize a receipt.
3. Private feeds, drafts, messages, publishing, bookings, purchases, analytics, and account writes require the correct supported OAuth/API or an explicitly authorized provider session; no borrowed ChatGPT cookies, passwords, inferred scopes, or fake `Signed in` indicators.
4. For website-specific actions, present provider-relevant fields and verified data. If the provider prohibits reuse or lacks an approved API, use the native card for public information and a clearly labeled official handoff, not a fabricated in-card operation.
5. Protect Quants, Infinity tokens, Star Coins, Music Quants, receipts, and user drafts. Never mutate them from read-only flows. Retain idempotency receipts and explicit confirmation for purchases or destructive operations.

## Build workflow

1. Reconcile current request, screenshots, preexisting cards, `AGENTS.md`, and relevant GitHub issues; avoid duplicating a card or conflicting with other active PRs.
2. Choose a bounded slice: card metadata and classification, native interactions, approved public feed, account adapter, or visual enhancement. Implement that slice and its tests in one topic branch/PR. Never mark unfinished integrations as complete.
3. Add Node tests for catalog uniqueness, valid source IDs, source URLs, and search-to-card resolution. Add browser tests for 320/360/393/430px, focus, carousel/keyboard, original links, verified-source receipts, denied/unavailable providers, and user-owned draft behavior. Exercise any server changes with fixture-backed unit tests.
4. Run GitHub Actions for the **exact head commit**. Validate remaining checks, independent review/security acceptance, provider permission, and backend release parity before considering a merge.
5. Under the owner's standing automatic publishing authorization: merge and deploy **only** when required checks and independent reviews are successful and no security hold remains. Never bypass APK hold #525 or override branch protections. If review or required deployment is missing, keep the PR non-draft, attach clear evidence and a specific next step; avoid unnecessary new drafts.
6. Confirm the deployed `quantaphi.org` route, mobile UX, Cloudflare Worker release, source-content receipt, and error fallback. Separate source committed, CI passed, merged, deployed, live verified, and blocked in the status report. Do not assume a GitHub merge proves Cloudflare deployment.

## Current catalog handoff (2026-10-31)

PR #1285 registers the screenshot-based 56-card catalog at `/plugin-quick-cards.html`. Its source-reader client calls `/v1/cards/website`, whose server registry is bundled into the `continuity-session-coordinator` Worker. The Worker must deploy compatible card IDs before production reads can work. Confirm the PR's current head and review state afresh; do not treat the pinned date, prior CI, or this skill as deployment evidence.
