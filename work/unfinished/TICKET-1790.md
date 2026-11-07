---
issue: 1790
project: "Developer carousel + one-field website Quick Card creator"
state: implementing
dot: "🟡"
progress_percent: unknown
progress_basis: "Original carousel PRs #1791 and #1805 merged; single-URL follow-up source and tests on an isolated branch; CI, deployment and acceptance pending"
sessions_spent: 3
sessions_remaining_estimate: unknown
agent: "GPT Green source implementation / Pink automated test review"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: fix/one-link-quick-card-builder-1790-20261107
head_sha: pending-final-branch-head
last_observed_at_utc: "2026-11-07"
pr: pending-review
tests: "One-link TDD 4/4 local helper assertions; exact-head CI and Android tests pending"
merged: false
deployed: false
live_verified: false
blocker: "Exact-head CI and browser tests plus independently verified AI source enrichment are outstanding"
next_action: "Open follow-up PR; review exact-head Quick Card publisher and Developer carousel CI and browser results"
---
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

## November 7 follow-up: one-URL Quick Card creator
- Existing original Developer carousel was merged through PRs #1791 and #1805. Its live Android/edge behavior remains separately gated.
- Owner wants a visitor to enter `www.bubbleyum.com` and create a card without completing multiple required descriptions. Reuse original moderated `/api/quick-cards` publisher, not a pretend form or unauthorized provider sign-in.
- Branch `fix/one-link-quick-card-builder-1790-20261107` stages one visible website textbox, optional advanced editor, input normalization, source-only publisher defaults and explicitly honest failure states.
- Initial new helper tests were observed red with missing module and green after implementation (4/4 local). GitHub workflow updates request Android Chromium tests and original Developer regression.
- No AI remote page crawler, media-rights reviewer, live product inventory, or verified brand/content inference was added. Those are independent requirements; the default card is an honest source-link card pending richer enrichment and moderation.
- **Release status:** source committed to branch; CI, review, merge, site deployment, publisher D1 readback and live Android are **not verified**.
- **Next action:** open PR on existing #1790, check exact-head CI and independent review, then only eligible merge/deploy with separate readback.