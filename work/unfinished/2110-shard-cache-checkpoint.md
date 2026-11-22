---
canonical_issue: 2110
project: "Cloudflare exit · app-owned distributed shard cache and local mesh server"
subtask: "M02 host install templates and M05 read-only D1 snapshot parity; no real deployment/cutover"
state: review_pending
dot: "🟡"
progress_percent: 35
progress_basis: "Encrypted cache, local coordinator and deployment templates/parity source-tested; 0 real owner-host, Android, live D1 export/restore, production SQL API or cutover acceptance tracks verified"
sessions_spent: 3
sessions_remaining_estimate: unknown
agent: "ChatGPT via connected GitHub"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/mesh-deployment-d1-parity-2110-20261122
head_sha_at_checkpoint: "366b926e8a001c1caf2309fa6e5c8fcc0af81d88"
pr: "https://github.com/www-infinity4/QuantaPhi/pull/2116"
merged: false
deployed: false
live_verified: false
blocker: "No verified owner-hosted always-on machine or public HTTPS, no real Android peer enrollment, no independent D1 export ledger receipts or production SQL API; keep old D1 authoritative"
next_action: "Review exact-head PR #2116 and security boundary; merge inactive source when eligible, then discover an actually owned always-on host and prove verified HTTPS readback before transferring synthetic app cache data"
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

## Deployment + D1 parity source pass · November 22, 2026

- Prior [PR #2115](https://github.com/www-infinity4/QuantaPhi/pull/2115) is **merged** at `eb58aa2caa2583447c8d74780085b59778247a27`. The app-cache mesh source exists on main; **no live host or D1 migration** verified.
- New [PR #2116](https://github.com/www-infinity4/QuantaPhi/pull/2116) is a source-only deployment/migration rehearsal: versioned `quantaphi-mesh.service` (dedicated OS user, localhost-only bind, private persistent SQLite, systemd hardening), free-software Caddy HTTPS reverse-proxy example, owner-host runbook, and `d1-verify.py` read-only table count/schema/content fingerprinting for *private staged SQLite snapshots*.
- Read-only parity test exercises synthetic BLOBs, same rows with different insertion order, mismatched ledger-like balances, omitted tables, missing files and refusal of an import/write command. It reports only hashes/counts/table names; **does not certify completeness of an actual Cloudflare export**.
- CI at source head `366b926e8a001c1caf2309fa6e5c8fcc0af81d88`: [vault regressions 45067558363](https://github.com/www-infinity4/QuantaPhi/actions/runs/45067558363) **40/40 green**, plus Bubbles, wallet/search, payout and image source checks. Before any merge, update exact-head receipts for this checkpoint change.
- External blockers: never-paid Cloudflare alternative doesn't magically provide electricity, public IPv4/IPv6, physical host or disk. No actual Google compute endpoint observed; installing templates on a real host needs access/config, verified TLS and user action. No DNS/billing/OAuth/StarQuest/wallet/worker modifications performed.
- Zero-downtime D1 migration is **not proven**. Source record counts, final write fence, per-user permissions, ledger totals/invariants, sequences/triggers/indexes, replay, dual read, rollback and independent restore still require separate real receipts.
- Replication is not an absolute guarantee. Every unique N-of-N fragment index must be retrievable with its decryption key or reconstructed from a complete separate backup; simultaneous replica and backup loss cannot be repaired using a hash alone.

Next safe executable action: exact-head test/review and guarded merge of inactive PR #2116. A verified owner-hosted always-on HTTPS endpoint and private disk are needed before enrolling real phones or attempting any D1 shadow movement.
