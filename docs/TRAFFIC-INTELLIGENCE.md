# QuantaPhi Traffic Intelligence · implementation and source register
Issue: https://github.com/www-infinity4/QuantaPhi/issues/1110
Dashboard source: `/traffic-intelligence.html` (proposed; production URL only after merge/deploy/live readback)
Backend already deployed historically: `/api/site-traffic` (verify current release and freshness separately)
Detailed analytics backend: `/api/traffic-intelligence?range=7d` **NOT implemented or connected** by this PR.

## Current implementation

- A phone-first HTML dashboard and homepage menu/traffic-card entry link.
- Reads and strictly validates the existing `/api/site-traffic` schema-2 D1 aggregate; uses the dated same-origin static fallback only if the Worker request fails. Never presents a missing count as zero.
- Real-time GA4 users, verified-bot requests, suspicious traffic, unknown/unclassified traffic and human-likely requests are **different signals**, not an exhaustive set of disjoint visitors. A Cloudflare bot classification is not personal identification.
- Time selector offers 1h, 24h, 7d and 28d with previous equal-duration comparisons, **only** for matched, source-backed datasets.
- Lists known sitemap URLs and shows per-path metric fields only when a compatible server or locally imported aggregate supplies them. Sitemap coverage is not the complete active/dynamic route list. Never fabricates page views for uninstrumented pages.
- Reads `robots.txt`, `ads.txt` and `sitemap.xml` from this browser. HTTP success only establishes *this browser's* reachability, not Google's crawler receipt, verified bot identity or AdSense approval.
- Keeps owner source/repair notes in this browser's localStorage. Export writes a JSON evidence log locally; no secrets or raw visitor identifiers are uploaded by the dashboard.
- Optional local source-backed aggregate import is marked **not independently provider-verified**. The JSON cannot directly overwrite Cloudflare D1.

## Exact data sources and missing wiring

| Signal | Primary source / scoped query | Metric definition | Current wiring |
|---|---|---|---|
| Cloudflare cumulative | GraphQL `viewer.zones.httpRequests1dGroups` with zoneTag `b1b4ce8b8ab433ec879238fc4a83a493`, daily UTC `sum.requests/pageViews`, persisted in D1 `quantaphi-site-traffic-ledger.traffic_daily` | Since first recorded day, bots included, **not** unique humans; historical max-per-day policy can mask provider downward corrections | Existing endpoint; latest read must be verified; source snapshot 2026-11-05 says `refreshConfigured=false` |
| Edge path / bot categories | Cloudflare Analytics SQL `events.httpRequests`, exact UTC, `clientRequestHttpHost='quantaphi.org'`, path and `verifiedBotCategory`; include `sampleInterval` weight and sampled-row counts | Weighted estimated HTTP requests; bots classified only where evidence exists; unknown is not human | Read-only manual audit from issue #1110; **no dashboard API** |
| Suspicious / human-likely | Authoritative WAF action + available bot grouping/score with explicit thresholds, product eligibility, path, sampling, and exclusion rules | Classified **requests**, human-*likely* not verified people; no inference when botScore column is denied | **Not wired**; botScore SQL denied 403 in previous audit |
| Google Analytics 4 (period) | GA4 Data API `properties/{property}:runReport`, date range, `pagePath`, `screenPageViews` and relevant active user/session metrics; GA4 timezone documented then converted for reconciliation | Client-observed GA4 events/users from instrumented eligible pages; subject to consent, blockers and filters | **Not connected**; current repo inspected GA tag on homepage, other entrypoints require audit |
| Realtime | GA4 Data API `properties/{property}:runRealtimeReport` requesting `activeUsers` for last 30 minutes | Active users, **not** proven distinct real people, not Cloudflare requests | **Not connected** |
| AdSense crawler | Same-origin `/ads.txt`, `/robots.txt`, Cloudflare firewall/verified bot events and official Google account diagnostics | Distinguish owner-browser checks from real Mediapartners-Google/Googlebot observations | Browser file checks available; **actual crawler verification not wired** |
| Page inventory | `/sitemap.xml` plus deployed route inventory, dynamic Quick Card paths and first-party page telemetry | Sitemap is an incomplete index unless exhaustiveness is independently verified | Sitemap check available; full inventory **not verified** |

Prior findings from #1110 (2026-10-26): Analytics SQL `clientRefererHost` and `botScore` denied HTTP 403, while `verifiedBotCategory` was queryable. Do not interpret denied fields as zeros or assert reconnecting fixes column-level permissions. SQL requests can include other hostnames in a zoneTag; **filter the HTTP hostname**. Do not sum sampled row counts and weighted estimates as if they are equivalent.

## Detailed API contract · future secure server adapter

`GET /api/traffic-intelligence?range=1h|24h|7d|28d` shall return JSON `schemaVersion:1`, `site:"quantaphi.org"`, `range`, explicit absolute UTC `period:{start,endExclusive}`, `previousPeriod:{start,endExclusive}` with equal duration, `sources` and `signals` and `pages`. See `test/traffic-intelligence.test.mjs` and `traffic-intelligence-core.mjs` for the precise validation model.

- `sources[]`: unique `id`, `provider` (Cloudflare / GA4 / First-party), exact `dataset`, safe query description `query`, source timestamp `fetchedAt`, `precision` (observed / sampled_estimate / modeled_estimate), and `status`.
- Each non-null signal or page metric: `{value,unit,basis,sourceId,asOf}`. `sourceId` must identify one source, `basis` must match that source's precision, and counts must be safe nonnegative integers.
- `signals` keys: `realtimeActiveUsers`, `verifiedBots`, `suspicious`, `unknown`, `humanLikely`.
- `pages[]`: same-origin `path` with `current` and `previous` metrics. Values are **null/absent** until available, never placeholders. Cross-source aggregates require verified matching path/window/coverage and explicit completeness; absent that, do not print site-wide selected-period totals.
- A legitimate zero is permitted only when it comes from the identified provider in that window. Never convert missing, inaccessible or 403 data into zero.
- Server adapter must remove user identifiers, raw IPs, referer query strings, cookies, long-lived IDs and secrets. Scope by hostname and date; include source retention, sampling interval and fetch status. Keep Cloudflare token and GA4 auth server side. Protect API from write/injection and excessive read costs; do not call provider APIs on every public page view.

## Outstanding acceptance gates

1. Verify 320/360/393/720px Android layout, keyboard scroll, basic accessibility, refresh and source labels in an actual browser.
2. Exact-head Node test & repo CI; independent review of source and compatibility with main Worker routes.
3. Deploy reviewed site assets without replacing other QuantaPhi Workers, D1 bindings, wallet or OAuth paths; verify `https://quantaphi.org/traffic-intelligence.html` and homepage entry.
4. Restore authorized `SITE_TRAFFIC_CLOUDFLARE_TOKEN` on isolated site-traffic Worker if owner permits; verify fresh source read/write and `refreshStatus` receipts separately. Do not expose token.
5. Implement authenticated server aggregation of actual path/bot/WAF data with documented sampling and permitted columns. Verify exclusive classification logic and unknown bucket; only then populate per-page signals.
6. Audit live GA4 tag coverage and consent on every independent entrypoint, obtain read-only GA4 Data API property access, and reconcile same periods/timezones/hostname. Avoid double-counting SPA route changes.
7. Check verified Googlebot/Mediapartners-Google Cloudflare events and Search Console / AdSense diagnostics; a local HTTP 200 is insufficient.

## Reference docs

- GA4 realtime: https://developers.google.com/analytics/devguides/reporting/data/v1/realtime-basics
- Cloudflare bot grouping/score (feature/plan access matters): https://developers.cloudflare.com/bots/concepts/bot-score/
- Cloudflare crawler troubleshooting: https://developers.cloudflare.com/support/troubleshooting/general-troubleshooting/troubleshooting-crawl-errors/
- AdSense ads.txt crawl: https://support.google.com/adsense/answer/7679060

Status: **source implementation only** until PR, tests, review, deployment, and live readback establish more.
