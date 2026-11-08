---
issue: 1790
project: "Developer carousel — scalable source-backed building cards"
state: implementing
dot: "🟡"
progress_percent: 55
progress_basis: "Estimate: source-backed search, official references, in-card proposal preview, moderation-boundary tests and reviewed-data importer implemented on PR; exact-head CI, review, merge, approved 1,000+ data snapshot and Android live acceptance pending"
sessions_spent: 5
sessions_remaining_estimate: unknown
agent: "GPT · Red source review, Green implementation, Pink CI review, Black release verification pending"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/media-star-creator-ledger-choices-20261107
head_sha: 9fe29a641dbaa36f853b5704cb9ce06c5bad0a2e (source head before this checkpoint; exact-head CI must be read again)
last_observed_at_utc: "2026-11-07"
pr: "https://github.com/www-infinity4/QuantaPhi/pull/1822 (current draft); #1814 (earlier merged)"
tests: "Creator prior source passed 15/15 focused tests; latest public-card & creator awards run pending exact-head confirmation. TV-Database source 2/2 CI passed at 2e11158e. Artist-radio CI unrelated failure on prior QuantaPhi head; no production acceptance."
merged: false
deployed: false
live_verified: false
blocker: "Current #1822 remains draft; D1 PR #130 source-only; issuer view funding/identity, curator wallet entitlement service, moderation and Android/live deployment unverified"
next_action: "Independently review full latest-head #1822 CI and #130 security/rights before any merge; add signed creator settlement and user-confirmed curator checkout in a separately reviewed phase."
---
## November 7 — thousands-scale Developer Library expansion (PR #1814)

- Owner expanded original #1790 scope: discover thousands of genuine GitHub/web development options for profiles, buttons, carousels, Power Chains, Quick Cards, design and site integration. Visitors may work on local safe previews and ask Bubbles for help, but cannot post arbitrary code or unsafe images onto the public site.
- 24 topical GitHub Search API categories, 40 results per page up to provider's 1,000-result per-query limit; only actual fetched/approved metadata becomes an interactive source card.
- Nine selected official Google/web.dev/Firebase/Android/Maps documentation entries and original idea-workshop in the same picture-first carousel; original five builders and draft state preserved.
- In-card proposal editor: compare existing partial profile (#1506) and other implemented features, safe local design preview, copy a Bubbles brief, and explicitly prepare a **review-only** GitHub issue. No visitor GitHub code writes, source execution, cross-user data, secrets, wallet actions or automatic website publishing.
- New scheduled importer searches GitHub with native Actions token and prepares a **separate data PR** for at least 1,000 real candidate source records when successful. No candidate auto-merge or third-party execution. No snapshot generated/approved yet.
- Focused source/browser tests added. Prior branch CI found a stale fixed-five-card test which was repaired. Exact-head CI and owner visual acceptance are pending.
- Production remains the previously merged picture-first carousel until separately verified deployment. Current expansion is **not yet live**.

# Developer carousel — issue #1790

- **Canonical issue:** https://github.com/www-infinity4/QuantaPhi/issues/1790
- **Owner request:** November 7, 2026: group QuantaPhi-buildable Media Star, Quick Card, 501, Infinity Brands and similar builder cards in one Developer carousel, close to the advertising area; keep ordinary content in its other carousels.
- **Repository:** `www-infinity4/QuantaPhi`
- **Branch:** `feat/developer-carousel-1790`
- **Agent:** GPT / Green implementation, Pink test stage pending independent CI
- **State:** implementing; source changes staged, unmerged
- **Dot:** 🟡 (source staged, release and Android acceptance pending)
- **Progress:** not numerically established. Five original builder entries, navigation, styling and focused tests staged; independent CI, PR review, merge, deploy, mobile browser verification pending.
- **Sessions spent:** 1 documented session
- **Sessions remaining estimate:** unknown
- **Lease ID / expiry / task session / fence:** null (no executor lease asserted)
- **Source SHA:** main head at branch creation not independently recorded; current branch commits and eventual PR head provide precise refs
- **Last observed:** 2026-11-07 (UTC)
- **Tests:** local TDD RED observed before core existed; focused test committed `tests/developer-carousel.test.mjs`; real branch execution/CI pending.
- **CI / PR:** focused `developer-carousel-checks.yml` staged; PR pending at checkpoint creation
- **Merged:** false
- **Deployed:** false
- **Live verified:** false
- **Blockers:** actual Android 320/360/393px acceptance and real Quick Card publisher iframe behavior must be verified after reviewed deployment.
- **Next executable action:** Open PR and check its exact-head developer-carousel test workflow; fix any failures on the same branch.

## Acceptance checklist

- [x] Inventory existing official Media Star, Quick Card publisher, 501, Infinity Brands, Code Phi builders
- [x] Stage dedicated Developer carousel near sponsor/advertising area, preserving original widget DOM state
- [x] Stage navigation, direct choices, horizontal swipe and 44px touch targets
- [x] Stage removal of originals from general Oracle rotation
- [x] Stage source tests and focused CI workflow
- [ ] Confirm exact-head CI and independent source review
- [ ] Merge after review, then deployment and live Android verification
- [ ] Verify actual moderation/publishing in an authorized non-production or controlled environment

No checkout, wallet mutation, public auto-publish, provider login or new payout privilege was added.

## November 7 — creator card pricing + two separate ledgers (PR #1822; backend PR #130)

Owner direction: Every independently verified Media Star viewing creates a **new issuer-funded Infinity 1 StarCoin award proposal** for the rightful verified creator; the viewer's wallet is never debited for that reward. A *different* optional curated paid episode charges the viewer **1 StarCoin once per new unlocked episode** for transfer to the verified card curator. Free-first configuration is creator-selectable; never treat free playback as a buyer charge or send a curator charge to the wrong recipient.

Source receipt: QuantaPhi draft [#1822](https://github.com/www-infinity4/QuantaPhi/pull/1822) implements actual creator pricing/free-first UI, multi-episode list, production registration draft, safe public HTML omission of locked URLs and Android-readable styling. CI at head `7179beefbda7a304e54c26ab3f508d1b3229a39d`: 5 workflows successful; the Media Star source suite 15 tests passed, zero failed. TV-Database [#130](https://github.com/www-infinity4/TV-Database/pull/130) stages D1 0005 separate issuer awards and curator unlocks with no account balance mutations; original CI head `72cd639938baa6ee8191338848699c244558b63e` passed TypeScript, SQLite and seven contracts. Later commits must be checked individually.

No new funded coins, actual paid entitlements, third-party verified wallet connections, new public published cards, live website, Android playback, Cloudflare deployment or monetary transactions have been verified or claimed. The production registry historically limits observed receipts to one per viewer/content/Central day, based on self-reported 30-second playback; a future independently verified actual-play session proof and abuse rules are required before paying for *every* genuine play. Fred's external X replay remains outside first-party completion telemetry. The new two-ledger schema keeps pending awards and curator payments independently auditable.

Next action: independent financial/security/rights review and exact-head CI; verify authorized creator identity and payout terms, apply approved migration, implement and sandbox-test auditable issuer funding + customer-to-curator transfer, then moderated public Media Star feed and actual Android readback. Do not silently mint or backfill uncertain plays.

## November 7 continuation — approved Public Oracle cards, native playback evidence, private award inquiry

- **QuantaPhi draft PR #1822** now adds `media-star-public-feed-core.mjs` (validates signed source URLs and never displays paid links), `media-star-public-cards.mjs/css` (uses verified `/apps/icons/media-star-512.png` artwork, original `#infinityAcceptedCards` DOM bank and the existing `quantaphi:source-cards-ready` Oracle registration; no fake cards if empty), and source tests. First-party HTML5 free audio/video measures 30 foreground seconds without credited seeks before sending a **self-reported pending** production observation to the authenticated StarQuest bridge, never minting. Official supported YouTube playback is embedded on explicit click, but not falsely treated as observed completed audio. Original X URLs open at provider if unsupported; no iframe bypass.
- Creator studio has a **My Infinity view awards** action; it calls existing authenticated `productionClaims()` and shows creator-scoped pending proposal receipts separately from spendable (zero until independently settled) or customer curator fees. Never claims a completed settlement.
- **TV-Database draft PR #130** now has publicly accessible but **moderation-approved-only** `GET /v1/production/media-star-cards`, masking paid URLs at SQL projection. A reviewed card's episodes and any purchased episode IDs cannot be silently overwritten on editing. Signed client `recordProductionPlay` now transports registered `contentId`. Authenticated `/v1/production/mine` adds read-only issuer-award receipt status scoped to original card publisher or independently verified credited claimant. No debits, minting, or payout mutation.
- Evidence: TV-Database head `2e11158e5d2b8148d4718fb8d18e1c7d2aba3d80` had 2/2 CI success, including D1 SQLite schema/actual query masking, Worker TypeScript compilation and source contracts. QuantaPhi frontend focused CI had passing Media Star suite at prior head `0d1688e41e490ec14e448da918fc23eb68c70236` after correcting a test-selector typo; latest head CI is pending. The separate artist-radio workflow is failing on that branch and needs independent triage; do not count all QuantaPhi workflows green.
- No new creator card was actually approved, no D1 0005 migration was deployed, no wallet recipient was verified, and no StarCoin was issued, transferred or made claimable. The current production ledger reports only **client-reported one-per-content/account/Central-day** receipts, so it DOES NOT yet satisfy one award for each genuine replay/session. Provider playback validation, fraud controls, repeat-play idempotency, funded issuer policy and creator rights verification remain blockers. Do not call source work production.
- Next safe action: verify latest CI and independent PR review, then separately design an accountable, verified per-play session receipt, approved backend issuance and creator/curator transfers. Preserve historical source receipts, no blind backfill.
