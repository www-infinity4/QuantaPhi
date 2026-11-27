---
canonical_issue: 2110
project: "Cloudflare exit · app-owned distributed shard cache and local mesh server"
subtask: "M05 personal archive/consented Gemini handoff; automatic Google export and D1 cutover not authorized or verified"
state: ci_passed
dot: "🟡"
progress_percent: 37
progress_basis: "Encrypted cache, local coordinator, HTTPS/deployment template, private D1 parity and per-user export source-tested; real owner host/Android, complete per-account history, live D1 SQL API and actual Google destination remain unverified"
sessions_spent: 4
sessions_remaining_estimate: unknown
agent: "ChatGPT via connected GitHub"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/bubbles-google-gemini-user-handoff-2110-20261122
head_sha_at_checkpoint: "ce61bc341228ed4d0e8ae3bc14289d7a16aa5926"
pr: "https://github.com/www-infinity4/QuantaPhi/pull/2117"
merged: false
deployed: false
live_verified: false
blocker: "No verified owner-hosted always-on machine or public HTTPS, no real Android peer enrollment, no independent D1 export ledger receipts or production SQL API; keep old D1 authoritative"
next_action: "Review and guard merge PR #2117 after exact-head CI; then validate Android Bubbles export under real verified wallet and separately pursue compliant complete-history export approval"
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

## Google/Gemini user-controlled archive · November 22, 2026

- Prior [PR #2116](https://github.com/www-infinity4/QuantaPhi/pull/2116) **merged**: `9de2dba6b3002b27e6fa73917dd6c1a3694cdfef`. Source-only HTTPS host templates and private D1 hash parity, **not** installed host or migrated data.
- New [PR #2117](https://github.com/www-infinity4/QuantaPhi/pull/2117) implements **user-initiated** encrypted download (AES-GCM/PBKDF2, no key uploaded), and manually attached plaintext TXT for Gemini. Bubbles privacy panel requires an already verified wallet scope, user confirmation and explicit download; the export never auto-posts to Google or combines wallet histories from different accounts.
- Google official documentation as of 2026-11-22: Gemini supports manual import of supported AI ZIP chat archives and manual file attachments. It does not establish automatic third-party app history writes. Google's Drive API terms restrict using Drive to back up other apps' content without Google's express written consent, and prohibit storage-limit sharding. We have **not** added a Drive/Gemini API uploader.
- Read-only current-wallet search history is matched to the *same bearer token* via Bubbles profile and Quanta search journal. The current endpoint only returns up to 1,000 recent searches, so the exporter rejects results reaching that limit rather than pretending completeness; an unavailable cloud/identity check blocks combined export. User can explicitly download chats-only.
- Wallet-scoped BubblesMemory export filters saved turns to current profile, excludes notes and sync/internal state. It is **not complete historical coverage** across all Bubbles/ChatGPT sessions. No passive full-browser search monitoring, no external Google-account scraping, no customer-account upload, no private data stored in GitHub.
- [Exact-head test suite 45069628117](https://github.com/www-infinity4/QuantaPhi/actions/runs/45069628117) for `da789c9c43377189fa4d925d7c7fd05cdf187ff2`: **51/51** tests; 25 same-head GitHub workflows returned success. Review required before guarded merge. No production/browser/Android or real Google account import receipts.

Next: exact-head source review, source-only guarded merge, Android verification of encrypted browser download with a real wallet (no secret disclosure), and a future paginated per-user history export that safely includes older than the first 1,000 searches. Do not conflate user-selected plaintext Gemini upload with Google-hosted private storage or automatic database replication.

### Account switch and Android cache guard

A dedicated regression now checks a fresh profile read for a **chats-only** export, not just the combined chat/search exporter. Both paths recheck a single currently active wallet bearer against the wallet-scoped Bubbles profile; mismatches abort. A proposed Bubbles asset-version bump was reverted because it violated existing cross-entrypoint version contract tests; a coordinated cache-refresh/browser/Android release remains a separate verification step. No new APK or WebView cache is assumed updated. As of this checkpoint, no real Android/Google account export has been verified; every background Google transfer remains disabled.

- New finding: Android OS Auto Backup offers up to 25 MB per app user at no charge, independent of restricted Drive developer APIs and not connected to Gemini chat memory. Current Bubbles native Android manifest explicitly sets `android:allowBackup=false`. It is intentionally **left unchanged**: no backup rule/verified encrypted app-private directory or real restore test yet. No claim of native Google backup activation.


## Repository-first execution / phone-independent operation · November 27, 2026

Owner direction: pressing a Bubbles button should invoke the relevant versioned program; the owner phone must not be the sole compute host. Keep #2110 as migration coordinator and #1907 as Brain implementation, no duplicate ticket. A- is the proposed automation catalog/router, not an observed deployed backend.

### Placement and trust boundary

| Lane | Program source | Execution placement | Result |
| --- | --- | --- | --- |
| Pure public calculation, formatting, local UI | QuantaPhi | Browser JS; no privileged code | Immediate answer with explicit local provenance |
| Private conversation, provider tool calls | Existing Bubbles gateway/tools and model adapter | Verified continuously reachable private API/inference host; not GitHub Pages or per-message CI | User-scoped private response, durable request ID |
| Authorized engineering | Moltnook repository-engine, existing signed OIDC and lease/fence | GitHub Actions only for legitimate repository development, tests, builds and maintenance | Existing job-scoped PR/test receipts |
| Monitoring and bounded repair | A- catalog/automation + existing watchers | Allowed repository CI or independently hosted scheduler as appropriate; no phone dependency | Sanitized status, deduplication and retry deadlines |

Browser cannot hold repository-write credentials or dispatch privileged code directly. A button identifies an allowlisted operation, not an arbitrary command, workflow, repository or URL. The authenticated API derives account scope and authorization server-side, applies quotas, deduplicates by user/request ID, records bounded status and returns only that user's results. Signed repo engineering uses existing OIDC, current approval and exact lease/fence, no automatic grant renewal. Never put private prompts, wallet data, bearer credentials or answer transcripts in repository issues/commits, workflow inputs, logs or artifacts. Public GitHub artifacts may contain only deliberately public, sanitized engineering evidence. GitHub Pages is static, GitHub Actions is bounded CI, a repository is versioned source rather than an always-on server; no CI-as-public-chat-server or idle keepalive scheme.

### Verified / missing

- #2157 merged at 28f3840c50d8c0670e677d350b3051f30a17ae86. Owner Termux Node 26.3.1 tested its source head fa64afec5fccc00d4f0ef96a0a4282973114161e: 45/45, no forced shutdown, exit 0. CI 94/94. Synthetic source tests do not verify production provider, actual private database import or continuous Android operation.
- Owner gateway health returned HTTP 429; existing Workers AI bindings present; actual inference unverified. Do not infer a specific billing quota or attempt to evade rate limits.
- A- README exists; repository name alone proves neither runnable router nor deployed service. Inspect its actual program tree before choosing integration paths.
- No continuously reachable independent API/inference host or complete private authoritative state export/fence verified. No new paid resource, token, model, DNS or origin change authorized or made. Keep existing phone mesh/tunnel as optional staging and recovery, not production dependency.

### Ordered implementation gates

1. Inventory existing browser-local programs and signed repo workflows; reuse their source/permissions. First source-only pilot: explicit allowlisted public deterministic operation on existing QuantaPhi UI, with phone offline and no GitHub workflow dispatch or model claim; verify output and error behavior in a separate preview.
2. Identify a verified owner-approved non-phone host with HTTPS, persistent private disk, acceptable cost/terms, and existing model access. Prove a single non-sensitive prompt with real provider receipt before enabling public traffic; no silent model substitution.
3. Reuse original private API, consent, owner/session checks and signed repository-engine transport on staging. Prove unauthorized/revoked/foreign/replayed requests rejected, quota/backoff, duplicate results, and private response isolation.
4. Verify complete original state export, rollback, old-writer fence and in-flight reconciliation; no second active writer. Run one authorized engineering job through existing Moltnook runner with real source/test/PR evidence.
5. Acceptance with owner phone completely offline: two distinct test accounts receive their own genuine responses, one authorized repo job completes, restart retains private state and receipt, no private payload is present in public GitHub, and rollback works. Only then consider explicit production routing cutover.

State: scoped / production blocked; completion percentage unknown (no replacement always-on host), sessions remaining unknown. No production coordinator lease, task/session ID, fence or expiry claimed. Next executable source action: inspect the existing QuantaPhi local-program dispatcher and A- executable tree, choose one deterministic browser operation for the pilot; keep real chat separate until host verification. This checkpoint is a design decision, not a server installation or runtime repair.
