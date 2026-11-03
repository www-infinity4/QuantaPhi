---
issue: 1350
project: "News Phi original articles and AdSense readiness"
source_requests:
  - "2026-11-01 owner request: fix AdSense readiness, publish complete stories and continuously cycle fresh news"
  - "2026-11-02 owner report: static NASA story never replaced by another complete current article"
state: review_pending
dot: "🟡"
progress_percent: 80
progress_basis: "Two Nov 2 original articles, freshness-filtered live reader and archive implemented; backend deployment and Google review remain"
sessions_spent: 2
sessions_remaining_estimate: unknown
agent: "ChatGPT GitHub session"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-01T05:49:05Z"
repo: www-infinity4/QuantaPhi
branch: feat/news-phi-fresh-articles-20261102
head_sha: fcfdc562c2b92f0cb45b6787eb7fe6e1f9ceda41
pr: 1499
tests:
  - "test/newsroom.test.mjs passed on GitHub Actions run 41278578788"
ci: []
merged: false
deployed: false
live_verified: false
blocker: "Google AdSense account review status and existing consent management not verified"
next_action: "Review QuantaPhi PR 1499 and News-Phi PR 14, deploy existing Cloudflare source Worker and test a real recent full report."
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

## November 2 continuation checkpoint
- Source: https://github.com/www-infinity4/QuantaPhi/pull/1499. Original Nov 2 full reports (NASA dwarf-galaxy oxygen; DOE fusion INFUSE selections) added, with primary-source links, dates and archive. Newest-first original articles; previously pinned NASA Nov 1 story no longer shown as current. Browser headline freshness now 24h.
- Dependency: https://github.com/www-infinity4/News-Phi/pull/14. Extend source-backed /v1/news/read to 6+ paragraphs, reject thin/unverified AI responses, cache reports by source publication date in existing D1. Existing Cloudflare AI may have usage charges and quotas; no new external API introduced.
- Rotation is client-side. Automatic ongoing publication of new first-party static HTML articles is NOT established; new publisher-based long reader depends on Worker deployment. If unavailable, it fails closed and links original publisher.
- PR reviews, exact-head CI, production Worker deployment, real browser report and Google AdSense status still pending. Never claim AdSense approval or payout.
