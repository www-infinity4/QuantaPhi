---
canonical_issue: 2110
project: "Cloudflare exit · app-managed distributed encrypted shard cache prototype"
subtask: "M02/M05 design and isolated source prototype; no production migration"
state: ci_passed
dot: "🟡"
progress_percent: 25
progress_basis: "1/4 isolated prototype checks source-built/tested; actual peer authentication, secure transport, durable recovery/repair, and live Android acceptance not done"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT via connected GitHub"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/consent-shards-migration-2110-20261122
head_sha_at_checkpoint: "197b24ce4d018fb827a08e53a44ee32f65bda01d"
pr: "https://github.com/www-infinity4/QuantaPhi/pull/2114"
merged: false
deployed: false
live_verified: false
blocker: "No actual authenticated peer fleet, live coordinator or verified Google compute; N-of-N prototype is not fault tolerant, no production migration permitted"
next_action: "Complete independent source/security check and exact-head CI; only then merge safe isolated prototype, then design an authenticated network pilot with real participating app instances"
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
