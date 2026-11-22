---
canonical_issue: 2110
project: "Cloudflare exit · app-owned distributed shard cache and local mesh server"
subtask: "M02/M05 local owner server, encrypted replication and D1 export staging; no production cutover"
state: ci_passed
dot: "🟡"
progress_percent: 35
progress_basis: "2/6 engineering tracks source-tested (encrypted fragment cache and local coordinator), plus private D1 staging; real replacement host, physical peers, recoverable migration, D1 query APIs, cross-account checks and live cutover not verified"
sessions_spent: 2
sessions_remaining_estimate: unknown
agent: "ChatGPT via connected GitHub"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/repository-mesh-server-d1-staging-2110-20261122
head_sha_at_checkpoint: "1078e415d3ff4649a2aea014ab971185f165c281"
pr: "https://github.com/www-infinity4/QuantaPhi/pull/2115"
merged: false
deployed: false
live_verified: false
blocker: "No verified live replacement host, production HTTPS, real Android peer fleet, or verified D1 SQL export/import and read/write API cutover; N-of-N scheme depends on owner encrypted copy"
next_action: "Review exact-head secure mesh server PR #2115 and CI; merge source-only when permitted, then verify actual HTTPS owner host and two enrolled Android app caches before any D1 cutover"
---

# App-owned shard-cache prototype · November 22, 2026

Owner clarification: use each participating app's *normal app-managed cache* (such as ordinary cached assets/cookies), **not** a per-fragment storage permission prompt. Do not access owners' personal files. Device owners retain OS/browser ability to clear app data; this cannot be made irreversible.

## Real build receipts

- Reused [migration issue #2110](https://github.com/www-infinity4/QuantaPhi/issues/2110); did not create a second migration issue or change other tickets.
- [PR #2114](https://github.com/www-infinity4/QuantaPhi/pull/2114) includes `distributed-vault/vault-core.mjs`, `vault-cli.mjs`, `app-cache.mjs`, static Android-readable app-cache demo, sample synthetic ciphertext and source docs.
- TDD started with intentionally failing tests before `app-cache.mjs` was created. CI [run 45064439467](https://github.com/www-infinity4/QuantaPhi/actions/runs/45064439467) showed 13 passing / 1 failing due an incomplete fixture rename; corrected that test at `7af8f25dee6d3bd0f87e3d898ce3008ccf9d95dd`. Subsequent exact-head [run 45064508843](https://github.com/www-infinity4/QuantaPhi/actions/runs/45064508843) passed all 14 tests.
- Later exact-head [run 45064773334](https://github.com/www-infinity4/QuantaPhi/actions/runs/45064773334), job `137338363713`, passed **18/18** including Termux CLI real roundtrip and app-owned cache behavior. The four other same-head general source workflows also succeeded.
- Branch files and CI are still not a production server or proof that one actual phone participated. No independent physical Android acceptance, external HTTPS transport, live owner data import, Cloudflare/DNS modification, or upload of private user data.

## Architecture choice and safety boundary

Encryption is AES-256-GCM before shard splitting, with SHA-256 per fragment and whole ciphertext. Owner retains a private random key outside the shard folder and outside public GitHub. Random placement considers only available, eligible app-cache instances, with one fragment per device per file and optional replicas; the current placement is a plan and *never sends any data*. IndexedDB belongs to the serving origin and has a default 8 MiB app cache cap, TTL expiration, pause and clear. App storage cannot guarantee indefinite retention; the OS and its owner can erase it.

**N-of-N design is deliberately preliminary.** One lost shard index causes restore failure even if 999 others remain. Before any owner archive moves from Cloudflare, implement authenticated peer identities, genuine discovery, replay-limited transport, error correction, backup/failback and a verifiable availability protocol, then run real multi-phone tests.

## Next safe action

Independent source/security review of the exact PR head; correct any issues; merge only if GitHub permits and exact-head CI is green. Keep #2110 M02 real Google host verification and M05/M06 secure runtime migration blocked until an actual replacement and real phone network exist.

## Owner-hosted coordinator and app-use placement · November 22, 2026

- Previous encrypted cache prototype [PR #2114](https://github.com/www-infinity4/QuantaPhi/pull/2114) is **merged**, commit `7b81f0173e041fa26183eb43daff56d0f4785ee0`. No actual phone network was deployed from that merge.
- Continued canonical migration issue #2110 in staged [PR #2115](https://github.com/www-infinity4/QuantaPhi/pull/2115). The new `mesh-server.mjs` uses durable SQLite, owner-only bearer authentication and unique stored-as-hash node credentials; encrypted shard uploads, same-origin browser app, heartbeat receipts, TTL repair, automatic replica reassignment after acknowledged app-cache loss, and owner CLI. Actual source is hosted in GitHub; the running server **requires a separate always-on owner computer/Termux host**.
- `d1-stage.py` imports user-provided D1 SQL dumps only into a new private SQLite file, uses SQLite's backup API to capture consistent snapshots, and verifies chunked private restore. No live owner D1 records were fetched or switched. Public GitHub must never contain SQL exports, private SQLite, unencrypted backup chunks, keys or node credentials.
- Owner suggested **placement by patterns of app use**. Recorded only coarse server-validated app heartbeat windows (max one per 60-second bucket, capped at 100), shard-loss counts and last-seen/capacity; no personal browsing/app analytics, location, photos or files. New fragments favor active caches and avoid recently lost copies.
- TDD RED: activity-order regression failed on [run 45066398175](https://github.com/www-infinity4/QuantaPhi/actions/runs/45066398175); the implementation at `bcd63a19bcb79528375e1079751a7d6f945b3b01` initially broke a prior registration-order tie assumption, fixed with stable tie handling `b97923e133424e2320402f6a72cd347b632f8c6f`.
- Another real client-flow regression: initial empty heartbeat removed pending assignments. RED [run 45066542155](https://github.com/www-infinity4/QuantaPhi/actions/runs/45066542155), then GREEN [run 45066549891](https://github.com/www-infinity4/QuantaPhi/actions/runs/45066549891) for exact tested `1078e415d3ff4649a2aea014ab971185f165c281`, **33/33 tests passing**, plus Quanta search, payout, Bubbles and image checks. Only acknowledged prior cache copies now count as lost.
- Physical Android, actual HTTPS domain, billed Google host, two-account isolation, revoked phone sessions, recovery under malicious peers, signed runner, erasure coding, live D1 export, data-level reconciliation and production cutover **remain unverified**. No deployed migration or complete Brain repair claimed.

**Next bounded action:** source/security review and exact-head CI of PR #2115, guarded source merge if permitted. Next *live* action requires a verifiably owned HTTPS server with persistent disk before enrolling real phones or copying any D1 records.
