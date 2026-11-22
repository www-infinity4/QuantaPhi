---
issue: 1110
project: "Traffic and Bubbles identity recovery from shared D1 exhaustion"
state: blocked
dot: "🟠"
progress_percent: 75
progress_basis: "Source, 210 combined checks, 29 exact-head CI outcomes, desktop/mobile fixtures, protected merge and Worker releases verified; provider quota/storage cleanup and actual owner acceptance remain"
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
tests: "210 combined tests and five ledger checks pass. Head 614dd8d7 has 28 passing and one deliberately skipped CI check. Recovery browser job 137318150039 passed original Access tests plus six desktop/mobile identity outage/revocation/mismatch cases."
merged: true
deployed: true
live_verified: false
blocker: "Cloudflare daily read allowance also rejects bounded expired-cache cleanup; account storage still blocks writes. Actual owner session and physical Android not verified."
next_action: "After provider daily reset, remove only bounded expired ai_cache entries, read back storage and retry traffic ingestion; verify the existing owner's Brain session without account rebinding"
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

## Release and operational checkpoint, 19:09 UTC

- PR [#2109](https://github.com/www-infinity4/QuantaPhi/pull/2109) merged as `da3b3a3d75e482a2da5d6d73464a8fd12daee571`, after exact-head CI. The old Playwright pin did not support `ubuntu-latest` (26.04); pinning that existing job to 24.04 allowed all original checks plus six desktop/mobile recovery cases to pass in Chromium 141. Local socket restrictions remain distinct from this real CI browser receipt.
- Monitor dependency PR [Monitor-Phi#9](https://github.com/www-infinity4/Monitor-Phi/pull/9) merged as `d1329784fd7d2d084d907320e8b3775052d2076a`; production version `2902719b-78f9-4ac7-9db5-8656344c109c`, deployment `84ef4dbd-1203-41e6-9b00-ce55fdd196a2`. Preview and live health/program discovery/invalid route separately verified 200/200/404.
- Unified Wallet identity producer: version `9e37f628-92df-46c0-a237-16d976c0cbc6`, deployment `7d8fe33e-5f91-4218-ba20-d267950773c5`.
- Brain identity consumer: version `654d7027-ebc0-44b2-8011-97075186bf4b`, deployment `d283de95-4a99-457f-95e9-2e522f54fc1d`.
- Connections were automatically deployed by main workflow [45058538255](https://github.com/www-infinity4/QuantaPhi/actions/runs/45058538255) to `7aca37e9-cffc-4bfa-9c13-9b43d397e1cc`. The guard detected that newer production version, and its served identity-only logic was inspected rather than overwritten.
- Chat folder index source: version `893e91e6-c70f-4f73-a304-38aa310547a2`, deployment `515cd514-fbed-4812-adbb-e3f9b22e01b6`.
- Traffic cache: version `061c41a8-07ca-47f3-ab59-4afd5ed672ec`, deployment `d6001430-3e8a-4efe-bec4-b76587576ccf`.
- Every manual release separately read back 100% routing and preserved binding configuration. Secret names/types were retained; no secret values were exposed or compared. Some version preview hosts return 1042, so they are not reported as successful behavior tests.
- Post-merge writer run [45058538401](https://github.com/www-infinity4/QuantaPhi/actions/runs/45058538401) remains blocked by the same D1 daily read error, not a failing source regression.
- A bounded `DELETE` of at most 500 `ai_cache` records expired more than 24 hours ago was also rejected by the daily read allowance. No cleanup success is claimed. Only this disposable response cache is in scope; usage, identity, ledger and conversation tables are not cleanup targets.
- A read-only recovery combined all 50 existing ledger days with 30 fresh, validated Cloudflare daily records using the same per-day maximum rule. It produced a verified backup at **19:06:27.768 UTC**: **4,501,203 requests; 1,042,952 page views**. This saved backup is not a claim that blocked D1 ingestion resumed. Its follow-up release and public readback are tracked separately.
