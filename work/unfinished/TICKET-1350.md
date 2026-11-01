---
issue: 1350
project: "News Phi original articles and AdSense readiness"
source_requests:
  - "2026-11-01 owner request: fix AdSense readiness, publish complete stories and continuously cycle fresh news"
state: implementing
dot: "🟡"
progress_percent: 55
progress_basis: "source implementation completed for 3 of 5 criteria; CI, approval, consent and deployment remain unverified"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT GitHub session"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-01T05:49:05Z"
repo: www-infinity4/QuantaPhi
branch: feat/newsroom-adsense-readiness-20261101
head_sha: edb7e7800e3553a5713d32ba8fc5c59d37e88b95
pr: 1353
tests:
  - "test/newsroom.test.mjs passed on GitHub Actions run 41278578788"
ci: []
merged: false
deployed: false
live_verified: false
blocker: "Google AdSense account review status and existing consent management not verified"
next_action: "Run PR CI for the isolated newsroom, review changes and then merge when gates pass."
---

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1350
Pull request: https://github.com/www-infinity4/QuantaPhi/pull/1353

## Scope
First-party crawlable editorial hub at /newsroom/, two dated full original explainers sourced to NASA and DOE, current headlines from the already-present News Phi Cloudflare desk, link in main QuantaPhi homepage, sitemap, focused tests and CI.

## Boundaries and evidence
- Existing main-page AdSense publisher script and Google Analytics untouched.
- Wallet, StarCoin accounting, Cloudflare accounts, Bubbles and sign-in code untouched.
- The 15-minute rotation refresh is browser-side only, not autonomous generation/publishing of full articles.
- Headline links show safe source-provided text; no third-party full article republishing.
- External source feed availability/CORS and post-merge live deployment remain to be checked.
- Google makes final approval decisions; no claim of approval or payable earnings.
