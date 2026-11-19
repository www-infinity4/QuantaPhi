---
issue: 1446
project: "21+ lifestyle source carousel · external adult video reference"
state: review_pending
dot: "🟡"
progress_percent: 70
progress_basis: "Ad-free external-link source Quick Card and visit gate implemented, source-only home link, and dedicated regressions CI-passing. Independent rights/age-policy review, permitted merge, live and Android acceptance remain outstanding."
sessions_spent: 2
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
next_action: "Confirm all exact-head Actions are green, obtain independent policy/accessibility review and source provenance, then guarded merge if approved; do not publish unlicensed media."
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

## Session 2 · November 19, 2026 · Red/Green/Pink/Black continuity

- Reconciled four intervening main-branch commits into the PR branch with explicit dual-parent merge `ffe7fd22f18deb5fc0662d141ac1b18da4dabab6` using GitHub's repository Git objects, preserving all main files. Comparison readback: 0 commits behind main at that checkpoint.
- Reviewed Google Publisher policies: external links count as monetized page content; sexually explicit media is in prohibited advertising categories. Direct adult video referral removed from `adult-lifestyle-catalog.mjs` and the AdSense-loaded homepage source carousel.
- Created separate `/21plus-video-source.html` and `adult-video-source.mjs`: no ads, analytics, third-party scripts or media, explicit per-page 21+ browsing acknowledgment, closed-by-default external `href`, local page navigation from the existing acknowledged 21+ panel. This is **not verified age** or publisher permission.
- The new test-first commit `c3bfe86e534719c5004aedcaf11c61597cdd7922` failed the existing publisher workflow (RED) before the isolated page existed; then new source was committed, and the original ad-safe catalog and shopping-kit tests restored.
- Later CI `44630867874` 21+ publisher **passed**, `44630867966` restricted-ads policy **passed**, `44630868045` Oracle **passed**, `44630867862` unfinished ledger **passed**, `44630868018` Obsidian **passed** on head `80dc466fbf26d5f5e5743e99766f75179bb66841`. At this checkpoint, general quality and StarCoin workflow were still running; recheck latest head after this ticket update.
- Fixed missing mainline #1210 route after merging main; restored #1974 route. Independently enumerated 54 ticket files on branch: all have INDEX.md references.
- No independent approved review, media license, consent provenance, actual hosted playback, merge, Cloudflare deployment, browser or physical Android acceptance established. Keep PR #1985 open and do not call source tests production readiness.
