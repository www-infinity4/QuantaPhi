---
issue: 1790
project: "Developer carousel — scalable source-backed building cards"
state: implementing
dot: "🟡"
progress_percent: 55
progress_basis: "Estimate: source-backed search, official references, in-card proposal preview, moderation-boundary tests and reviewed-data importer implemented on PR; exact-head CI, review, merge, approved 1,000+ data snapshot and Android live acceptance pending"
sessions_spent: 3
sessions_remaining_estimate: unknown
agent: "GPT · Red source review, Green implementation, Pink CI review, Black release verification pending"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/developer-library-1790
head_sha: null
last_observed_at_utc: "2026-11-07"
pr: "https://github.com/www-infinity4/QuantaPhi/pull/1814"
tests: "Prior source/run on PR #1814: 10/11 tests succeeded, older fixed-five slide test corrected; exact-head checks pending"
merged: false
deployed: false
live_verified: false
blocker: "Exact-head CI, independent code review, safe PR merge, approved catalog data PR, and live Android/Cloudflare verification"
next_action: "Inspect latest exact-head Developer source and Android CI; repair any failures and merge reviewed source-only PR if permitted"
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
