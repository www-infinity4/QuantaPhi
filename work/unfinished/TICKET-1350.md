---
issue: 1350
project: "News Phi original articles and AdSense readiness"
source_requests:
  - "2026-11-01 owner request: fix AdSense readiness, publish complete stories and continuously cycle fresh news"
  - "2026-11-02 owner report: static NASA story never replaced by another complete current article"
state: review_pending
dot: "🟡"
progress_percent: 85
progress_basis: "Two Nov 2 original articles, freshness-filtered live reader and archive implemented; backend deployment and Google review remain"
sessions_spent: 3
sessions_remaining_estimate: unknown
agent: "ChatGPT GitHub session"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-01T05:49:05Z"
repo: www-infinity4/QuantaPhi
branch: feat/newsroom-nov3-original-draft-cycle
head_sha: fcfdc562c2b92f0cb45b6787eb7fe6e1f9ceda41
pr: 1620
tests:
  - "test/newsroom.test.mjs passed on GitHub Actions run 41278578788"
ci: []
merged: false
deployed: false
live_verified: false
blocker: "Google AdSense account review status and existing consent management not verified"
next_action: "Verify Nov 3 PR #1620 focused CI, release static article and current full-story fallback, run public browser readback, then test scheduled editorial draft workflow; AdSense remains separate."
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

## November 3 continuation checkpoint
- Actual browser test observed empty #featured-articles and nonfunctional full AI reader for BBC sources; live Cloudflare /v1/news/read had no cached complete report rows. Old November 1 and November 2 items correctly moved to archive by age.
- PR #1620 adds a NEW source-backed November 3 original NASA Earth Observatory Pacific cyclone report (10 original paragraphs, credited satellite imagery), updates latest.json and sitemap, and implements a first-party full-reader fallback that reads current published QuantaPhi articles through DOMParser as inert text instead of claiming unsupported outside AI reports.
- Adds a review-gated automated intake workflow: daily source scan from existing News Phi D1 Cloudflare feed, strict NASA source/date and long-report validations, prepares draft JSON for editorial fact checking in a draft PR. It does not automatically approve or publish unverified model text. A current public article still requires a verified source and release.
- Worker feed/cron continue refreshing independently every fifteen minutes; this is *not* the same as automatically publishing new original static HTML each day.
- Source verified: https://science.nasa.gov/earth/earth-observatory/the-pacifics-busy-storm-season/ . Browser acceptance/test against the actual November 3 public page is required after merge. AdSense approval not inferred.
- Independent Copilot review for PR #1620 was unavailable because reviewer quota was exhausted; focused CI and direct source checks can be documented, but this is NOT an independent review receipt.
- Remaining: exact-head checks and live readback, test scheduled workflow permissions/actual draft PR, improve failed third-party long-form reads, verified Google AdSense policy review.
