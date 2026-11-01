---
issue: 1190
project: "Android homepage scroll and ANR verification"
source_requests:
  - "Owner's October 31 2026 four Android video recordings (not public)"
state: review_pending
dot: "🟡"
progress_percent: unknown
progress_basis: "One source-level scrolling defect addressed; remaining ANR, media, artwork, overlays and device criteria unverified"
sessions_spent: 2
sessions_remaining_estimate: unknown
agent: "ChatGPT scoped mobile section repair"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: 2026-11-01T00:29:52Z
repo: www-infinity4/QuantaPhi
branch: fix/android-card-section-settle-20261031
head_sha: 3ef57c9c423b8c69736877fdf17f762ce02f79b4
pr: 1300
tests:
  - "test/android-scroll-sections.test.mjs — passed in exact-head interactive-card CI run 41256872271"
  - "test/android-scroll-sections.browser.spec.mjs — 3/3 browser cases passed in 69/69 Playwright suite, run 41256872271"
ci:
  - "Source head 3ef57c9c423b8c69736877fdf17f762ce02f79b4: GitHub checks 38/38 success; interactive-card run 41256872271 69/69 browser tests"
merged: false
deployed: false
live_verified: false
blocker: "Chrome/System UI ANR in owner's recording not traced to a specific long task; actual Android test required"
next_action: "Obtain independent fresh-head review of corrected Copilot findings, then verify final exact-head required checks before expected-head merge."
---

## Canonical GitHub issue
https://github.com/www-infinity4/QuantaPhi/issues/1190

## Observed footage / scope
Four owner-provided Android screen recordings dated October 31 show a heavily scrolling rotating card deck, Chrome/System UI unresponsive dialogs near cards, some missing retailer art, unavailable LiveNOW playback and Media Star source/status warnings. Do not upload or publish the owner's videos without permission.

## Bounded patch
- Mobile touch homepage: proximity-only section snapping, never mandatory; snap to search, deck and shelf card starts, with reduced-motion fallback.
- User-initiated previous/next: after a successful card change, scroll back to the deck navigation at the beginning. Skip background rotations and no-op prev navigation.
- No changes to wallet, credentials, logins, provider playback, Cloudflare APIs, token balances or publication policy.
- Test source contract, actual 390×844 browser layout, reduced-motion and no horizontal overflow.
- Increment asset query versions to avoid old mobile browser CSS/JS cache.

## Remaining acceptance
- Node and 390px browser source tests passed at source head 3ef57c9; 38/38 GitHub checks success. Independent fresh-head review remains outstanding.
- Measure Android device long tasks, memory, node/iframe counts and Chrome ANR over navigation; visual verify 320/360/393/430 px and keyboard/Bubbles overlays.
- Repair missing assets, source media error states and notices under existing #1190 / #1250 work, without calling external provider outages a local rendering bug.
- Merge only when gates pass and separately verify live quantaphi.org deployment.

## Session 2 · November 1, 2026 UTC
- Reviewed Copilot automated COMMENT findings on PR #1300, all four threads; three substantive defects repaired on original branch, one workflow claim disproven by actual prior CI logs.
- Reproduced failing Chromium regression: run 41255525565 66/67 browser tests, computed CSS `scrollSnapType` returned `y` (proximity default) rather than literal `y proximity`.
- Scoped fix: actual non-card shelf roots, pointer:coarse JS guard, arrow navigation row reanchor, browser cases for tall Following feed and fine-pointer desktop, corrected CSSOM expectation.
- Source head `3ef57c9c423b8c69736877fdf17f762ce02f79b4` all 38/38 check runs passed; interactive-card run 41256872271 69/69 browser cases, 3 new scroll cases. Reviewer is Copilot (COMMENT on earlier head), no fresh-head approval or independent re-review. Four thread replies recorded; no self-approval.
- This checkpoint update is a subsequent documentation-only commit; verify its new head separately. No Android ANR root-cause acceptance, production deployment or wallet change. Progress unknown; no coordinator lease claimed.
