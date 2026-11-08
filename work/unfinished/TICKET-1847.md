---
issue: 1847
project: "Three publisher magazine reading Quick Cards"
state: implementing
dot: "🟡"
progress_percent: 55
progress_basis: "3 cards/8 verified publisher article links plus in-card reader/test source staged; exact-head CI and production unverified"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "Connected ChatGPT GitHub connector / test, source and review"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/magazine-reading-quick-cards-1847
last_observed_at_utc: "2026-11-08"
pr: "https://github.com/www-infinity4/QuantaPhi/pull/1848"
tests: "New TDD tests authored first; exact-head Github Actions checks pending"
merged: false
deployed: false
live_verified: false
blocker: "Full publisher text and photography require rights; automated High Times scraping/republishing disallowed; current stories are curated snapshot, not scheduled feed"
next_action: "Inspect exact-head CI for PR 1848 and repair any reader/browser regressions"
---
# TICKET-1847 · Easyriders / Motorcycle Magazine / High Times

- Owner request: 2026-11-07 late CT, three **real on-page reading Quick Cards** for Easyriders, Motorcycle Magazine and High Times.
- Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1847
- Branch and PR: `feat/magazine-reading-quick-cards-1847`, https://github.com/www-infinity4/QuantaPhi/pull/1848
- 3 separate cards in existing source + Oracle and public feed; preserves original on-card Follow/Star/Collect/Share/+1 Build toolbar.
- Verified publisher stories (8 total): Easyriders official blog (Oct 2 / Sep 17), motorcycle-magazine.com (Oct 28/30), High Times (Oct 9/24/30). Each story has canonical URL, byline, date, independent reading synopsis, accessible prev/next and publisher full-story link.
- No auto scraping or republishing; High Times copyright/automated-crawling restrictions confirmed at https://hightimes.com/terms-of-use/.
- Continuous freshness, publisher-licensed in-page full text, photos, external credentials, authentication and any regulated-product sales not claimed.
- Test source: `test/magazine-reading-quick-cards.test.mjs`, `test/source-quick-cards.test.mjs` and CI workflow registration.
- Source implemented but **no passed CI, independent review, merge, deployed Cloudflare page or physical Android receipt yet** at this checkpoint.
- Progress estimated 55% (feature data + UI + test drafted; remaining exact-head tests, review, merge approval and deployment/Android acceptance).
- No separate signed Bubbles executor lease asserted. No money/wallet changes.
- Next single executable action: confirm exact-head focused and Android-width CI for PR #1848 and repair any failures.
