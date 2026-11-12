---
issue: 1790
project: "Developer carousel — scalable source-backed building cards"
state: implementing
dot: "🟡"
progress_percent: 55
progress_basis: "Estimate: source-backed search, official references, in-card proposal preview, moderation-boundary tests and reviewed-data importer implemented on PR; exact-head CI, review, merge, approved 1,000+ data snapshot and Android live acceptance pending"
sessions_spent: 6
sessions_remaining_estimate: unknown
agent: "GPT · Red source review, Green implementation, Pink CI review, Black release verification pending"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/media-star-creator-ledger-choices-20261107
head_sha: 0a9cde5694cd7a8eccf1f2086c24007207768c6c (source head before this checkpoint; exact-head CI pending)
last_observed_at_utc: "2026-11-07"
pr: "https://github.com/www-infinity4/QuantaPhi/pull/1822 (current draft); #1814 (earlier merged)"
tests: "Media Star focused workflow passed on prior QuantaPhi head 837b63a5; latest creator-claim, session, and paid-entitlement CI pending. TV-Database latest a9986e7a production-credit workflow queued and YouTube workflow passed. Other artist-radio failure remains separate. No live browser or wallet acceptance."
merged: false
deployed: false
live_verified: false
blocker: "Current #1822 remains draft; D1 PR #130 source-only; issuer view funding/identity, curator wallet entitlement service, moderation and Android/live deployment unverified"
next_action: "Read latest exact-head #1822 and #130 CI, address errors, then independently review signer/rights verification and issuer funding/atomic curator checkout before any merge or live deployment."
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

## November 7 session 6 — claimant evidence, each listening-session proposal, and existing paid entitlement

Owner instruction remains the canonical separate payout model. No spendable coins issued.

- **Backend** TV-Database draft PR #130 latest tested changes through `a9986e7a4f9b95facf6ed61828d51cdaf581ed5c`: D1 creator rights claims (`media_star_creator_claims`) bound to authenticated wallet; distinct eligible native-play `media_star_session_evidence` and one `media_star_infinity_session_awards` proposal per server-issued session (instead of older one/content/account/day reports). Server checks approved content, free or viewer-owned paid entitlement, elapsed playback period, bound claimant and per-hour rate limit. Candidate proposal is still client-reported and **unfunded_unclaimed**; no viewer debit, no mint, no automated verified proof. Added signed read-only `media-star-episode-access`: paid source only with same viewer's recorded `settled` and non-null transfer receipt. **NO purchase endpoint, issuance endpoint or recipient override**. D1 migration schema and synthetic fixture assert no double proposed credit, duplicate paid episode receipt rejection, claimant isolation and zero account balance changes.
- **Frontend** QuantaPhi draft PR #1822 latest through docs head `0a9cde5694cd7a8eccf1f2086c24007207768c6c`: Media Star creator studio asks for explicit creator rights confirmation/evidence; signed StarQuest bridge saves a pending claim, never an inferred creator payment. Original Public Oracle Media Star native audio/video player starts and completes per-listen session when foreground media progress is observed; official YouTube embeds do **not** pretend to expose reliable listening proof. Locked cards now offer **Check my episode access** read-only, with no purchase or charge. Creator ledger shows per-session proposals, older daily receipts, pending identity claims and zero spendable until independently approved.
- **CI readback at checkpoint**: Previous QuantaPhi Media Star production-credit workflow succeeded on head `837b63a5`, while an unrelated artist-radio workflow failed; all-job green not claimed. Backend `a9986e7a` run had YouTube job success, production credit check queued. Later exact-head source/docs commits must be checked. No migration or Worker/site deployment, approved public creator card, authorized X/YouTube listen telemetry, Android acceptance, funded mint/transfer, real curator payment receipt, or verified rights claimant.
- **Next safe action**: Review the newest exact-head two-repo CI and security acceptance, then build independent reviewer-authorized claimant verification, controlled issuer-funded settlement, and customer-confirmed **atomic** one-coin curator transfer with receipt/entitlement. Merge/deploy only after approved independent review, D1 migration plan, live browser/mobile verification and payment audit.
