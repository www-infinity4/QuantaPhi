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
## Continuation · cache retention and native storage diagnosis, 2026-11-28 UTC

Second source session on this checkpoint, branch `fix/ai-cache-retention-1110-20261127`, baseline `61f6f346f53bc978e84d6adeaa5bc40df8318668`. Reuses #1110/#1907/#2110. Lease/fence/task-session identity/expiry remain null. Overall Bubbles/migration acceptance percentage and remaining sessions are unknown. Existing release receipts above remain historical; this retention source is not yet merged or deployed.

Actual signed conversation [Moltnook 45939330393](https://github.com/www-infinity4/Moltnook/actions/runs/45939330393), attempt 2/job `140800730385`, passed its signed approval check then returned `signed_assist_http_503_bridge_transport_unavailable` for all ten public turns. A native isolated, expired diagnostic insert in `bubbles_chatgpt_bridge` failed HTTP 400/code7500, explicitly naming maximum **account storage**, not the daily read/write allowance. No diagnostic row was inserted. Read-only schema/index checks and a zero-row write-path check succeeded. Existing production BRAIN/TOOLS/BRIDGE_DB/CONSENT identities were read and retained; no missing binding was demonstrated. QuantaPhi's public tools health check passed HTTP200 without an authenticated job receipt.

The 41-database metadata total was 5,408,174,080 bytes, including `infinity-ai-meter` 3,872,661,504 and `rogers-consensus` 1,371,697,152. The meter's `ai_cache` has a ten-minute TTL and expiry index, but an indexed expired window began in September and still included early November. Independent review confirmed the prior bounded cleanup scope: derived response cache only; exclude usage, work, identity, ledger, sessions and authoritative conversation records.

A pre-cleanup Time Travel bookmark was captured; no database restore performed. At fixed cutoff 2026-11-27T00:28:52.221Z (at least one-day expiry margin), 77 separate indexed statements each deleted at most 250 expired `ai_cache` rows, with an outer expiry guard against refreshed keys. Total 19,250 expired responses removed; no response payloads exported. Native meter file size decreased to 3,406,807,040 bytes, a measured reduction of 465,854,464. This does not prove account capacity reset. Subsequent isolated record writes still failed the same account-storage error. Signed attempt3/job `140804261597` again returned ten503 failures and zero answers. No further cache deletion is authorized by this checkpoint merely to repeat an unverified recovery claim; recheck current capacity/evidence first.

Permanent source fix: one bounded indexed cleanup of at most16 records, expired for at least one day, on an existing cache request. Separate failure handling preserves cached replies and does not repeat model execution. No cron, new service/store, dependency, credential, provider, quota grant or owner sign-in added. Regression-first test failed before implementation; actual SQLite tests verify bounded oldest-window removal, fresh/recent-expired retention, usage-table preservation and invalid bounds/metadata. An integrated cached-response test verifies the default16 pass can fail while the cached answer still returns without inference. Existing visual/model choices are unchanged. Local image/retention49/49 and model/card91/91 selections passed; independent source review and exact-head CI pending. The existing image workflow adds only the retention test and its path.

State: source tested / production blocked, 🟠. No new retention source merge/deploy or restored Bubbles/Brain execution is claimed. Preserve separate migration draft #2162 and shared provider cooldown #2161. Next: independently review/exact-head CI this source, verify live account capacity with one isolated write and cleanup, then repeat signed conversation only when a real change warrants it. Full private D1/KV fence/export and approved original inference host remain open under #1907/#2110.

Owner budget clarification, 2026-11-28 UTC: ongoing budget remains $0; do not activate paid Cloudflare subscriptions or assume permission to purchase from the earlier $5 question. The standard free Workers AI allocation renews daily; repeated new-account/trial rotation is not the target architecture. Preserve this installation and finish bounded retention, quota-aware execution and private SQLite/GitHub migration. Actual inference/host capacity and restored signed execution remain unverified. Independent retention review passed49/49 plus37 focused model regressions, indexed SQLite query-plan challenge and unchanged source hashes; root also passed91 model/card regressions. Exact-head CI/publication receipts follow in the canonical issue.

Subsequent owner clarification supersedes the absolute $0 interpretation above: the existing bill is unaffordable, but the owner is considering a new $5 Workers subscription on another existing account to host Bubbles. No purchase or subscription activation has been authorized/executed by this session. Before new-account routing, preserve original owner/session/credential/work state and verify account access, migration consistency and real inference. Owner also requests a genuinely free AI alternative; selected Gemini API models have limited free tiers, not unlimited inference. Retain existing source/model until a replacement is explicitly chosen and tested.

## Continuation · owner-reported payment and API access, 2026-11-28 UTC

Owner subsequently reports paying for existing account
`392a60022046dd9f6d11b1d4b511a2ad` and authorizes Bubbles/Brain setup only.
This supersedes the earlier tentative-budget discussion; no subscription was
purchased by this engineering session and no additional purchase is implied.
The account invitation was accepted, but the existing connector still exposes
only the original account after a fresh metadata check. Shared-browser
GitHub/passkey sign-in failed; cookies were not cleared. Owner now requests
curl/Termux. The reviewed operator source and remaining live-token dependency
are tracked under the existing [#1907 checkpoint](TICKET-1907-SQLITE.md) and
[API guide](../../docs/BUBBLES-PAID-ACCOUNT-API.md). It stages only empty core
schemas, without migrating owner/job data or activating any writer/model.

Retention source [#2163](https://github.com/www-infinity4/QuantaPhi/pull/2163)
merged as `a33425fec3ac7593f626f2b5b9f9065ff9f29bde`; existing guarded
[release 46093259122](https://github.com/www-infinity4/QuantaPhi/actions/runs/46093259122)
successfully deployed/read back original-account `infinity-rogers` version
`5f413792-f994-4bf5-ab84-43e10c981ab8`. This is verified retention deployment,
not evidence that account storage or signed Bubbles conversation recovered.
No additional expired-record deletion, account churn, model test, new-account
database write or production cutover was performed in this API source session.
