---
issue: 1446
project: "21+ lifestyle source carousel · external adult video reference"
state: review_pending
dot: "🟡"
progress_percent: 55
progress_basis: "Existing 21+ gate and source card reused; one source-only link, isolated chooser, and regression test authored. CI, review, merge, production and physical Android acceptance not yet verified."
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT GitHub connector · scoped owner source branch"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/21plus-video-source-1446-20261119
pr: 1985
merged: false
deployed: false
live_verified: false
blocker: "No owner/publisher permission or consent provenance established for copying/embedding video. Independent review, exact-head CI, merge, live and Android acceptance outstanding."
next_action: "Read exact-head 21+ publisher GitHub Actions status, repair any failing tests and request independent review; keep source-only external link unless media rights are separately validated."
---
# 21+ external video source · 2026-11-19

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1446

Owner-provided reference: `https://xgroovy.com/gifs/205466/filled-my-mouth-with-cum/`

Scope: Add **one submitted external URL only** into the existing visit-acknowledged `infinityAdultContentCard` 21+ source carousel. It is not an image/video import, endorsement, adult performer age attestation, publisher rights grant, paid creative, ad or browser verification.

- RED test-first source commit: `61db5d3266df40a3c629a27b0a041e7cfc867f59` and workflow hook `51a48cc2c1d14cad61d2792d6298073a587c44e9`. Executed RED failure was not observed before implementation.
- Source changes: `adult-lifestyle-catalog.mjs` gives a distinct `adult-video-links` mode containing just the supplied video source. `restricted-ad-card.mjs` uses the current visit-level 21+ gate, hides shopping plans for source-only links and creates no video player/thumbnail. `adult-kit-research.mjs` refuses source-only media as a shopping kit.
- Regression checks: `test/adult-video-source.test.mjs`, existing `test/adult-lifestyle-catalog.test.mjs`, `test/adult-kit-research.test.mjs`, and existing `.github/workflows/restricted-publisher-card.yml`.
- Rights and safety: no downloading, scraping, media mirroring, iframe, autoplay, provider account access, inferred interests, wallet or ads. External provider retains its own eligibility controls. Self-acknowledgment is not verified age.
- Stages: source committed to review branch; PR #1985 opened as draft; GitHub CI and independent reviewer still needed; no merge/deployment/Android receipt claimed.

Next action: check exact-head workflow result at PR #1985 and resolve failures before independent review.
