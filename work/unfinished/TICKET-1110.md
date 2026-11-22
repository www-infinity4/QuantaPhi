---
issue: 1110
project: "Traffic and Bubbles identity recovery from shared D1 exhaustion"
state: source_tested
dot: "🟠"
progress_percent: 40
progress_basis: "Provider failure reproduced; traffic caching, identity-only verification and chat membership index source-tested; exact-head CI, deployment and live acceptance remain"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: fix/traffic-read-budget-1110-20261122
last_observed_utc: "2026-11-22"
tests: "Traffic regressions initially failed; 36 traffic checks pass. Identity regressions initially failed; 170 auth/Brain checks pass. SQLite membership query failed the bounded work budget before its index and passes afterward. Full combined checks pending."
merged: false
deployed: false
live_verified: false
blocker: "Cloudflare daily read allowance and account storage limit; exact-head CI, release and actual owner acceptance pending"
next_action: "Review exact-head source, finish CI and deploy preserving all bindings; reclaim only verified expired cache data if permitted, then observe source refresh and existing owner session"
---

# Canonical incident

Continues [#1110](https://github.com/www-infinity4/QuantaPhi/issues/1110), identity [#1906](https://github.com/www-infinity4/QuantaPhi/issues/1906), and Brain [#1907](https://github.com/www-infinity4/QuantaPhi/issues/1907).
Owner explicitly requested repair after the public count stopped and StarQuest sign-in reported a ledger failure. No signed coordinator lease or completed runner job is claimed.

## Observed production evidence, November 22

- Public traffic total: 1,008,061 page views and 4,412,978 requests, verified at 12:00:55.687 UTC; manual refresh returned `failed`.
- Fresh GraphQL at 18:04 UTC reported 3,931 visits in the preceding hour. Traffic continued; these are not unique-human counts.
- Live traffic tail reported `D1_ERROR` for the free daily read allowance. Unified Wallet also failed for that allowance; the same account's D1 writes separately failed for maximum account storage.
- Database metadata reported 5,413,306,368 bytes. `infinity-ai-meter` accounted for 3,877,855,232 and `rogers-consensus` 1,371,701,248. No data cleanup, balance edit or account rebinding has occurred.
- Today-UTC analytics attributed approximately 81.5 million row reads to Monitor Phi and 21.9 million to Rogers/Brain storage; traffic itself used approximately 25,800.
- Monitor's eager startup reads the complete Quant graph even for health/Observer requests. A chat-folder membership query separately scanned approximately 4.43 million rows per call without its needed `(owner,message_id)` index.
- Existing Brain `BOT_WALLET` and Unified `IDENTITY_DB` bindings remain. A database 5xx was incorrectly converted to a sign-in rejection. File/deployment history does not establish that the owner account was unhooked tonight.

## Scoped source repair

1. Verify identity using the same canonical StarQuest device proof without loading or initializing wallet balances/history. Preserve owner binding, grants, expiry and cross-account rejection.
2. Distinguish upstream storage/service failures from invalid credentials. Existing sign-in stays stored; no new Cloudflare authorization is implied by a 5xx.
3. Keep verified public traffic snapshots at the edge, preserve failure status and original timestamps, and reject future/inconsistent cache coverage.
4. Add the missing owner/message membership index without changing conversation records or results.
5. Coordinate the Monitor Phi dependency repair to lazy-load its full graph only for graph-dependent operations and share concurrent startup work.

## Release boundaries

Deploy the Unified identity endpoint before its Brain/connector consumers. Preserve every live binding, secret, owner setting, Durable Object namespace, cron and storage identifier. Source/CI/merge/deployment/live/physical Android are separate receipts. No paid upgrade or credential reset is authorized by this repair.

Local Chromium acceptance was blocked before page creation by the environment socket restriction; it is not a passed browser or physical Android test. Cloudflare quota reset cannot be claimed from source changes, and storage exhaustion does not clear at the daily reset.
