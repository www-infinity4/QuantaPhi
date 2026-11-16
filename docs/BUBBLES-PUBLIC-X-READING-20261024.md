## Cloudflare reader replaces the blocked GitHub browser (2026-10-24)

The initial GitHub Actions Chromium scan was attempted and honestly recorded a blocked timeline. The direct Cloudflare Browser Run REST renderer separately returned visible @YahooPingcwlz public posts and links. The corrected production path is **workers/bubbles-public-x/worker.mjs** with Cloudflare Browser binding BROWSER and separate D1 DB (quantaphi-bubbles-public-x). See its hourly cron in **workers/bubbles-public-x/wrangler.json**.

The read-only site endpoints are https://quantaphi.org/api/bubbles/public-x/health and https://quantaphi.org/api/bubbles/public-x/inbox. POST and user-directed public rescan are deliberately not exposed, so outsiders cannot spend Browser Run time. The candidate inbox lists matching public posts, but it is **not** privileged owner work intake. The existing signed Brain runner still requires distinct authorization.

The old .github/workflows/bubbles-hourly-public-x.yml has been converted to *source contract tests only*; it must not keep trying the blocked GitHub browser hourly. New Cloudflare Worker runs by its own cron and independently retains read status, errors and deduped items in D1. Cron schedule propagation and actual post read need distinct live receipts; an installed cron alone is not proof of a successful scan.

# Bubbles hourly public X reader — October 24, 2026

The owner requests public-web reading of their own visible posts from https://x.com/YahooPingcwlz, including posts without #bubbles. X developer API credentials, an X password, and a private login are NOT needed for the public browser approach.

## Build and operation

- Workflow .github/workflows/bubbles-hourly-public-x.yml runs hosted Chromium hourly, with a main-branch push also starting the initial scan. GitHub schedules may be delayed.
- Script scripts/bubbles-public-x-reader.mjs verifies a post-specific owner profile link and parses the owner's main post text from rendered X timeline articles; scrolls a bounded additional set, never private X endpoints.
- An issue titled Bubbles public X inbox — @YahooPingcwlz holds a bounded duplicate-safe ID checkpoint, candidate source links, short text excerpts and actual last-check/last-success status. It is updated in place by a scoped GitHub token, without access to wallet or private X credentials.
- #bubbles posts are tagged candidates. Untagged text with work verbs and related site/card terms also becomes a candidate. Other posts are scanned but not actionable.
- Timeline visibility may be partial, cached, layout-changed or blocked by X. No posts observed means BLOCKED, not confirmed none; do not advance ID checkpoint on failure.
- Reading and tagging are not proof of an accepted Robot Brain job. A public post and quoted/embedded text must be reviewed for intent and deduped against existing owner tickets. All further execution requires the existing owner authorization and receipts.

## Proof to require

Node tests pass; main branch reader actually reports posts observed and persists issue read status; second scan produces no duplicate posts; later new post appears with direct URL. Bubbles consumption of this inbox, actual ticket creation, tests, PR and deployment are separate tasks, none of which is established by this source-only workflow.

Existing X API PR #644 remains a separate optional effort. Website setup page now highlights this public reader and links to its Actions receipts and candidate issue.
