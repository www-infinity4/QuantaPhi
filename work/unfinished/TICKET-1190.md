---
issue: 1190
project: "Android homepage scroll and ANR verification"
source_requests:
  - "Owner's October 31 2026 four Android video recordings (not public)"
state: implementing
dot: "🟡"
progress_percent: unknown
progress_basis: "One source-level scrolling defect addressed; remaining ANR, media, artwork, overlays and device criteria unverified"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT scoped mobile section repair"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: null
repo: www-infinity4/QuantaPhi
branch: fix/android-card-section-settle-20261031
head_sha: null
pr: null
tests:
  - "test/android-scroll-sections.test.mjs — source regression authored, CI pending"
  - "test/android-scroll-sections.browser.spec.mjs — browser regression authored, execution pending"
ci: []
merged: false
deployed: false
live_verified: false
blocker: "Chrome/System UI ANR in owner's recording not traced to a specific long task; actual Android test required"
next_action: "Verify exact-head Node and mobile Chromium tests then request independent review before merge."
---

## Observed footage / scope
Four owner-provided Android screen recordings dated October 31 show a heavily scrolling rotating card deck, Chrome/System UI unresponsive dialogs near cards, some missing retailer art, unavailable LiveNOW playback and Media Star source/status warnings. Do not upload or publish the owner's videos without permission.

## Bounded patch
- Mobile touch homepage: proximity-only section snapping, never mandatory; snap to search, deck and shelf card starts, with reduced-motion fallback.
- User-initiated previous/next: after a successful card change, scroll back to the deck navigation at the beginning. Skip background rotations and no-op prev navigation.
- No changes to wallet, credentials, logins, provider playback, Cloudflare APIs, token balances or publication policy.
- Test source contract, actual 390×844 browser layout, reduced-motion and no horizontal overflow.
- Increment asset query versions to avoid old mobile browser CSS/JS cache.

## Remaining acceptance
- Confirm exact-head Node suite, mobile browser specs and CI, independent review.
- Measure Android device long tasks, memory, node/iframe counts and Chrome ANR over navigation; visual verify 320/360/393/430 px and keyboard/Bubbles overlays.
- Repair missing assets, source media error states and notices under existing #1190 / #1250 work, without calling external provider outages a local rendering bug.
- Merge only when gates pass and separately verify live quantaphi.org deployment.
